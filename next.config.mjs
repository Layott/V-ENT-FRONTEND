/** @type {import('next').NextConfig} */

// Production media host, e.g. "api.v-ent.co". Set NEXT_PUBLIC_MEDIA_HOST at
// build time; without it only the local dev hosts below are allowed.
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

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
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
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
  swcMinify: true,
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
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      // Local dev backend served over IPv4 loopback (the Chrome walkthrough uses
      // 127.0.0.1 because Chrome resolves `localhost` to ::1, which Django's
      // dev server doesn't bind). Media URLs come back as http://127.0.0.1:8000/media/*.
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      // Alt dev port for the backend (used when :8000 is taken locally).
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8100',
        pathname: '/**',
      },
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
