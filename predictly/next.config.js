/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,

  // Allow embedding in an iframe from any localhost port
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false,
        crypto: false, stream: false, os: false,
        lokijs: false, encoding: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        'pino-pretty': path.resolve(__dirname, 'src/lib/stubs/pino-pretty.js'),
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/lib/stubs/async-storage.js'),
      };
    }
    return config;
  },
};

module.exports = nextConfig;
