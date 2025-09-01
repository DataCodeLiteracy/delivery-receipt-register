/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@google-cloud/vision"],
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
}

module.exports = nextConfig
