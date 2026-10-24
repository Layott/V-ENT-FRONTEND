/**
 * A tournament or event served on the organiser's own address (P8c, level 3).
 * Read by the middleware on every request whose host is not V-ENT's.
 *
 * The answer lives on the API (`/sites/host/?host=<name>`): {kind, slug} for an
 * active address, 404 for anything else. It is kept in memory for five
 * minutes, and a "no" for thirty seconds so an address the organiser has just
 * set up does not stay dark. The API down or slow keeps the last answer it had
 * and never waits more than 1.5 seconds; with none at all the host is
 * unknown, which is a 404 and never a way into anything else.
 *
 * No React, no Next: scripts/test-embed.mjs proves it with a stand-in API.
 */

const OWN = ['v-ent.co', 'localhost', '127.0.0.1'];
const IP_ADDRESS = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[.*\]$/;

//  Paths a page on another address still needs: Next's own files, the
//  fonts and pictures it draws with, the API routes. Everything else is
//  refused, so the address shows its one record and nothing of V-ENT.
const ASSET_PREFIXES = ['/_next/', '/api/', '/fonts/', '/images/', '/styles/', '/i18n/', '/overlays/'];

/** The host in a Host header: lowercase, no port, no trailing dot. */
export function hostOf(header) {
  return String(header || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

/** Whether a host is V-ENT itself (or a machine in development), not somebody's own address. */
export function isOwnHost(host, extra = []) {
  if (!host || IP_ADDRESS.test(host)) return true;
  return [...OWN, ...extra].some((name) => host === name || host.endsWith('.' + name));
}

/** Whether a path is one a page on another address may load. */
export function isAssetPath(path) {
  return path === '/favicon.ico' || ASSET_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** The path the record lives at on V-ENT, from the API's {kind, slug}. */
export function recordPath(found) {
  const slug = encodeURIComponent(found.slug);
  return found.kind === 'event' ? `/events/${slug}/site` : `/tournaments/${slug}`;
}

function deadline(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** A function (host) => Promise<{kind, slug} | null>. The rest is there for the test. */
export function createHostLookup({
  api, fetchImpl = (...args) => fetch(...args), now = () => Date.now(),
  ttl = 300000, missTtl = 30000, timeout = 1500, most = 500,
} = {}) {
  const memory = new Map();
  const remember = (host, found) => {
    memory.delete(host);
    memory.set(host, { found, at: now() });
    while (memory.size > most) memory.delete(memory.keys().next().value);
  };

  return async function recordFor(host) {
    if (!host || !api) return null;
    const known = memory.get(host);
    if (known && now() - known.at < (known.found ? ttl : missTtl)) return known.found;
    try {
      const res = await fetchImpl(
        `${api}/sites/host/?host=${encodeURIComponent(host)}`,
        { signal: deadline(timeout), headers: { Accept: 'application/json' }, cache: 'no-store' },
      );
      let found = null;
      if (res.status === 404) {
        found = null;
      } else if (!res.ok) {
        throw new Error(`host lookup answered ${res.status}`);
      } else {
        const data = (await res.json())?.data;
        if (data && (data.kind === 'tournament' || data.kind === 'event') && typeof data.slug === 'string' && data.slug) {
          found = { kind: data.kind, slug: data.slug };
        }
      }
      remember(host, found);
      return found;
    } catch {
      return known ? known.found : null;
    }
  };
}
