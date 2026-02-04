/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@zoark/database', '@zoark/types'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
