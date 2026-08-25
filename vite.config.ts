import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode: _mode }) => ({
  // For GitHub Pages project site set to '/<REPO_NAME>/'
  // For user site (<username>.github.io) or custom domain keep '/'
  // Build with: GH_PAGES_BASE=MyRepo npm run build  (vite.config.ts reads via process.env)
  // @ts-ignore - process is available in Node during build
  base: (typeof process !== 'undefined' && process.env.GH_PAGES_BASE)
    // @ts-ignore
    ? `/${process.env.GH_PAGES_BASE}/`
    : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    assetsInlineLimit: 0, // keep images as files for lazy loading, don't inline as base64
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
}));