import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// This is the Electron build (npm run build → dist/, then electron-builder).
// The browser build reuses it with two overrides — see vite.config.web.ts.
export default defineConfig({
  plugins: [react()],

  // Electron loads the built app from disk over file://, where an absolute asset
  // path like /assets/index.js resolves to the filesystem root and 404s. Relative
  // paths work there. The web build overrides this back to '/'.
  base: './',

  server: {
    port: 5173,
    // The API's ALLOWED_ORIGINS already permits this origin; the proxy keeps the
    // dashboard on one origin so uploaded files and API calls share a host.
    proxy: {
      '/api': { target: process.env.API_URL || 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: process.env.API_URL || 'http://localhost:5000', changeOrigin: true },
      // ws:true — without it the Socket.io upgrade never gets through the proxy
      // and the dashboard silently falls back to polling only.
      '/socket.io': { target: process.env.API_URL || 'http://localhost:5000', ws: true },
    },
  },
});
