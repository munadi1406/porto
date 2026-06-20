import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sequelize', 'mysql2', 'yahoo-finance2'],
  async rewrites() {
    return [
      {
        source: '/api/idx-proxy/:path*',
        destination: 'https://www.idx.co.id/:path*',
      },
    ];
  },
};

export default nextConfig;
