import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sequelize', 'mysql2', 'yahoo-finance2'],
};

export default nextConfig;
