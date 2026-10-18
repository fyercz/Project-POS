import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Konfigurasi terpisah dari vite.config.ts (yang mengatur build produksi) agar menjalankan
// test tidak pernah memengaruhi atau bergantung pada konfigurasi build aplikasi.
//
// environment: 'jsdom' (bukan 'node') supaya test komponen React (tests/**/*.test.tsx) bisa
// me-render ke DOM virtual. Test fungsi murni di tests/unit/*.test.ts tetap jalan normal di
// atas jsdom - tidak ada downside nyata, dan menghindari perlu dua config terpisah.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // import.meta.dirname (bukan __dirname): sama seperti perbaikan di vite.config.ts.
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
