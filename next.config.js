/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  experimental: {
    appDir: true,
  },
  images: {
    unoptimized: true, // for static export compatibility
  },
};

module.exports = nextConfig;
