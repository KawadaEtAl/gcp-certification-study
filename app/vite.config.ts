import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base ensures the built static bundle works identically on
  // GitHub Pages (subpath), Firebase Hosting, and Cloud Run.
  base: './',
  server: {
    port: 5173,
    host: true,
  },
});
