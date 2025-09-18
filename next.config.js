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
  webpack: (config, { isServer }) => {
    // Handle undici compatibility issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        undici: "commonjs undici",
      });
    }

    return config;
  },
};

module.exports = nextConfig;
