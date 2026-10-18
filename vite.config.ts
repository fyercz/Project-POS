import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // import.meta.dirname (bukan __dirname): Vite 8 memperingatkan __dirname akan tidak
        // didukung lagi di configLoader 'native' yang rencananya jadi default di versi depan.
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Pisahkan library besar agar bundle utama lebih kecil & cache lebih efektif.
          // Bentuk objek {nama: [paket]} yang dipakai sebelumnya ditolak tipe Rollup versi
          // baru (ikut naik lewat update Vite 6->8) - manualChunks sekarang wajib berbentuk
          // fungsi. Hasil akhirnya (pengelompokan chunk) persis sama seperti sebelumnya.
          manualChunks: (id) => {
            if (id.includes('node_modules/recharts')) return 'charts';
            if (id.includes('node_modules/xlsx') || id.includes('node_modules/@e965/xlsx')) return 'xlsx';
            if (id.includes('node_modules/lucide-react')) return 'icons';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
