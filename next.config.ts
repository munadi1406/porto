import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sequelize', 'mysql2', 'yahoo-finance2', 'pdfjs-dist', 'tesseract.js', 'canvas'],
};

export default nextConfig;
