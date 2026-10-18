import type { Dispatch, SetStateAction } from 'react';
import { Product, PriceHistory, SaleRecord, ExpenseRecord, ExpenseCategoryType } from '../types';
import { getEffectivePriceForDate } from './pricing';
import { formatNumber } from './formatters';

/**
 * Diekstrak dari App.tsx sebagai bagian dari rekomendasi #7 di docs/REKOMENDASI_ARSITEKTUR.md.
 *
 * BUKAN bagian dari satu domain tertentu - fungsi ini GENUINELY DIPAKAI BERSAMA oleh TIGA
 * domain berbeda (ditemukan lewat pencarian seluruh pemanggilannya sebelum memindahkan domain
 * Sounding): Penjualan (sounding closing shift), Penerimaan DO Pertamina, dan Sounding Tangki
 * manual. Karena itu diekstrak SENDIRI sebagai utilitas bersama di sini, BUKAN digandakan ke
 * salah satu hook domain (yang akan berisiko membuat salinannya makin lama makin berbeda,
 * persis kelas bug yang sudah beberapa kali terjadi di proyek ini untuk logika terduplikasi).
 *
 * Mencatat/memperbarui/menghapus SATU entri beban losses/gain BBM di pembukuan, terkait ke
 * satu sumber (sounding/DO/closing shift) lewat sourceReferenceId - dipanggil ulang dengan
 * sourceId yang sama akan MEMPERBARUI entri yang sudah ada, bukan membuat duplikat.
 */
export function syncFuelVarianceToExpenses(
  deps: {
    products: Product[];
    priceHistory: PriceHistory[];
    sales: SaleRecord[];
    setExpenses: Dispatch<SetStateAction<ExpenseRecord[]>>;
  },
  sourceId: string,
  sourceType: 'SOUNDING_TANGKI' | 'PENERIMAAN_DO' | 'CLOSING_SHIFT',
  date: string,
  time: string,
  varianceLiters: number,
  operatorOrVendor: string,
  notes?: string,
  explicitBuyPrice?: number
): void {
  const { products, priceHistory, sales, setExpenses } = deps;

  // Jika selisih 0 L (presisi), bersihkan entri pembukuan terkait jika sebelumnya ada
  if (Math.abs(varianceLiters) < 0.001) {
    setExpenses((prev) => prev.filter((e) => e.sourceReferenceId !== sourceId));
    return;
  }

  const primaryProduct = products.find((p) => p.id === 'prod-pertamax-92') || products[0];
  const absVariance = Math.abs(varianceLiters);
  const eff = getEffectivePriceForDate('prod-pertamax-92', date, products, priceHistory, sales);
  const buyPrice = explicitBuyPrice || eff.buyPrice || primaryProduct.buyPrice || 12100;
  const totalAmount = Math.round(absVariance * buyPrice);
  const isLoss = varianceLiters < 0;

  const category: ExpenseCategoryType = isLoss ? 'LOSSES_MINYAK' : 'GAIN_MINYAK';
  const title =
    sourceType === 'PENERIMAAN_DO'
      ? isLoss
        ? `Beban Susut Bongkar DO Pertamina (${formatNumber(absVariance, 1)} L)`
        : `Surplus Penerimaan DO Pertamina (+${formatNumber(absVariance, 1)} L)`
      : isLoss
      ? `Beban Losses Minyak Tangki (${formatNumber(absVariance, 1)} L)`
      : `Surplus / Gain Stok BBM Tangki (+${formatNumber(absVariance, 1)} L)`;

  setExpenses((prev) => {
    const existingIndex = prev.findIndex((e) => e.sourceReferenceId === sourceId);
    const expenseItem: ExpenseRecord = {
      id: existingIndex >= 0 ? prev[existingIndex].id : `exp-fuel-${sourceId}`,
      date,
      time,
      category,
      title,
      amount: totalAmount,
      quantity: absVariance,
      unitRate: buyPrice,
      fuelLossLiters: absVariance,
      fuelLossBuyPriceSnapshot: buyPrice,
      personOrVendor: operatorOrVendor,
      paymentSource: 'KAS_HARIAN',
      notes: notes || `Otomatis dari selisih BBM (${varianceLiters > 0 ? `+${varianceLiters}` : varianceLiters} L)`,
      createdAt: `${date} ${time}`,
      sourceReferenceId: sourceId,
      sourceType,
      varianceType: isLoss ? 'LOSS' : 'GAIN',
    };

    if (existingIndex >= 0) {
      const copy = [...prev];
      copy[existingIndex] = expenseItem;
      return copy;
    } else {
      return [expenseItem, ...prev];
    }
  });
}
