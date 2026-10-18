import { describe, it, expect, beforeEach } from 'vitest';
import { logError, getErrorLog, clearErrorLog, formatErrorLogAsText } from '../../src/utils/errorLog';

// Fitur baru: log error lokal untuk memonitor crash di PC kasir tanpa mengirim data kemana pun.
describe('errorLog', () => {
  beforeEach(() => {
    clearErrorLog();
  });

  it('getErrorLog kosong saat belum ada error dicatat', () => {
    expect(getErrorLog()).toEqual([]);
  });

  it('logError menyimpan entri dengan timestamp otomatis', () => {
    logError({ message: 'Test error', source: 'window.onerror' });
    const log = getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].message).toBe('Test error');
    expect(log[0].timestamp).toBeTruthy();
  });

  it('entri terbaru muncul PALING ATAS (urutan terbalik)', () => {
    logError({ message: 'Error pertama' });
    logError({ message: 'Error kedua' });
    const log = getErrorLog();
    expect(log[0].message).toBe('Error kedua');
    expect(log[1].message).toBe('Error pertama');
  });

  it('buffer melingkar: tidak menyimpan lebih dari 50 entri (yang terlama dibuang)', () => {
    for (let i = 0; i < 60; i++) {
      logError({ message: `Error ke-${i}` });
    }
    const log = getErrorLog();
    expect(log.length).toBeLessThanOrEqual(50);
    // Entri PALING LAMA (Error ke-0..9) harus sudah dibuang, yang tersisa Error ke-10 dst.
    expect(log.some((e) => e.message === 'Error ke-0')).toBe(false);
    expect(log.some((e) => e.message === 'Error ke-59')).toBe(true);
  });

  it('clearErrorLog mengosongkan seluruh riwayat', () => {
    logError({ message: 'Akan dihapus' });
    expect(getErrorLog()).toHaveLength(1);
    clearErrorLog();
    expect(getErrorLog()).toHaveLength(0);
  });

  it('formatErrorLogAsText menghasilkan teks yang bisa dibaca untuk daftar kosong', () => {
    expect(formatErrorLogAsText([])).toMatch(/tidak ada/i);
  });

  it('formatErrorLogAsText menyertakan pesan dan sumber setiap entri', () => {
    logError({ message: 'Pesan unik 123', source: 'react-error-boundary' });
    const text = formatErrorLogAsText(getErrorLog());
    expect(text).toContain('Pesan unik 123');
    expect(text).toContain('react-error-boundary');
  });
});
