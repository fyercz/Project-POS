import path from 'path';
import { defineConfig } from 'vitest/config';

// Konfigurasi terpisah dari vite.config.ts (yang mengatur build produksi) agar menjalankan
// test tidak pernah memengaruhi atau bergantung pada konfigurasi build aplikasi.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node', // util/*.ts adalah fungsi murni, tidak butuh DOM
    include: ['tests/**/*.test.ts'],
  },
});
