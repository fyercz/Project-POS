import { describe, it, expect } from 'vitest';
import { StorageService } from '../../src/utils/storage';

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
