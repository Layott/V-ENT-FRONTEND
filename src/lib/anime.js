'use client';

// Talking to the anime module, and knowing whether it is open.
//
// Built and CLOSED, from the CEO's instruction on 10 September: "i want to
// build the following behind the gating, still locked and not open to public."
//
// Two switches decide it and neither can open it alone: `ANIME_ENABLED` on the
// server, which defaults to OFF and makes every endpoint answer 503, and the
// console's `anime_enabled` module flag. `/auth/platform/modules/` publishes the
// AND of the two, and `useComingSoon` already reads that, so the navigation and
// the pages get their answer from the same place the endpoints do.
//
// Same shape as `src/lib/marketplace.js` on purpose. Two modules gated the same
// way should read the same, and a second style of doing it is how one of them
// quietly stops being gated.

import { useCallback, useEffect, useState } from 'react';
import { usePlatformFlags } from './platformModules';

const API = process.env.NEXT_PUBLIC_API_URL;

/** The refusal code every endpoint gives while it is closed. */
export const OFF_CODE = 'ANIME_OFF';

/**
 * Whether the anime module is open, as three states rather than two.
 *
 * `null` while the flags are still being fetched, because "closed" and "we have
 * not asked yet" lead to different screens and a single boolean cannot tell
 * them apart.
 */
export function useAnimeOpen() {
  const flags = usePlatformFlags();
  if (flags === null || flags === undefined) return null;
  return Boolean(flags.anime_enabled);
}

/** One request, with the token when there is one and the envelope unwrapped. */
export async function call(path, { method = 'GET', body, token, isForm } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API}/anime${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status === 'error') {
    const error = new Error(data.message || 'That did not work.');
    error.code = data.code || `HTTP_${res.status}`;
    error.status = res.status;
    error.data = data.data || {};
    throw error;
  }
  // A comic that was renamed answers 200 with `moved` rather than a 301,
  // because fetch() follows a redirect transparently and would chase a
  // frontend path against the API host.
  if (data.status === 'moved') {
    const error = new Error(data.message || 'This moved.');
    error.code = 'SLUG_CHANGED';
    error.data = data.data || {};
    throw error;
  }
  return data.data ?? {};
}

/** Genres, kinds, statuses, modes, themes and the battle attributes. */
export function useAnimeCatalogue(open) {
  const [catalogue, setCatalogue] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    call('/catalogue/')
      .then(data => { if (alive) setCatalogue(data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [open]);

  return { catalogue, failed };
}

/** Fill `{name}` in a translated string from a plain object. */
export function fill(text, values) {
  return Object.entries(values || {}).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(String(value)), text);
}

/**
 * What a comic costs, in one sentence, from the fields the API sends.
 *
 * One function so the card, the detail page and the reader cannot describe the
 * same comic differently, which is the fault the project rule names.
 */
export function priceLine(tt, series) {
  if (!series) return '';
  if (series.pricing === 'free') return tt('anime.free', 'Free to read');
  if (series.pricing === 'per_chapter') {
    return fill(tt('anime.perChapter', '{n} VENT COINS a chapter'),
      { n: series.chapter_price_vc });
  }
  return fill(tt('anime.perMonth', '{n} VENT COINS a month'),
    { n: series.subscription_price_vc });
}

/**
 * What a refusal means, in the reader's language, with the number in it.
 *
 * The server sends a CODE and a number of coins, never a sentence, because the
 * screen showing it may be in French. This is the one place that turns the four
 * codes into words.
 */
export function refusalLine(tt, refusal) {
  if (!refusal) return '';
  const coins = refusal.needs_coins || 0;
  switch (refusal.code) {
    case 'EARLY_ACCESS_REQUIRED':
      return fill(tt('anime.needEarly',
        'This one is not out yet. {n} VENT COINS reads it now.'), { n: coins });
    case 'CHAPTER_REQUIRED':
      return fill(tt('anime.needChapter',
        'This chapter costs {n} VENT COINS.'), { n: coins });
    case 'SUBSCRIPTION_REQUIRED':
      return fill(tt('anime.needSubscription',
        'Subscribing is {n} VENT COINS a month and opens every chapter.'),
      { n: coins });
    case 'NOT_OUT_YET':
      return tt('anime.notOutYet', 'This one is not out yet.');
    default:
      return tt('anime.cannotRead', 'You cannot read this one.');
  }
}

/** The reader's token, from the session, in the one shape every page uses. */
export function tokenFrom(session) {
  return session?.user?.sessionToken || null;
}
