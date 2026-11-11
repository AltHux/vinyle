/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  // Wgrywanie zdjęć profilowych (do 2 MB) przez akcje serwerowe
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
};
export default nextConfig;
