// The web app manifest, so the door scanner can be added to a phone's home
// screen and opened like an app: full screen, its own icon, and (with the
// service worker in public/door-sw.js) opening with no signal at all.
//
// CEO, 18 September 2026: "We also need to make Offline scanning of tickets
// very possible and easy." The scanner already decided every scan locally and
// queued the results, but only while the tab stayed open: a reload with no
// signal lost the page itself. A steward at a venue on a saturated cell tower
// reloads without thinking about it.

export default function manifest() {
  return {
    name: 'V-ENT',
    short_name: 'V-ENT',
    description: 'Esports tournaments, events and teams, built for Africa.',
    start_url: '/events/my-events',
    scope: '/',
    display: 'standalone',
    background_color: '#131316',
    theme_color: '#131316',
    icons: [
      { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: 'Door scanner',
        short_name: 'Door',
        url: '/events/my-events',
        icons: [{ src: '/images/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
