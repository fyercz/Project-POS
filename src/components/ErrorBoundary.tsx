import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { logError } from '../utils/errorLog';

/**
 * Sebelum ini: error apa pun di alur render React membuat SELURUH layar menjadi putih kosong
 * tanpa pesan - kasir tidak tahu harus berbuat apa selain menutup paksa aplikasi, dan data yang
 * sedang diisi (belum disimpan) hilang begitu saja. Boundary ini menangkapnya dan menampilkan
 * pesan yang jelas + tombol "Muat Ulang", serta mencatatnya ke log error lokal (lihat
 * src/utils/errorLog.ts) supaya pemilik bisa melihat riwayat crash lewat modal Backup & Restore.
 *
 * KETERBATASAN: Error Boundary React TIDAK menangkap error di event handler (onClick, dst.),
 * di kode async (setTimeout, Promise), atau di boundary itu sendiri - untuk itu lihat
 * installGlobalErrorHandlers() di errorLog.ts yang dipasang terpisah di main.tsx.
 */

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError({
      message: error.message,
      stack: error.stack || errorInfo.componentStack || undefined,
      source: 'react-error-boundary',
      url: window.location.href,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 mb-2">Terjadi Kesalahan Tak Terduga</h1>
            <p className="text-sm text-slate-600 mb-1">
              Aplikasi mengalami error dan tidak bisa melanjutkan tampilan ini. Data yang sudah
              tersimpan sebelumnya TIDAK hilang - hanya tampilan saat ini yang bermasalah.
            </p>
            <p className="text-xs text-slate-500 mb-5">
              Kejadian ini sudah dicatat dan bisa dilihat lewat menu Backup &amp; Restore
              (&quot;Lihat Log Error&quot;) untuk dilaporkan ke support bila berulang.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
