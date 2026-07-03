/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aaes-os/platform-sdk'],
  async rewrites() {
    const apiUrl = process.env.PLATFORM_API_URL ?? 'http://localhost:4100';
    return [
      {
        source: '/api/platform/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
