import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxying /api to the Express server means the React app can just call
// fetch('/api/...') — no CORS juggling, and Playwright's baseURL can point
// at this one origin (http://localhost:5173) for both UI and API-hybrid
// tests.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
