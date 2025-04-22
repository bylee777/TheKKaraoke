/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  experimental: {
    appDir: false,
  },
  images: {
    unoptimized: true, // for static export compatibility
  },
};

module.exports = nextConfig;
