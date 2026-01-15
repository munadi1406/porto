/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['sequelize', 'mysql2', 'yahoo-finance2'],
    turbopack: {},
};

export default nextConfig;
