/**
 * Log error LOKAL saja - tidak pernah mengirim data kemana pun lewat jaringan. Ini aplikasi
 * offline-first yang dipakai di komputer kasir SPBU; kalau terjadi crash, SELAMA INI pemilik
 * tidak punya cara tahu dari jarak jauh (layar putih kosong, tidak ada jejak apa pun).
 *
 * Desain ini SENGAJA minimal dan 100% lokal (localStorage): tidak ada layanan pihak ketiga,
 * tidak ada data yang keluar dari komputer kasir. Pemilik melihat log lewat tombol "Lihat Log
 * Error" di modal Backup & Restore, lalu bisa mengekspornya sebagai file .txt untuk dikirim
 * manual (WhatsApp, email, dsb.) ke developer/support kalau memang perlu - keputusan untuk
 * membagikan tetap di tangan pemilik, bukan otomatis.
 */

const ERROR_LOG_KEY = 'pertashop_error_log_v1';
const MAX_LOG_ENTRIES = 50; // circular buffer - entri terlama dibuang begitu penuh

export interface ErrorLogEntry {
  timestamp: string; // ISO string
  message: string;
  stack?: string;
  source?: string; // 'window.onerror' | 'unhandledrejection' | 'react-error-boundary'
  url?: string; // lokasi halaman saat error terjadi (mis. hash route bila ada)
}

function readLog(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries: ErrorLogEntry[]): void {
  try {
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(entries.slice(-MAX_LOG_ENTRIES)));
  } catch {
    // Kalau localStorage penuh/gagal, lewati saja - logging error tidak boleh sampai
    // menyebabkan error BARU yang lebih mengganggu daripada masalah aslinya.
  }
}

export function logError(entry: Omit<ErrorLogEntry, 'timestamp'>): void {
  const entries = readLog();
  entries.push({ ...entry, timestamp: new Date().toISOString() });
  writeLog(entries);
}

export function getErrorLog(): ErrorLogEntry[] {
  return readLog().slice().reverse(); // terbaru dulu
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
  } catch {
    // abaikan
  }
}

export function formatErrorLogAsText(entries: ErrorLogEntry[]): string {
  if (entries.length === 0) return 'Tidak ada error yang tercatat.';
  return entries
    .map(
      (e, i) =>
        `[${i + 1}] ${e.timestamp}\nSumber: ${e.source || 'tidak diketahui'}\nPesan: ${e.message}\n${
          e.stack ? `Stack:\n${e.stack}\n` : ''
        }`
    )
    .join('\n---\n\n');
}

let handlersInstalled = false;

/**
 * Pasang sekali di titik masuk aplikasi (main.tsx). Menangkap error JS tak tertangani dan
 * Promise yang ditolak tanpa .catch() - DUA kelas error yang tidak akan pernah tertangkap oleh
 * React Error Boundary manapun (boundary cuma menangkap error di dalam alur render React).
 */
export function installGlobalErrorHandlers(): void {
  if (handlersInstalled) return; // jaga-jaga kalau terpanggil dua kali (mis. React StrictMode)
  handlersInstalled = true;

  window.addEventListener('error', (event) => {
    logError({
      message: event.message || 'Error tidak dikenal',
      stack: event.error?.stack,
      source: 'window.onerror',
      url: window.location.href,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logError({
      message: reason?.message || String(reason) || 'Promise ditolak tanpa pesan',
      stack: reason?.stack,
      source: 'unhandledrejection',
      url: window.location.href,
    });
  });
}
