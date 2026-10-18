import { describe, it, expect } from 'vitest';
import { recalculateSaleWithPrice } from '../../src/utils/pricing';
import type { SaleRecord } from '../../src/types';

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 's1',
    transactionDate: '2026-10-01',
    time: '13:30',
    shift: 'Shift 1 (05.30 - 13.30)',
    operatorName: 'Daslam',
    productId: 'prod-1',
    productName: 'Pertamax',
    literSold: 100,
    unitPrice: 15000, // harga lama / salah ketik
    buyPriceSnapshot: 14200,
    totalRevenue: 1500000,
    totalProfit: 80000,
    paymentCash: 1500000, // uang FISIK yang sudah disetor kasir - FAKTA historis
    paymentQris: 0,
    paymentEdc: 0,
    actualCashInHand: 1500000,
    cashDifference: 0,
    notes: '',
    createdAt: '2026-10-01 13:31',
    ...overrides,
  } as SaleRecord;
}

// Bug nyata: mengoreksi harga jual/beli di bulan yang sudah lewat sempat ikut
// MENULIS ULANG paymentCash/actualCashInHand, seolah kasir menyetor uang yang
// berbeda dari yang sebenarnya terjadi. Ini test regresi untuk memastikan
// koreksi harga HANYA mengubah angka "buku" (omset & laba), tidak pernah
// menyentuh fakta kas fisik yang sudah dicatat.
describe('recalculateSaleWithPrice', () => {
  it('mengubah omset & laba sesuai harga baru', () => {
    const sale = makeSale();
    const updated = recalculateSaleWithPrice(sale, 15850, 15046);

    expect(updated.unitPrice).toBe(15850);
    expect(updated.buyPriceSnapshot).toBe(15046);
    expect(updated.totalRevenue).toBe(100 * 15850);
    expect(updated.totalProfit).toBe(100 * (15850 - 15046));
  });

  it('TIDAK PERNAH mengubah paymentCash, paymentQris, paymentEdc, actualCashInHand, atau cashDifference', () => {
    const sale = makeSale({ paymentCash: 1200000, paymentQris: 300000, paymentEdc: 0, actualCashInHand: 1200000, cashDifference: -5000 });
    const updated = recalculateSaleWithPrice(sale, 99999, 88888); // harga baru yang jauh berbeda

    expect(updated.paymentCash).toBe(1200000);
    expect(updated.paymentQris).toBe(300000);
    expect(updated.paymentEdc).toBe(0);
    expect(updated.actualCashInHand).toBe(1200000);
    expect(updated.cashDifference).toBe(-5000);
  });

  it('field lain (shift, operator, tanggal) tidak ikut berubah', () => {
    const sale = makeSale();
    const updated = recalculateSaleWithPrice(sale, 16000, 15200);
    expect(updated.id).toBe(sale.id);
    expect(updated.transactionDate).toBe(sale.transactionDate);
    expect(updated.operatorName).toBe(sale.operatorName);
    expect(updated.literSold).toBe(sale.literSold);
  });
});
