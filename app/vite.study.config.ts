import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'study-light',
  publicDir: '../public',
  base: './',
  server: { host: '127.0.0.1', port: 4198, strictPort: true },
  build: { outDir: '../dist-study-light', emptyOutDir: true },
});
