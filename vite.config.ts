import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/lafontaine-recitation-training/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3003,
    strictPort: true,
  },
});
