'use client';

// The browser tells the API which zone it is in, once, for every request.
//
// A timed DateField hands back "2026-09-26T10:30" with no zone on it, the way
// a datetime-local input does. The API runs on UTC, so a naive value it makes
// aware was read as UTC: an organiser in Lagos typed 10:30 for a programme
// session and it came back as 11:30 (walk, 18 September 2026). The wizard
// converted its two dates itself; nine other screens with a timed DateField
// did not, and each one was the same fault waiting to be typed into.
//
// The browser is the only thing that knows the zone, so it says so on every
// request to the API host with the `X-Client-Timezone` header, and
// `vent_auth.middleware_timezone` activates that zone for the request. Every
// naive datetime on every screen then lands where the person meant it, the
// ones written next month included, without each screen remembering to call
// `localInputToISO`. Screens that already convert keep working: an aware ISO
// string is not touched by the server.
//
// Patched onto window.fetch rather than routed through a helper, because
// forty pages call fetch directly and a helper is only right where somebody
// remembered to use it.

import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

function zoneName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

function isApiRequest(input) {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  return Boolean(API) && url.startsWith(API);
}

export default function ClientTimezone() {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__ventTimezonePatched) return undefined;
    const zone = zoneName();
    if (!zone) return undefined;
    const original = window.fetch;
    window.fetch = function ventFetchWithZone(input, init) {
      if (!isApiRequest(input)) return original.call(this, input, init);
      const headers = new Headers((init && init.headers) || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('X-Client-Timezone')) headers.set('X-Client-Timezone', zone);
      return original.call(this, input, { ...(init || {}), headers });
    };
    window.__ventTimezonePatched = true;
    return undefined;
  }, []);
  return null;
}
