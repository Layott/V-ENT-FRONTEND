/** @type {import('next').NextConfig} */

// Production media host, e.g. "api.v-ent.co". Set NEXT_PUBLIC_MEDIA_HOST at
// build time; without it only the local dev hosts below are allowed.
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

// The security headers every page carries (owner rule R77, 30 September 2026).
//
// nginx already sent X-Frame-Options, nosniff and a referrer policy for
// v-ent.co; HSTS and a Content-Security-Policy were missing. They are set here
// rather than in nginx so a local build and the box send the same thing, and
// so the list of what a page may load lives next to the code that loads it.
//
// The CSP names what the site actually uses, found by reading it:
//   connect  the API (NEXT_PUBLIC_API_URL) and this origin
//   frames   YouTube and Twitch stream embeds, Google Maps on an event, and
//            the API's own overlays in the studio preview
//   images   anywhere over https (avatars, maps tiles, link previews) and data
//   scripts  this origin; 'unsafe-inline' because Next writes its bootstrap
//            inline, 'unsafe-eval' only in development for fast refresh
const isDev = process.env.NODE_ENV === 'development';
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || '').origin;
  } catch {
    return '';
  }
})();
const contentSecurityPolicy = [
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
  "frame-ancestors 'self'",
].join('; ');

// Embeds (inbox 360) are pages other websites hold in a frame, so they carry
// the same policy with one change: any site may frame them, and there is no
// X-Frame-Options to contradict that. Everything else still refuses framing.
const embedHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy.replace("frame-ancestors 'self'", 'frame-ancestors *') },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
];

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The door scanner needs the camera and the venue map can show where
  // somebody is standing; nothing needs the microphone, and no framed page may
  // ask for any of them.
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
];

const nextConfig = {
  // DEV builds into their own directory, so a production build can never
  // overwrite what a running dev server is serving from.
  //
  // `next build` and `next dev` both write to `.next` by default. Run a build
  // while `pnpm dev` is up and the dev server keeps serving from a directory
  // whose vendor chunks have just been replaced, so every page 500s with
  // "Cannot find module './vendor-chunks/react-icons@5.4.0_react@18.3.1.js'".
  // It has cost this project a debugging round more than once, most recently on
  // 7 September 2026 while walking the studio slots in OBS, where it looked for
  // several minutes like the slot pages themselves were broken.
  //
  // Keyed off NODE_ENV rather than off a script flag, because `next dev` sets
  // it to development and `next build` sets it to production, so this holds
  // however either one is started - pnpm, a hook, an IDE, or by hand.
  //
  // PRODUCTION stays at `.next` deliberately: the VPS unit serves
  // `.next/standalone/server.js`, and moving that would break the deploy to fix
  // a local annoyance. Two directories that never collide is the fix; which one
  // moves is just which one is cheaper to move.
  //
  // In development the port goes in the NAME. Two dev servers on one checkout
  // write the same directory and overwrite each other's chunks, and what the
  // browser then says is "Cannot find module './vendor-chunks/next-auth@...'",
  // which names webpack and next-auth and points at neither. That cost three
  // restarts on 8 September while several people worked in this repo at once.
  // `next dev -p 3001` puts 3001 in PORT before the config is read, so this is
  // enough to keep them apart; with no PORT it falls back to the old name, so
  // a single server behaves exactly as before.
  distDir: process.env.NODE_ENV === 'development'
    ? (process.env.PORT ? `.next-dev-${process.env.PORT}` : '.next-dev')
    : '.next',
  // next-auth's browser bundle reads process.env.NEXTAUTH_URL to work out its
  // own origin. Next only inlines NEXT_PUBLIC_* into client code, so in the
  // browser that read is undefined and next-auth falls back to its built-in
  // default of http://localhost:3000 - which is where relative callback URLs
  // then point in production. Inlining it here makes the client agree with the
  // server. It is a public URL, not a secret.
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  reactStrictMode: true,
  // Emits .next/standalone with a self-contained server.js, which is what the
  // systemd unit on the VPS runs. Without it the box needs the whole node_modules
  // tree and `next start`.
  output: 'standalone',

  // The locale prefix, resolved by the router rather than by middleware.
  //
  // `/fr/tournaments` renders `/tournaments` while the address bar keeps the
  // prefix, which is the entire point of having one. Middleware used to do
  // this with `NextResponse.rewrite()`, and behind nginx that meant building a
  // URL out of an origin Next gets wrong: it takes the host from its own
  // listen address and the scheme from X-Forwarded-Proto, producing
  // `https://localhost:3000` - a place that does not exist. Next then proxied
  // to it, wrote TLS at a plain HTTP port, and every locale URL answered 500.
  //
  // Two attempts to fix that in middleware both reached production and both
  // were wrong: cloning the URL kept the bad origin, and forcing the scheme
  // back to http made the proxy reachable but lost the locale header, so the
  // pages came up rendering English titles and English canonicals.
  //
  // Here there is no URL to get wrong. The router matches the prefix and maps
  // it, and middleware is left doing the one thing it is good at: setting a
  // header. `afterFiles` so a real file or route wins over the mapping.
  async rewrites() {
    const prefixes = ['fr', 'pt'];
    return {
      afterFiles: prefixes.flatMap((code) => [
        { source: `/${code}`, destination: '/' },
        { source: `/${code}/:path*`, destination: '/:path*' },
      ]),
    };
  },

  images: {
    remotePatterns: [
      ...(mediaHost
        ? [{ protocol: 'https', hostname: mediaHost, port: '', pathname: '/**' }]
        : []),
      // Any loopback port, and only in development.
      //
      // Next matches a pattern's port with `if (pattern.port !== undefined)`,
      // so OMITTING port matches any port and `port: ''` means "must have no
      // port at all". This list used to pin 8000 and 8100, which had the same
      // shape as the CORS origin list: it was extended once per port somebody
      // happened to use, and a backend on any other port made `next/image`
      // throw "Invalid src prop". That throw is not a broken picture, it takes
      // the whole page down to its error boundary, which on 8 September read as
      // "This page did not load" while the API was answering 200.
      ...(process.env.NODE_ENV === 'development'
        ? [
            { protocol: 'http', hostname: 'localhost', pathname: '/**' },
            { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
          ]
        : [
            { protocol: 'http', hostname: 'localhost', port: '', pathname: '/**' },
          ]),
    ],
  },
  // Optional: Add this to help with image loading issues
  experimental: {
    externalDir: true,
    // Build in this process rather than forking jest-worker children.
    //
    // On the main dev machine files keep disappearing out of node_modules and
    // out of the pnpm store itself - `next/dist/compiled/jest-worker/
    // processChild.js` most often - so every build died before compiling
    // anything, and `pnpm install --force` reproduced the gap because it copies
    // from the same damaged store. Single-process builds do not need that file.
    // Slower on a many-core machine, and the only setting here that makes the
    // build finish reliably.
    workerThreads: false,
    cpus: 1,
  },

  // The legal documents were PDFs in `/public` and are pages now. The old
  // addresses have been sent in emails and printed on a listing, so they keep
  // working rather than 404ing at the moment somebody is checking what they
  // agreed to.
  async headers() {
    return [
      // A prefixed embed (/fr/embed/...) is still an embed.
      { source: '/:path((?!(?:fr/|pt/)?embed/).*)', headers: securityHeaders },
      { source: '/embed/:path*', headers: embedHeaders },
      { source: '/:locale(fr|pt)/embed/:path*', headers: embedHeaders },
    ];
  },

  async redirects() {
    return [
      { source: '/terms-of-use.pdf', destination: '/terms', permanent: true },
      { source: '/privacy-policy.pdf', destination: '/privacy-policy', permanent: true },
      { source: '/terms-of-use', destination: '/terms', permanent: true },
      { source: '/term-of-use', destination: '/terms', permanent: true },
      // The CEO registered the Discord application on 7 September with its
      // Terms of Service URL as `https://v-ent.co/terms-of-service`, which
      // 404d. Discord shows that link on the consent screen somebody sees
      // before granting access, so a dead link there is the worst possible
      // place for one.
      //
      // Redirecting rather than asking for the entry to be retyped: this is
      // the name most services and most people will guess, it is what every
      // other platform calls it, and an address somebody has already written
      // down somewhere should keep working. Same principle as SlugHistory.
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      { source: '/tos', destination: '/terms', permanent: true },
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
    ];
  },
};

export default nextConfig;
