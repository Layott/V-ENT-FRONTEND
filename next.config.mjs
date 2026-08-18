/** @type {import('next').NextConfig} */

// Production media host, e.g. "api.v-ent.co". Set NEXT_PUBLIC_MEDIA_HOST at
// build time; without it only the local dev hosts below are allowed.
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

const nextConfig = {
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
  }
};

export default nextConfig;
