/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vermillionent.pythonanywhere.com',
        port: '',
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