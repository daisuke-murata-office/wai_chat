/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      // 本番環境ではPORT+1でSocket.IOサーバーが動作
      const socketPort = process.env.PORT ? Number(process.env.PORT) + 1 : 10001;
      return [
        {
          source: '/socket.io/health',
          destination: `http://localhost:${socketPort}/health`,
        },
        {
          source: '/socket.io',
          destination: `http://localhost:${socketPort}/socket.io/`,
        },
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
          source: '/socket.io/health',
          destination: `http://${socketHost}:3001/health`,
        },
        {
          source: '/socket.io',
          destination: `http://${socketHost}:3001/socket.io/`,
        },
        {
          source: '/socket.io/:path*',
          destination: `http://${socketHost}:3001/socket.io/:path*`,
        },
      ];
    }
  },
  async headers() {
    return [
      {
        source: '/socket.io',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/socket.io/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
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