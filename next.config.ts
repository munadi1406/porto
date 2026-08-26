import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sequelize', 'mysql2', 'yahoo-finance2', 'pdfjs-dist', 'tesseract.js', 'canvas'],
  async rewrites() {
    return [
      {
        source: '/api/idxx/:path*',
        destination: 'https://www.idx.co.id/:path*',
      },
    ];
  },
};

export default nextConfig;
