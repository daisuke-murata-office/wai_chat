/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const socketHost = process.env.SOCKET_HOST || 'localhost';
    return [
      {
        source: '/socket.io/:path*',
        destination: `http://${socketHost}:3001/socket.io/:path*`,
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
};

module.exports = nextConfig;