import { describe, it, expect } from 'vitest';
import { sumExpensesNetOfFuelGain } from '../../src/utils/formatters';

// Bug nyata: AnalyticsView pernah menghitung GAIN_MINYAK (surplus BBM) sebagai
// beban TAMBAHAN, padahal seharusnya MENGURANGI beban (surplus = laba lebih besar).
// Layar lain (Rekap, Cetak P&L) sudah benar. Fungsi bersama ini memastikan semua
// layar laporan konsisten, dan test ini mencegah salah satu layar kembali salah
// arah di masa depan.
describe('sumExpensesNetOfFuelGain', () => {
  it('GAIN_MINYAK mengurangi total beban, bukan menambah', () => {
    const expenses = [
      { category: 'GAJI_OPERATOR', amount: 1_000_000 },
      { category: 'GAIN_MINYAK', amount: 50_000 },
    ];
    // 1.000.000 - 50.000 = 950.000, BUKAN 1.050.000
    expect(sumExpensesNetOfFuelGain(expenses)).toBe(950_000);
  });

  it('LOSSES_MINYAK tetap menambah beban seperti kategori lain', () => {
    const expenses = [
      { category: 'GAJI_OPERATOR', amount: 1_000_000 },
      { category: 'LOSSES_MINYAK', amount: 30_000 },
    ];
    expect(sumExpensesNetOfFuelGain(expenses)).toBe(1_030_000);
  });

  it('kombinasi gain dan loss dalam satu bulan dihitung benar', () => {
    const expenses = [
      { category: 'GAJI_OPERATOR', amount: 1_000_000 },
      { category: 'GAIN_MINYAK', amount: 50_000 },
      { category: 'LOSSES_MINYAK', amount: 30_000 },
    ];
    expect(sumExpensesNetOfFuelGain(expenses)).toBe(1_000_000 - 50_000 + 30_000);
  });

  it('daftar kosong menghasilkan 0', () => {
    expect(sumExpensesNetOfFuelGain([])).toBe(0);
  });
});
