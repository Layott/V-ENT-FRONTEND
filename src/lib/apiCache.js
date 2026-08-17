/**
 * Request de-duplication + short-lived cache for GETs.
 *
 * Why this exists: the app shell mounts Header, MobileHeader, Sidebar and
 * BottomMenu on every page, and several of them want the same data (who am I,
 * how many unread notifications). Page effects also re-run once the NextAuth
 * session resolves. Measured on a production build at 220ms RTT, that meant
 * /auth/notifications/unread-count/ was fetched four times and
 * /auth/get-user-informations/ up to four times on a single page load, plus the
 * page's own data twice.
 *
 * Every duplicate is a wasted round trip. From Los Angeles that is ~220ms each.
 *
 * Two mechanisms:
 *   1. in-flight sharing - concurrent callers for the same key await one promise
 *   2. a short TTL - a repeat within `ttl` ms reuses the last result
 *
 * Deliberately tiny and dependency-free: no SWR, no react-query, no new package.
 */

// The maps must be shared by every importer. If this module ever gets bundled
// into more than one client chunk, each copy would keep its own maps and dedupe
// nothing, so anchor the state on globalThis and count instantiations.
const store = (() => {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (!g.__ventApiCache) {
    g.__ventApiCache = { inflight: new Map(), cache: new Map(), instances: 0 };
  }
  g.__ventApiCache.instances += 1;
  return g.__ventApiCache;
})();

const inflight = store.inflight;   // key -> Promise
const cache = store.cache;         // key -> { at, value }

const DEFAULT_TTL = 15000;

const keyFor = (url, token) => `${url}::${token ? token.slice(0, 8) : 'anon'}`;

/**
 * GET a JSON endpoint, sharing the request with any concurrent caller.
 *
 * @param {string} url    absolute URL
 * @param {object} opts   { token, ttl, headers }
 * @returns {Promise<any>} parsed JSON body
 */
export function getJson(url, { token, ttl = DEFAULT_TTL, headers = {} } = {}) {
  const key = keyFor(url, token);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
    .then((res) => res.json())
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

/**
 * Drop cached entries. Call after a mutation so the next read is fresh:
 * `invalidate('/auth/wallet/')` after a transfer, for example.
 */
export function invalidate(urlFragment = '') {
  if (!urlFragment) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(urlFragment)) cache.delete(key);
  }
}
