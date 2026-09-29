/* The door scanner's service worker.
 *
 * Its one job: the scanner page opens with no signal. The ticket list, the
 * scan record and the queue already live in localStorage; what a reload with
 * no network lost was the PAGE (the HTML shell and the JavaScript chunks it
 * loads). This keeps a copy of both.
 *
 * Deliberately small and deliberately scoped:
 *
 *   - /events/scan (the shell): network first, so a deploy lands on the next
 *     load with signal; the last good copy when the network fails.
 *   - /_next/static/ chunks, the app's own fonts and images: the cached copy
 *     answers at once and the network refreshes it behind. A production
 *     chunk's name carries its hash and never changes, so the refresh is a
 *     no-op there; a dev chunk's name does not, and cache-first pinned the
 *     old scanner after every edit.
 *   - the API (another origin) is never touched: the page decides what to ask
 *     and what to queue, and a worker that answered API calls from a cache
 *     would be a scanner that lies about who has been through.
 *
 * Registered by the scanner page (see src/app/events/scan/page.js) and by
 * Settings > Notifications when somebody turns push on in a browser: the site
 * has ONE worker at scope "/" (a second one there would replace this one), so
 * push lives here too. The caching above touches only the scanner shell and
 * hashed static files, so it changes nothing for any other page.
 *
 * Push (CEO, 30 September 2026: every notification switch must work as each
 * person set it): the server sends {title, body, url, tag}; this shows it,
 * and a tap opens the url, reusing a V-ENT tab when one is open.
 */

const VERSION = 'door-v2';
const SHELL = '/events/scan';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    try {
      await cache.add(new Request(SHELL, { cache: 'reload' }));
    } catch (err) {
      // Installing without signal: the shell is cached on the first load
      // that has one, from the fetch handler below.
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function isShell(url) {
  return url.origin === self.location.origin && url.pathname === SHELL;
}

function isStatic(url) {
  if (url.origin !== self.location.origin) return false;
  return url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/fonts/')
    || url.pathname.startsWith('/images/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isShell(url)) {
    // Network first, cache fallback. The query string (event, gate, day) is
    // the page's business; the shell is the same document for all of them.
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(SHELL, fresh.clone());
        return fresh;
      } catch (err) {
        const kept = await cache.match(SHELL);
        if (kept) return kept;
        throw err;
      }
    })());
    return;
  }

  if (isStatic(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const kept = await cache.match(request);
      const refresh = fetch(request).then((fresh) => {
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      });
      if (kept) {
        // Keep the worker alive until the refresh lands, and never let a
        // failed refresh (no signal) turn into an unhandled rejection.
        event.waitUntil(refresh.catch(() => {}));
        return kept;
      }
      return refresh;
    })());
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (err) { data = { title: 'V-ENT', body: event.data && event.data.text() }; }
  const title = data.title || 'V-ENT';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/images/icon-192.png',
    badge: '/images/logo_mark_red.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/notifications' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin && 'focus' in tab) {
        await tab.focus();
        if ('navigate' in tab) return tab.navigate(url);
        return undefined;
      }
    }
    return self.clients.openWindow(url);
  })());
});
