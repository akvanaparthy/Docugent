/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
  // Enable serverless functions for Vercel
  output: "standalone",
};

module.exports = nextConfig;
