/**
 * The Content-Security-Policy every page carries (owner rule R77, 30 September
 * 2026), in one place, read by next.config.mjs for every page and by the
 * middleware for embeds (P8).
 *
 * The CSP names what the site actually uses, found by reading it:
 *   connect  the API (NEXT_PUBLIC_API_URL) and this origin
 *   frames   YouTube and Twitch stream embeds, Google Maps on an event, and
 *            the API's own overlays in the studio preview
 *   images   anywhere over https (avatars, maps tiles, link previews) and data
 *   scripts  this origin; 'unsafe-inline' because Next writes its bootstrap
 *            inline, 'unsafe-eval' only in development for fast refresh
 *
 * Only `frame-ancestors` differs between pages. An ordinary page says 'self'.
 * An embed says whoever its record allows (approved sites, design 14c): its
 * proven sites when it is locked to some, anywhere when it is not. That answer
 * depends on the record, so the middleware writes it per request; next.config
 * cannot, because its headers are fixed when the server starts.
 */

/** The origin of an address, or '' when there is none to read. */
export function apiOriginOf(url) {
  try {
    return new URL(url || '').origin;
  } catch {
    return '';
  }
}

/** The frame-ancestors value for a list of sources; no list means anywhere. */
export function frameAncestorsValue(sources) {
  return Array.isArray(sources) && sources.length ? sources.join(' ') : '*';
}

export function contentSecurityPolicy({ isDev = false, apiOrigin = '', frameAncestors = "'self'" } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    // The API origin by name as well as https:, so a build pointed at a plain
    // http API (a local production build) still shows its pictures.
    `img-src 'self' data: blob: https: ${apiOrigin}${isDev ? ' http://localhost:* http://127.0.0.1:*' : ''}`.trim(),
    `media-src 'self' blob: https: ${apiOrigin}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}${isDev ? ' ws://localhost:* http://localhost:* http://127.0.0.1:*' : ''}`.trim(),
    `frame-src 'self' ${apiOrigin} https://www.youtube.com https://player.twitch.tv https://www.google.com`.trim(),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}
