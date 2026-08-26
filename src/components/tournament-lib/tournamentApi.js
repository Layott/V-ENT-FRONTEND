// Tournament API layer - single source of truth for tournament-module network
// calls. Owned by FE-tournaments. Deliberately dependency-free and framework
// -light so it works transparently in both real mode (hits the Django backend)
// against the real backend.
//
// Every authenticated request uses `Authorization: Bearer <session_token>` per
// the M1 auth contract (never `Token`). All backend responses follow the
// envelope `{ status: 'success' | 'error', data, message, code }`.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ── Endpoint map ───────────────────────────────────────────────────────────
// Paths quoted verbatim from the M1 shared contract (§2). BE-GAP endpoints are
// marked; callers should surface the "Pending BE deploy" banner on a 404.
export const API = {
  TOURNAMENT: {
    LIST: '/tournament/get-all-tournaments/',
    SEARCH: '/tournament/search-tournament/',
    VIEW: (id) => `/tournament/view-tournament/${id}/`,
    CREATE: '/tournament/create-tournament/',
    EDIT: (id) => `/tournament/edit-tournament/${id}/`,
    DELETE_DRAFT: (id) => `/tournament/delete-draft/${id}/`,
    DRAFTS: '/tournament/view-user-drafted-tournaments/',
    BRACKETS: (id) => `/tournament/get-tournament-brackets/${id}/`,
    PARTICIPANTS: (id) => `/tournament/get-tournament-participants/${id}/`,
    UPDATE_BRACKET: (id) => `/tournament/update-bracket/${id}/`,
    ORGANIZER_LIST: '/tournament/get-organizer-tournaments/',
    REGISTER: '/tournament/register-tournament/',
    // Gate endpoints - live as of BE-tournament final contract (2026-07-06).
    GENERATE_BRACKET: (id) => `/tournament/${id}/generate-bracket/`,
    CANCEL: (id) => `/tournament/${id}/cancel/`,
    DISTRIBUTE_PRIZES: (id) => `/tournament/${id}/distribute-prizes/`,
    MATCH_DETAIL: (matchId) => `/tournament/match/${matchId}/`,
    REPORT_SCORE: (matchId) => `/tournament/match/${matchId}/report-score/`,
    CONFIRM_SCORE: (matchId) => `/tournament/match/${matchId}/confirm-score/`,
    // Primary path is /raise-dispute/ ( /dispute/ is a server-side alias ).
    MATCH_DISPUTE: (matchId) => `/tournament/match/${matchId}/raise-dispute/`,
    // Check-in: the window that turns "registered" into "here right now".
    CHECK_IN: (id) => `/tournament/${id}/check-in/`,
    CHECK_IN_STATUS: (id) => `/tournament/${id}/check-in/status/`,
    CLOSE_CHECK_IN: (id) => `/tournament/${id}/close-check-in/`,
    EXTEND_CHECK_IN: (id) => `/tournament/${id}/extend-check-in/`,
  },
  TEAM: {
    MY_TEAMS: '/team/my-teams/',
    ALL: '/team/get-all-teams/',
    VIEW: (id) => `/team/view-team/${id}/`,
  },
  WALLET: {
    BALANCE: '/auth/wallet/balance/',
    PIN_VERIFY: '/auth/wallet/pin/verify/',
    TOPUP_INITIATE: '/auth/wallet/topup/initiate/',
    TOPUP_VERIFY: '/auth/wallet/topup/verify/',
    KYC_STATUS: '/auth/wallet/kyc/status/',
  },
};

// ── ApiError ───────────────────────────────────────────────────────────────
// Thrown on any non-success. Carries the machine-readable `code`, HTTP `status`
// and the raw `data` so callers can switch on it (KYC_REQUIRED, WRONG_PIN,
// INSUFFICIENT_BALANCE, …) or detect a missing endpoint via `status === 404`.
export class ApiError extends Error {
  constructor(message, { code = 'INTERNAL_ERROR', status = 0, data = {} } = {}) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }

  // True when the endpoint itself is missing on the backend (BE-GAP not yet
  // deployed). Callers show the spec'd "Pending BE deploy" banner.
  get isPendingBackend() {
    return this.status === 404 || this.status === 501;
  }
}

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path}`;
};

// Core fetch wrapper. Returns the `data` payload on success; throws ApiError
// otherwise. Tolerant of responses that aren't wrapped in the standard
// envelope (returns the raw JSON as `data`) so we never hard-crash on a
// backend that's still stabilising.
// In-flight GET sharing. Several components can ask for the same endpoint in the
// same tick (the app shell plus the page body, or an effect that re-runs when the
// NextAuth session resolves). Without this each one opens its own request, and at
// 220ms round trip from Los Angeles every duplicate is 220ms of wasted wait.
// Only plain GETs with no abort signal are shared: a caller that can abort must
// own its request, and writes must never be collapsed.
const inflightGets = (() => {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (!g.__ventInflightGets) g.__ventInflightGets = new Map();
  return g.__ventInflightGets;
})();

export async function ventFetch(path, opts = {}) {
  const { method = 'GET', token, signal } = opts;
  const shareable = method === 'GET' && !signal;
  if (!shareable) return ventFetchUncached(path, opts);

  const key = `${path}::${token ? token.slice(0, 8) : 'anon'}`;
  const pending = inflightGets.get(key);
  if (pending) return pending;

  // Held for a moment after completion, not just while in flight: the common
  // duplicate is an effect that runs on mount and again a few hundred ms later
  // when the session resolves. 1.5s is long enough to collapse that burst and
  // far too short to serve stale data after a user action.
  const request = ventFetchUncached(path, opts);
  inflightGets.set(key, request);
  request
    .catch(() => inflightGets.delete(key))
    .then(() => setTimeout(() => inflightGets.delete(key), 1500));
  return request;
}

async function ventFetchUncached(path, {
  method = 'GET',
  body,
  token,
  isFormData = false,
  signal,
  headers: extraHeaders,
} = {}) {
  const headers = { ...(extraHeaders || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body != null && !isFormData) {
    headers['Content-Type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path), { method, headers, body: payload, signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Network error - could not reach the server.', {
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  let json = null;
  const text = await res.text();
  if (text) {
    try { json = JSON.parse(text); } catch { json = null; }
  }

  if (!res.ok) {
    throw new ApiError(
      json?.message || `Request failed (${res.status}).`,
      { code: json?.code || `HTTP_${res.status}`, status: res.status, data: json?.data || {} },
    );
  }

  // Standard envelope.
  if (json && typeof json === 'object' && 'status' in json) {
    // The thing was renamed and lives at a new address. Thrown rather than
    // returned so a caller that has not been taught about moves fails loudly
    // instead of rendering {slug, url} as if it were a tournament.
    if (json.status === 'moved') {
      throw new ApiError(json.message || 'This has been renamed.', {
        code: 'SLUG_CHANGED',
        status: res.status,
        data: json.data || {},
      });
    }
    if (json.status === 'error') {
      throw new ApiError(json.message || 'Request failed.', {
        code: json.code || 'ERROR',
        status: res.status,
        data: json.data || {},
      });
    }
    return json.data ?? {};
  }

  // Non-enveloped 2xx - hand back whatever we got.
  return json ?? {};
}

// A renamed thing moved to a new address. Every page that loads one by slug
// calls this in its catch: it swaps the URL for the current one without adding
// a history entry, so Back still goes where the person came from rather than
// bouncing them through the dead address again.
export function followRename(error, router) {
  const url = error?.code === 'SLUG_CHANGED' ? error?.data?.url : null;
  if (!url || !router) return false;
  router.replace(url);
  return true;
}

// Convenience: pull the Bearer token out of a next-auth session object.
export const tokenFrom = (session) => session?.user?.sessionToken || null;

// ── Shape helpers ──────────────────────────────────────────────────────────
// Coerce whatever the list endpoint returns into a flat array of tournaments.
// Accepts the real contract `{ featured, new, by_game }`, a flat
// `{ tournaments: [...] }`, a bare array, or `{ results: [...] }`.
export function toTournamentArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.tournaments)) return data.tournaments;
  if (Array.isArray(data.results)) return data.results;
  const out = [];
  const seen = new Set();
  const push = (arr) => {
    (arr || []).forEach((t) => {
      const key = t?.id ?? JSON.stringify(t);
      if (!seen.has(key)) { seen.add(key); out.push(t); }
    });
  };
  push(data.featured);
  push(data.new);
  push(data.upcoming);
  if (data.by_game && typeof data.by_game === 'object') {
    Object.values(data.by_game).forEach((arr) => push(arr));
  }
  return out;
}

// Normalize a single tournament payload. The detail endpoint returns
// `{ tournament, sponsors, prize_distribution }`; some callers receive
// `{ tournament }`; some callers may receive the tournament object directly.
export function toTournament(data) {
  if (!data) return null;
  if (data.tournament) {
    return {
      ...data.tournament,
      sponsors: data.sponsors ?? data.tournament.sponsors ?? [],
      prize_distribution: data.prize_distribution ?? data.tournament.prize_distribution ?? [],
    };
  }
  if (data.id || data.tournament_title || data.name) return data;
  return null;
}

// Read a tournament's status regardless of which field the backend populated
// (`status` in M1, `is_draft` on legacy rows). Returns a lowercase string.
export function tournamentStatus(t) {
  if (!t) return 'unknown';
  if (t.status) return String(t.status).toLowerCase();
  if (t.is_draft) return 'draft';
  return 'published';
}

// Entry fee as a whole number of VC. Treats missing / null / <=0 as free.
export function entryFeeVc(t) {
  const raw = t?.entry_fee_price ?? t?.entry_fee ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

// Escape user/backend text for safe inline HTML. Used where we would otherwise
// reach for DOMPurify - tournament rules/description are plain text (≤1000
// chars) in M1, so escaping + preserving newlines via CSS `white-space:pre-wrap`
// is fully XSS-safe with zero dependencies. If the backend later returns rich
// Quill HTML, swap this for DOMPurify.sanitize (see team note).
export function escapeText(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
