import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/telemetry': 'http://localhost:4000',
      '/metrics': 'http://localhost:4000',
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
