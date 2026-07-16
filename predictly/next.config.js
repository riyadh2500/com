/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,

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

      // Stub pino-pretty — pulled in by WalletConnect's pino logger
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
