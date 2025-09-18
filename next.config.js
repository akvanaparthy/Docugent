/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
  // Note: bodyParser config is not needed for App Router
  // File upload limits are handled in the API routes directly
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
