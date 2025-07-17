/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      // 本番環境ではPORT+1でSocket.IOサーバーが動作
      const socketPort = process.env.PORT ? Number(process.env.PORT) + 1 : 10001;
      return [
        {
          source: '/socket.io/:path*',
          destination: `http://localhost:${socketPort}/socket.io/:path*`,
        },
      ];
    } else {
      // 開発環境では別ポート
      const socketHost = process.env.SOCKET_HOST || 'localhost';
      return [
        {
          source: '/socket.io/:path*',
          destination: `http://${socketHost}:3001/socket.io/:path*`,
        },
      ];
    }
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
};

module.exports = nextConfig;