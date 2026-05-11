/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Increase body size limit to 75MB for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '75mb',
    },
  },
}

module.exports = nextConfig
