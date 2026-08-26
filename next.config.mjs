/** @type {import('next').NextConfig} */

// Production media host, e.g. "api.v-ent.co". Set NEXT_PUBLIC_MEDIA_HOST at
// build time; without it only the local dev hosts below are allowed.
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

const nextConfig = {
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
  }
};

export default nextConfig;
