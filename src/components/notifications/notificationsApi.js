// Notifications API layer - network calls for the notifications inbox + the
// header bell badge. Deliberately thin: it reuses the shared `ventFetch`
// wrapper and `tokenFrom` helper from the tournament lib so the envelope
// handling (`{ status, data, message }`), Bearer auth and ApiError surface are
// identical to every other module. Do NOT duplicate the fetch wrapper here.
//
// All paths live under `/auth/notifications/…` per the Notifications contract
// (§1.3). Every call takes the login session token (`session.user.sessionToken`).

import { ventFetch, tokenFrom } from '@/components/tournament-lib/tournamentApi';
import { getJson } from '@/lib/apiCache';

// Re-exported so bell/inbox callers can pull the Bearer token the same way.
export { tokenFrom };

// GET /auth/notifications/?page=1&filter=all|unread
// → { notifications:[…], unread_count, total, page, per_page }
export function listNotifications(token, { page = 1, filter = 'all' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (filter) params.set('filter', filter);
  const qs = params.toString();
  return ventFetch(`/auth/notifications/${qs ? `?${qs}` : ''}`, { token });
}

// GET /auth/notifications/unread-count/ → { unread_count }  (cheap, bell polling)
//
// Header and MobileHeader both mount on every page (CSS hides one), so this used
// to fire two to four times per page load. Routed through the shared GET cache
// so concurrent callers share a single request; the 20s TTL is well under the
// 60s bell poll, so the badge still refreshes on schedule.
export function unreadCount(token) {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return getJson(`${base}/auth/notifications/unread-count/`, { token, ttl: 20000 })
    .then((body) => (body && body.status === 'success' ? body.data : body));
}

// POST /auth/notifications/<id>/read/ → { unread_count }
export function markRead(token, id) {
  return ventFetch(`/auth/notifications/${id}/read/`, { method: 'POST', token });
}

// POST /auth/notifications/read-all/ → { unread_count:0, updated:n }
export function markAllRead(token) {
  return ventFetch('/auth/notifications/read-all/', { method: 'POST', token });
}

// POST /auth/notifications/<id>/delete/ → { unread_count }
export function deleteNotification(token, id) {
  return ventFetch(`/auth/notifications/${id}/delete/`, { method: 'POST', token });
}
