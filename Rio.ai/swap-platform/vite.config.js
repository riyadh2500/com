import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
    // Proxy 1inch + 0x API calls to avoid CORS in dev
    proxy: {
      '/1inch': {
        target: 'https://api.1inch.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/1inch/, ''),
      },
      '/0x': {
        target: 'https://api.0x.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/0x/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
});
