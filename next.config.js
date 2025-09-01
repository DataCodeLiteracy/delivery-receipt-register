/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@google-cloud/vision"],
  images: {
    domains: ["firebasestorage.googleapis.com"],
  },
  experimental: {
    // NFT 파일 생성 비활성화
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
}

module.exports = nextConfig
