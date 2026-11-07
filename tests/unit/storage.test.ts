import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../../src/utils/storage';
import type { SaleRecord } from '../../src/types';

// Bug nyata: restore backup dulu HANYA memeriksa bahwa sales/purchases/dll berupa array,
// tanpa memeriksa isi tiap barisnya. Satu baris rusak bisa membuat layar kosong/putih
// setelah restore. Sekarang baris rusak dibuang satu-satu, baris sah tetap dimuat, dan
// jumlah yang dibuang dilaporkan lewat validationWarnings.
describe('StorageService.validateAndParseBackup', () => {
  const baseBackup = {
    profile: { pertashopName: 'Test Pertashop' },
    products: [{ id: 'p1', name: 'Pertamax' }],
    tank: { currentStockLiters: 1000, totalCapacityLiters: 5000 },
  };

  it('menolak file yang bukan objek JSON', () => {
    expect(() => StorageService.validateAndParseBackup('"cuma string"')).toThrow();
  });

  it('menolak file tanpa profile/products/tank', () => {
    expect(() => StorageService.validateAndParseBackup(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('membuang baris penjualan yang rusak, tetap memuat baris yang sah', () => {
    const backup = {
      ...baseBackup,
      sales: [
        { id: 's1', transactionDate: '2026-10-01', shift: 'Shift 1', operatorName: 'Daslam', literSold: 100 },
        { id: 's2' }, // rusak: field wajib hilang
        { foo: 'bar' }, // rusak total
        'bukan objek', // rusak total
      ],
    };
    const result = StorageService.validateAndParseBackup(JSON.stringify(backup));
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].id).toBe('s1');
    expect(result.validationWarnings?.some((w) => w.includes('penjualan'))).toBe(true);
  });

  it('tabel kosong atau tidak ada di file tidak menyebabkan error', () => {
    const result = StorageService.validateAndParseBackup(JSON.stringify(baseBackup));
    expect(result.sales).toEqual([]);
    expect(result.purchases).toEqual([]);
    expect(result.employees).toEqual([]);
  });

  it('baris yang sepenuhnya valid di semua tabel tidak menghasilkan warning', () => {
    const backup = {
      ...baseBackup,
      employees: [{ id: 'e1', name: 'Daslam' }],
      expenses: [{ id: 'x1', date: '2026-10-01', category: 'GAJI_OPERATOR', amount: 100000 }],
    };
    const result = StorageService.validateAndParseBackup(JSON.stringify(backup));
    expect(result.employees).toHaveLength(1);
    expect(result.expenses).toHaveLength(1);
    expect(result.validationWarnings ?? []).toHaveLength(0);
  });
});

// Bug nyata (insiden pengguna): peringatan "PENYIMPANAN PENUH: data terbaru GAGAL disimpan"
// muncul, pengguna disarankan unduh Backup JSON sebagai jaring pengaman - tapi createBackupData
// SEBELUM perbaikan ini SELALU membaca ulang dari localStorage (StorageService.getSales() dkk),
// persis sumber yang BARU SAJA gagal ditulisi karena penuh. Akibatnya file backup yang diunduh
// tepat saat krisis tidak menyertakan data terbaru yang sedang berisiko hilang - jaring
// pengaman yang gagal justru di saat paling dibutuhkan. Parameter `liveData` memastikan state
// React yang sedang berjalan di memori (selalu akurat, tidak peduli localStorage berhasil
// menulis atau tidak) dipakai sebagai gantinya.
describe('StorageService.createBackupData - liveData override (regresi insiden PENYIMPANAN PENUH)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('TANPA liveData: mengambil dari localStorage seperti sebelumnya (kompatibilitas mundur)', () => {
    const staleSale: SaleRecord = { id: 'stale-1', transactionDate: '2026-01-01' } as SaleRecord;
    localStorage.setItem('pertashop_sales_v5_fresh', JSON.stringify([staleSale]));
    const backup = StorageService.createBackupData();
    expect(backup.sales).toHaveLength(1);
    expect(backup.sales[0].id).toBe('stale-1');
  });

  it('DENGAN liveData: memakai data dari memori, BUKAN localStorage - walau localStorage berisi data lain/basi', () => {
    // Simulasikan persis situasi insiden: localStorage berisi data LAMA (atau kosong, krn
    // tulisan terakhir gagal), sementara data TERBARU hanya ada di state React (liveData).
    const staleSaleInStorage: SaleRecord = { id: 'stale-old', transactionDate: '2026-01-01' } as SaleRecord;
    localStorage.setItem('pertashop_sales_v5_fresh', JSON.stringify([staleSaleInStorage]));

    const freshSaleInMemory: SaleRecord = { id: 'fresh-unsaved', transactionDate: '2026-10-25' } as SaleRecord;
    const backup = StorageService.createBackupData(undefined, { sales: [freshSaleInMemory] });

    expect(backup.sales).toHaveLength(1);
    expect(backup.sales[0].id).toBe('fresh-unsaved'); // BUKAN 'stale-old' dari localStorage
  });

  it('liveData sebagian (hanya sales diisi) - field lain tetap fallback ke localStorage, tidak error', () => {
    localStorage.setItem('pertashop_employees_v5_fresh', JSON.stringify([{ id: 'e1', name: 'Daslam' }]));
    const freshSale: SaleRecord = { id: 'fresh-1', transactionDate: '2026-10-25' } as SaleRecord;
    const backup = StorageService.createBackupData(undefined, { sales: [freshSale] });
    expect(backup.sales[0].id).toBe('fresh-1');
    expect(backup.employees).toHaveLength(1); // field yg tidak dioper via liveData tetap fallback aman
  });
});
