import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/family360-preview/',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { sourcemap: false },
});
