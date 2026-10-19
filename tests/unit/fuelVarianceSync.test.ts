import { describe, it, expect, vi } from 'vitest';
import { syncFuelVarianceToExpenses } from '../../src/utils/fuelVarianceSync';
import type { Product, ExpenseRecord } from '../../src/types';

// Utilitas ini dipakai BERSAMA oleh 3 domain (Penjualan, DO Pertamina, Sounding) - lihat
// catatan lengkap di fuelVarianceSync.ts. Setiap test di sini merepresentasikan perhitungan
// finansial nyata yang sudah diverifikasi manual di browser sebelum diekstrak.

function makeDeps(setExpenses = vi.fn()) {
  const product: Product = {
    id: 'prod-pertamax-92',
    code: '92',
    name: 'Pertamax',
    ron: 92,
    currentPrice: 15850,
    buyPrice: 15046,
    marginPerLiter: 804,
    color: 'blue',
    badgeColor: 'bg-blue-500',
    description: '',
  };
  return { products: [product], priceHistory: [], sales: [], setExpenses };
}

describe('syncFuelVarianceToExpenses', () => {
  it('losses (varians negatif) membuat entri LOSSES_MINYAK dengan nominal = liter x harga beli', () => {
    const setExpenses = vi.fn();
    syncFuelVarianceToExpenses(
      makeDeps(setExpenses),
      'snd1',
      'SOUNDING_TANGKI',
      '2026-10-15',
      '19:00',
      -50, // 50L hilang
      'Daslam'
    );
    const updater = setExpenses.mock.calls[0][0];
    const result: ExpenseRecord[] = updater([]);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('LOSSES_MINYAK');
    expect(result[0].quantity).toBe(50);
    expect(result[0].amount).toBe(50 * 15046); // liter x harga tebus
    expect(result[0].varianceType).toBe('LOSS');
  });

  it('gain (varians positif) membuat entri GAIN_MINYAK, bukan LOSSES_MINYAK', () => {
    const setExpenses = vi.fn();
    syncFuelVarianceToExpenses(makeDeps(setExpenses), 'snd2', 'SOUNDING_TANGKI', '2026-10-15', '19:00', 30, 'Angga');
    const result: ExpenseRecord[] = setExpenses.mock.calls[0][0]([]);
    expect(result[0].category).toBe('GAIN_MINYAK');
    expect(result[0].varianceType).toBe('GAIN');
  });

  it('varians 0 (presisi) MEMBERSIHKAN entri lama, bukan membuat entri baru', () => {
    const setExpenses = vi.fn();
    const existing: ExpenseRecord[] = [
      { id: 'exp-fuel-snd3', date: 'x', time: 'x', category: 'LOSSES_MINYAK', title: 'x', amount: 1, paymentSource: 'KAS_HARIAN', createdAt: 'x', sourceReferenceId: 'snd3' },
    ];
    syncFuelVarianceToExpenses(makeDeps(setExpenses), 'snd3', 'SOUNDING_TANGKI', '2026-10-15', '19:00', 0, 'Daslam');
    const result = setExpenses.mock.calls[0][0](existing);
    expect(result).toHaveLength(0);
  });

  it('dipanggil ulang dengan sourceId yang SAMA memperbarui entri yang ada, bukan menduplikasi', () => {
    const setExpenses = vi.fn();
    const existing: ExpenseRecord[] = [
      { id: 'exp-fuel-snd4', date: '2026-10-14', time: '19:00', category: 'LOSSES_MINYAK', title: 'Lama', amount: 100000, paymentSource: 'KAS_HARIAN', createdAt: 'x', sourceReferenceId: 'snd4' },
    ];
    syncFuelVarianceToExpenses(makeDeps(setExpenses), 'snd4', 'SOUNDING_TANGKI', '2026-10-15', '20:00', -20, 'Daslam');
    const result: ExpenseRecord[] = setExpenses.mock.calls[0][0](existing);
    expect(result).toHaveLength(1); // bukan 2
    expect(result[0].id).toBe('exp-fuel-snd4'); // id dipertahankan, bukan dibuat baru
    expect(result[0].date).toBe('2026-10-15'); // tapi isinya diperbarui
  });

  it('explicitBuyPrice (dari DO Pertamina) dipakai jika diberikan, bukan harga produk default', () => {
    const setExpenses = vi.fn();
    syncFuelVarianceToExpenses(
      makeDeps(setExpenses),
      'do1',
      'PENERIMAAN_DO',
      '2026-10-15',
      '10:00',
      -10,
      'Supplier',
      undefined,
      14000 // harga tebus DO spesifik, beda dari harga produk default (15046)
    );
    const result: ExpenseRecord[] = setExpenses.mock.calls[0][0]([]);
    expect(result[0].unitRate).toBe(14000);
    expect(result[0].amount).toBe(10 * 14000);
  });

  it('judul berbeda untuk sumber PENERIMAAN_DO vs SOUNDING_TANGKI', () => {
    const setExpenses1 = vi.fn();
    syncFuelVarianceToExpenses(makeDeps(setExpenses1), 'do2', 'PENERIMAAN_DO', '2026-10-15', '10:00', -10, 'Supplier');
    const resultDO: ExpenseRecord[] = setExpenses1.mock.calls[0][0]([]);
    expect(resultDO[0].title).toContain('Bongkar DO Pertamina');

    const setExpenses2 = vi.fn();
    syncFuelVarianceToExpenses(makeDeps(setExpenses2), 'snd5', 'SOUNDING_TANGKI', '2026-10-15', '10:00', -10, 'Daslam');
    const resultSounding: ExpenseRecord[] = setExpenses2.mock.calls[0][0]([]);
    expect(resultSounding[0].title).toContain('Losses Minyak Tangki');
  });
});
