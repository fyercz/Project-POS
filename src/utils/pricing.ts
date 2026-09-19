import { Product, PriceHistory, SaleRecord, PurchaseOrder } from '../types';
import { addDays, getTodayDateString, getShiftCategory, formatShortDate } from './formatters';

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Formats YYYY-MM or YYYY-MM-DD to Indonesian month name and year (e.g. "Agustus 2026")
 */
export function formatMonthYearId(dateOrMonth: string): string {
  if (!dateOrMonth) return '';
  const parts = dateOrMonth.split('-');
  if (parts.length < 2) return dateOrMonth;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = MONTH_NAMES_ID[monthIdx] || parts[1];
  return `${monthName} ${year}`;
}

/**
 * Gets effective price (selling price and buy price) for a given date or month.
 * Correctly supports mid-month price adjustments (perubahan tarif pertengahan bulan):
 * 1. If dateStr is a specific date (e.g. "2026-08-15"), checks priceHistory effective on or before that exact date
 * 2. Checks sales recorded on or before that exact date
 * 3. If dateStr is only a month (e.g. "2026-08"), resolves the latest effective price active in that month
 * 4. Fallback to latest available history or product defaults
 */
export function getEffectivePriceForDate(
  productId: string,
  dateStr: string,
  products: Product[],
  priceHistory: PriceHistory[] = [],
  sales: SaleRecord[] = []
): { sellingPrice: number; buyPrice: number; marginPerLiter: number; sourceDesc: string } {
  const product = products.find((p) => p.id === productId) || products[0];
  const defaultSelling = product?.currentPrice || 15850;
  const defaultBuy = product?.buyPrice || 15046;
  const defaultMargin = defaultSelling - defaultBuy;

  if (!dateStr) {
    return {
      sellingPrice: defaultSelling,
      buyPrice: defaultBuy,
      marginPerLiter: defaultMargin,
      sourceDesc: 'Tarif Dasar Produk',
    };
  }

  const isFullDate = dateStr.length >= 10;
  const targetMonth = dateStr.substring(0, 7); // e.g. "2026-08"
  const monthLabel = formatMonthYearId(targetMonth);

  // 1. SPECIFIC DATE QUERY: Check latest price in priceHistory effective ON or BEFORE dateStr
  if (isFullDate) {
    const endOfDay = dateStr.length === 10 ? `${dateStr} 23:59` : dateStr;
    const applicableHistory = (priceHistory || [])
      .filter((h) => h.productId === productId && h.effectiveDate <= endOfDay)
      .sort((a, b) => {
        const cmp = b.effectiveDate.localeCompare(a.effectiveDate);
        if (cmp !== 0) return cmp;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });

    // Also check sales on or before dateStr
    const applicableSales = (sales || [])
      .filter((s) => s.productId === productId && s.transactionDate <= dateStr.substring(0, 10) && s.unitPrice > 0)
      .sort((a, b) => {
        const cmp = b.transactionDate.localeCompare(a.transactionDate);
        if (cmp !== 0) return cmp;
        return (b.time || '').localeCompare(a.time || '');
      });

    if (applicableHistory.length > 0 && applicableSales.length > 0) {
      const histDate = applicableHistory[0].effectiveDate.substring(0, 10);
      const saleDate = applicableSales[0].transactionDate;

      // If sale recorded on that exact date with custom pricing, or after the latest price history
      if (saleDate > histDate) {
        const s = applicableSales[0];
        const buyPrice = s.buyPriceSnapshot || applicableHistory[0].newBuyPrice || defaultBuy;
        return {
          sellingPrice: s.unitPrice,
          buyPrice,
          marginPerLiter: s.unitPrice - buyPrice,
          sourceDesc: `Input Penjualan ${formatShortDate(s.transactionDate)}`,
        };
      } else {
        const h = applicableHistory[0];
        const isMidMonth = parseInt(h.effectiveDate.substring(8, 10), 10) > 1;
        return {
          sellingPrice: h.newPrice,
          buyPrice: h.newBuyPrice,
          marginPerLiter: h.marginPerLiter || h.newPrice - h.newBuyPrice,
          sourceDesc: isMidMonth
            ? `Tarif Pertengahan Bulan (per ${formatShortDate(h.effectiveDate.substring(0, 10))})`
            : `Tarif per ${formatShortDate(h.effectiveDate.substring(0, 10))}`,
        };
      }
    } else if (applicableHistory.length > 0) {
      const h = applicableHistory[0];
      const isMidMonth = parseInt(h.effectiveDate.substring(8, 10), 10) > 1;
      return {
        sellingPrice: h.newPrice,
        buyPrice: h.newBuyPrice,
        marginPerLiter: h.marginPerLiter || h.newPrice - h.newBuyPrice,
        sourceDesc: isMidMonth
          ? `Tarif Pertengahan Bulan (per ${formatShortDate(h.effectiveDate.substring(0, 10))})`
          : `Tarif per ${formatShortDate(h.effectiveDate.substring(0, 10))}`,
      };
    } else if (applicableSales.length > 0) {
      const s = applicableSales[0];
      const buyPrice = s.buyPriceSnapshot || defaultBuy;
      return {
        sellingPrice: s.unitPrice,
        buyPrice,
        marginPerLiter: s.unitPrice - buyPrice,
        sourceDesc: `Input Penjualan ${formatShortDate(s.transactionDate)}`,
      };
    }
  }

  // 2. MONTH-ONLY QUERY (e.g. "2026-08") or fallback for same month:
  const monthEntries = (priceHistory || []).filter(
    (h) => h.productId === productId && h.effectiveDate.startsWith(targetMonth)
  );

  if (monthEntries.length > 0) {
    const sorted = [...monthEntries].sort((a, b) => {
      const cmp = b.effectiveDate.localeCompare(a.effectiveDate);
      if (cmp !== 0) return cmp;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    const latestMonthEntry = sorted[0];
    const isMidMonth = parseInt(latestMonthEntry.effectiveDate.substring(8, 10), 10) > 1;
    return {
      sellingPrice: latestMonthEntry.newPrice,
      buyPrice: latestMonthEntry.newBuyPrice,
      marginPerLiter: latestMonthEntry.marginPerLiter || latestMonthEntry.newPrice - latestMonthEntry.newBuyPrice,
      sourceDesc: isMidMonth
        ? `Tarif ${monthLabel} (per ${formatShortDate(latestMonthEntry.effectiveDate.substring(0, 10))})`
        : `Tarif ${monthLabel}`,
    };
  }

  // Check exact month match in sales for this product
  const monthSales = (sales || []).filter(
    (s) => s.productId === productId && s.transactionDate.startsWith(targetMonth) && s.unitPrice > 0
  );

  if (monthSales.length > 0) {
    const sorted = [...monthSales].sort((a, b) => {
      const cmp = b.transactionDate.localeCompare(a.transactionDate);
      if (cmp !== 0) return cmp;
      return (b.time || '').localeCompare(a.time || '');
    });
    const latestSale = sorted[0];
    const buyPrice = latestSale.buyPriceSnapshot || defaultBuy;
    return {
      sellingPrice: latestSale.unitPrice,
      buyPrice,
      marginPerLiter: latestSale.unitPrice - buyPrice,
      sourceDesc: `Input Penjualan ${monthLabel}`,
    };
  }

  // 3. Fallback to latest priceHistory overall
  if (priceHistory && priceHistory.length > 0) {
    const latestHist = [...priceHistory]
      .filter((h) => h.productId === productId)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (latestHist) {
      return {
        sellingPrice: latestHist.newPrice,
        buyPrice: latestHist.newBuyPrice,
        marginPerLiter: latestHist.marginPerLiter || latestHist.newPrice - latestHist.newBuyPrice,
        sourceDesc: `Tarif Terakhir Diinput (${formatShortDate(latestHist.effectiveDate.substring(0, 10))})`,
      };
    }
  }

  // 4. Fallback to latest sale recorded overall
  if (sales && sales.length > 0) {
    const latestSale = [...sales]
      .filter((s) => s.productId === productId && s.unitPrice > 0)
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0];
    if (latestSale) {
      const buyPrice = latestSale.buyPriceSnapshot || defaultBuy;
      return {
        sellingPrice: latestSale.unitPrice,
        buyPrice,
        marginPerLiter: latestSale.unitPrice - buyPrice,
        sourceDesc: `Input Penjualan Terakhir (${formatShortDate(latestSale.transactionDate)})`,
      };
    }
  }

  return {
    sellingPrice: defaultSelling,
    buyPrice: defaultBuy,
    marginPerLiter: defaultMargin,
    sourceDesc: 'Tarif Standar',
  };
}

/**
 * Returns any mid-month price adjustments (effective date after day 1) in a given month.
 */
export function getMidMonthPriceChanges(
  productId: string,
  targetMonth: string,
  priceHistory: PriceHistory[] = []
): PriceHistory[] {
  return (priceHistory || [])
    .filter((h) => {
      if (h.productId !== productId) return false;
      if (!h.effectiveDate.startsWith(targetMonth)) return false;
      const day = parseInt(h.effectiveDate.substring(8, 10), 10);
      return day > 1;
    })
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}

/**
 * Checks whether a given month has mid-month price changes for a product.
 */
export function hasMidMonthPriceChange(
  productId: string,
  targetMonth: string,
  priceHistory: PriceHistory[] = []
): boolean {
  return getMidMonthPriceChanges(productId, targetMonth, priceHistory).length > 0;
}

/**
 * Recalculates a single sale record given new selling price and buy price
 */
export function recalculateSaleWithPrice(
  sale: SaleRecord,
  newSellingPrice: number,
  newBuyPrice: number
): SaleRecord {
  const newRevenue = Math.round(sale.literSold * newSellingPrice);
  const newProfit = Math.round(sale.literSold * (newSellingPrice - newBuyPrice));
  const nonCash = (sale.paymentQris || 0) + (sale.paymentEdc || 0);
  const newExpectedCash = Math.max(0, newRevenue - nonCash);
  const prevDiff = sale.cashDifference || 0;

  return {
    ...sale,
    unitPrice: newSellingPrice,
    buyPriceSnapshot: newBuyPrice,
    totalRevenue: newRevenue,
    totalProfit: newProfit,
    paymentCash: newExpectedCash,
    actualCashInHand: newExpectedCash + prevDiff,
  };
}

/**
 * Recalculates a single purchase order given new buy price
 */
export function recalculatePurchaseWithPrice(
  purchase: PurchaseOrder,
  newBuyPrice: number
): PurchaseOrder {
  const newTotal = Math.round(purchase.volumeLiters * newBuyPrice);
  return {
    ...purchase,
    buyPricePerLiter: newBuyPrice,
    totalAmount: newTotal,
  };
}

/**
 * Retrieves the buy price from the last purchase order (history terakhir pembelian).
 * Searches purchases matching productId (sorted by orderDate desc, createdAt desc).
 */
export function getLatestPurchaseBuyPrice(
  productId: string,
  purchases: PurchaseOrder[] = [],
  fallbackPrice: number = 12100,
  onOrBeforeDate?: string
): {
  buyPrice: number;
  lastPoNumber?: string;
  lastPoDate?: string;
  hasHistory: boolean;
  volumeKL?: number;
} {
  const matching = (purchases || []).filter(
    (p) =>
      p.productId === productId &&
      p.buyPricePerLiter > 0 &&
      (!onOrBeforeDate || (p.orderDate && p.orderDate <= onOrBeforeDate))
  );

  if (matching.length > 0) {
    const sorted = [...matching].sort((a, b) => {
      const cmp = (b.orderDate || '').localeCompare(a.orderDate || '');
      if (cmp !== 0) return cmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const latest = sorted[0];
    return {
      buyPrice: latest.buyPricePerLiter,
      lastPoNumber: latest.poNumber,
      lastPoDate: latest.orderDate,
      hasHistory: true,
      volumeKL: latest.volumeKL,
    };
  }

  return {
    buyPrice: fallbackPrice,
    hasHistory: false,
  };
}

/**
 * Determines the next date, shift, and operator for Sales Entry based on previous inputs:
 * "pada input tanggal, apabila akan input tanggal lagi sesuaikan dengan tanggal terakhir yang telah diinput setelahnya, bukan tanggal saat ini"
 */
export function getNextSalesInputDateAndShift(
  sales: SaleRecord[] = [],
  lastInputtedDate?: string | null,
  operatorList: string[] = ['Daslam', 'Angga']
): {
  targetDate: string;
  targetShift: 'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day';
  targetTime: string;
  suggestedOperator: string;
  sourceDesc: string;
} {
  const checkDateStatus = (dateStr: string) => {
    const salesOnDate = sales.filter((s) => s.transactionDate === dateStr);
    const hasS1 = salesOnDate.some((s) => getShiftCategory(s.shift) === 'shift1');
    const hasS2 = salesOnDate.some((s) => getShiftCategory(s.shift) === 'shift2');
    const hasFD = salesOnDate.some((s) => getShiftCategory(s.shift) === 'fullday');
    const isFull = hasFD || (hasS1 && hasS2);
    const takenOps = salesOnDate.map((s) => s.operatorName.trim().toLowerCase());
    return { hasS1, hasS2, hasFD, isFull, takenOps };
  };

  // Determine candidate date
  let candidateDate: string | null = null;
  let sourceDesc = '';

  if (lastInputtedDate) {
    candidateDate = lastInputtedDate;
    sourceDesc = `Lanjutan dari input terakhir (${lastInputtedDate})`;
  } else if (sales.length > 0) {
    const sortedDates = [...sales].map((s) => s.transactionDate).sort().reverse();
    candidateDate = sortedDates[0];
    sourceDesc = `Menyesuaikan riwayat transaksi terakhir (${candidateDate})`;
  }

  if (!candidateDate) {
    return {
      targetDate: getTodayDateString(),
      targetShift: 'Shift 1 (05.30 - 13.30)',
      targetTime: '13:30',
      suggestedOperator: operatorList[0] || 'Daslam',
      sourceDesc: 'Tanggal saat ini (Belum ada riwayat input)',
    };
  }

  let status = checkDateStatus(candidateDate);
  let finalDate = candidateDate;

  if (status.isFull) {
    // Both shifts (or Full Day) are already taken on candidateDate!
    // Move to the next day ("tanggal terakhir yang telah diinput setelahnya")
    let nextDate = addDays(candidateDate, 1);
    let attempts = 0;
    while (attempts < 365) {
      const nextStatus = checkDateStatus(nextDate);
      if (!nextStatus.isFull) {
        finalDate = nextDate;
        status = nextStatus;
        break;
      }
      nextDate = addDays(nextDate, 1);
      attempts++;
    }
    sourceDesc = `Tanggal setelah input terakhir (${finalDate})`;
  }

  let finalShift: 'Shift 1 (05.30 - 13.30)' | 'Shift 2 (13.30 - 19.30)' | 'Full Day' = 'Shift 1 (05.30 - 13.30)';
  if (!status.hasS1 && !status.hasFD) {
    finalShift = 'Shift 1 (05.30 - 13.30)';
  } else if (!status.hasS2 && !status.hasFD) {
    finalShift = 'Shift 2 (13.30 - 19.30)';
  } else if (!status.hasFD && !status.hasS1 && !status.hasS2) {
    finalShift = 'Full Day';
  }

  const availableOp = operatorList.find((op) => !status.takenOps.includes(op.toLowerCase()));
  const finalOp = availableOp || operatorList[0] || 'Daslam';
  const targetTime = finalShift.includes('Shift 2') || finalShift.includes('Full') ? '19:30' : '13:30';

  return {
    targetDate: finalDate,
    targetShift: finalShift,
    targetTime,
    suggestedOperator: finalOp,
    sourceDesc,
  };
}

/**
 * Determines the next date for Purchase Order based on previous PO inputs:
 * "pada input tanggal, apabila akan input tanggal lagi sesuaikan dengan tanggal terakhir yang telah diinput setelahnya, bukan tanggal saat ini"
 */
export function getNextPurchaseOrderDate(
  purchases: PurchaseOrder[] = [],
  sales: SaleRecord[] = [],
  lastInputtedOrderDate?: string | null
): {
  targetOrderDate: string;
  sourceDesc: string;
} {
  let candidateDate: string | null = null;
  let sourceDesc = '';

  if (lastInputtedOrderDate) {
    candidateDate = lastInputtedOrderDate;
    sourceDesc = `Lanjutan dari input PO terakhir (${lastInputtedOrderDate})`;
  } else if (purchases.length > 0) {
    const sortedDates = [...purchases].map((p) => p.orderDate).sort().reverse();
    candidateDate = sortedDates[0];
    sourceDesc = `Menyesuaikan riwayat PO terakhir (${candidateDate})`;
  } else if (sales.length > 0) {
    const sortedDates = [...sales].map((s) => s.transactionDate).sort().reverse();
    candidateDate = sortedDates[0];
    sourceDesc = `Menyesuaikan tanggal operasional aktif (${candidateDate})`;
  }

  if (!candidateDate) {
    return {
      targetOrderDate: getTodayDateString(),
      sourceDesc: 'Tanggal saat ini (Belum ada riwayat PO)',
    };
  }

  // If candidateDate already has a PO, advance to the date after it
  let finalDate = candidateDate;
  if (purchases.some((p) => p.orderDate === candidateDate)) {
    finalDate = addDays(candidateDate, 1);
    sourceDesc = `Tanggal setelah PO terakhir (${finalDate})`;
  }

  return {
    targetOrderDate: finalDate,
    sourceDesc,
  };
}

/**
 * Mode keterkaitan variabel perubahan harga Pertashop:
 * - LOCK_MARGIN: Kunci margin dealer (Harga jual naik -> harga tebus otomatis naik, menjaga margin tetap)
 * - LOCK_BUY_PRICE: Kunci harga tebus Pertamina (Harga jual naik -> margin bertambah)
 * - LOCK_SELLING_PRICE: Kunci harga jual konsumen (Harga tebus naik -> margin berkurang)
 * - FREE: Input bebas tanpa penguncian kaku
 */
export type PriceLinkMode = 'LOCK_MARGIN' | 'LOCK_BUY_PRICE' | 'LOCK_SELLING_PRICE' | 'FREE';

export interface InterconnectedPriceState {
  sellingPrice: number;
  buyPrice: number;
  margin: number;
  marginPercent: number;
  linkMode: PriceLinkMode;
}

export const PERTASHOP_STANDARD_MARGINS = [
  { label: 'Rp 804 (Reguler)', value: 804, desc: 'Margin standar Pertamax reguler (Rp 804/L)' },
  { label: 'Rp 800', value: 800, desc: 'Margin fluktuatif Rp 800/L' },
  { label: 'Rp 805', value: 805, desc: 'Margin fluktuatif Rp 805/L' },
  { label: 'Rp 810', value: 810, desc: 'Margin fluktuatif Rp 810/L' },
  { label: 'Rp 850', value: 850, desc: 'Penyalur Gold / Diamond (Rp 850/L)' },
  { label: 'Rp 1.000', value: 1000, desc: 'Skema insentif kuota (Rp 1.000/L)' },
  { label: 'Rp 1.200', value: 1200, desc: 'Skema ekspansi operasional (Rp 1.200/L)' },
];

/**
 * Menghitung kesinambungan antar ketiga variabel (Harga Jual, Harga Tebus, Margin)
 * saat salah satu variabel diubah oleh pengguna.
 * Bebas input berapa pun (angka desimal, ganjil, fluktuatif tanpa batasan 800-810).
 */
export function calculateInterconnectedPrices(
  changedField: 'sellingPrice' | 'buyPrice' | 'margin',
  value: number,
  currentState: { sellingPrice: number; buyPrice: number; margin: number; linkMode: PriceLinkMode },
  marginTarget: 'ADJUST_BUY' | 'ADJUST_SELLING' = 'ADJUST_BUY'
): { sellingPrice: number; buyPrice: number; margin: number; marginPercent: number } {
  let { sellingPrice, buyPrice, margin, linkMode } = currentState;

  if (changedField === 'sellingPrice') {
    sellingPrice = Math.max(0, value);
    if (linkMode === 'LOCK_MARGIN') {
      // Margin tetap -> sesuaikan harga tebus
      buyPrice = Math.max(0, Math.round((sellingPrice - margin) * 10000) / 10000);
    } else {
      // Bebas / tidak terkunci: harga tebus tetap, margin dihitung dinamis
      margin = Math.round((sellingPrice - buyPrice) * 10000) / 10000;
    }
  } else if (changedField === 'buyPrice') {
    buyPrice = Math.max(0, value);
    if (linkMode === 'LOCK_MARGIN') {
      // Margin tetap -> sesuaikan harga jual
      sellingPrice = Math.max(0, Math.round((buyPrice + margin) * 10000) / 10000);
    } else {
      // Bebas / tidak terkunci: harga jual tetap, margin dihitung dinamis
      margin = Math.round((sellingPrice - buyPrice) * 10000) / 10000;
    }
  } else if (changedField === 'margin') {
    margin = value;
    if (linkMode === 'LOCK_BUY_PRICE' || marginTarget === 'ADJUST_SELLING') {
      // Harga tebus dijaga tetap -> sesuaikan harga jual
      sellingPrice = Math.max(0, Math.round((buyPrice + margin) * 10000) / 10000);
    } else {
      // Default / Rekomendasi Pertashop: Harga jual konsumen tetap -> sesuaikan harga tebus
      buyPrice = Math.max(0, Math.round((sellingPrice - margin) * 10000) / 10000);
    }
  }

  const marginPercent = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

  return {
    sellingPrice,
    buyPrice,
    margin,
    marginPercent,
  };
}

export const PERTASHOP_RECOMMENDED_MARGIN_RANGE = {
  min: 800,
  max: 1000,
  regulerStandard: 804,
  label: 'Rp 800 - Rp 1.000/L',
};

export type MarginRecommendationStatus =
  | 'CRITICAL_DEFICIT'
  | 'ZERO'
  | 'BELOW_STANDARD'
  | 'WITHIN_STANDARD'
  | 'ABOVE_STANDARD';

export interface MarginRecommendationInfo {
  status: MarginRecommendationStatus;
  isWithinStandard: boolean;
  badgeLabel: string;
  badgeClass: string;
  title: string;
  message: string;
  recommendationNote: string;
}

export function getMarginRecommendationStatus(margin: number): MarginRecommendationInfo {
  if (margin < 0) {
    return {
      status: 'CRITICAL_DEFICIT',
      isWithinStandard: false,
      badgeLabel: 'Margin Defisit / Minus',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Peringatan Kritis: Margin Defisit / Negatif',
      message: `Margin saat ini minus (Rp ${margin.toLocaleString('id-ID')}/L). Harga jual lebih rendah dari harga tebus Pertamina sehingga setiap liter BBM yang terjual akan menimbulkan kerugian langsung.`,
      recommendationNote: 'Segera sesuaikan harga jual lebih tinggi dari harga tebus agar operasional tidak merugi.',
    };
  }

  if (margin === 0) {
    return {
      status: 'ZERO',
      isWithinStandard: false,
      badgeLabel: 'Margin Rp 0 (Tanpa Laba)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Peringatan: Margin Rp 0 / Liter',
      message: 'Harga jual sama persis dengan harga tebus. Pertashop tidak menghasilkan laba kotor sama sekali untuk menutup beban operasional.',
      recommendationNote: 'Pastikan memasukkan margin yang memadai untuk menutup biaya gaji, losses, dan listrik.',
    };
  }

  if (margin < PERTASHOP_RECOMMENDED_MARGIN_RANGE.min) {
    return {
      status: 'BELOW_STANDARD',
      isWithinStandard: false,
      badgeLabel: 'Di Bawah Rekomendasi (< Rp 800/L)',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      title: 'Peringatan: Margin di Bawah Rekomendasi Standar (< Rp 800/L)',
      message: `Margin saat ini (Rp ${margin.toLocaleString('id-ID')}/L) berada di bawah kisaran rekomendasi standar Pertamina (${PERTASHOP_RECOMMENDED_MARGIN_RANGE.label}). Margin rendah berisiko menekan profitabilitas dan mempersulit pencapaian titik impas (BEP) harian operasional Pertashop.`,
      recommendationNote: 'Anda tetap dapat menyimpan margin ini jika merupakan kebijakan khusus atau diskon operasional.',
    };
  }

  if (margin > PERTASHOP_RECOMMENDED_MARGIN_RANGE.max) {
    return {
      status: 'ABOVE_STANDARD',
      isWithinStandard: false,
      badgeLabel: 'Di Atas Standar Umum (> Rp 1.000/L)',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      title: 'Perhatian: Margin di Atas Kisaran Standar Umum (> Rp 1.000/L)',
      message: `Margin saat ini (Rp ${margin.toLocaleString('id-ID')}/L) melebihi kisaran standar umum Pertashop reguler (${PERTASHOP_RECOMMENDED_MARGIN_RANGE.label}). Pastikan margin ini telah sesuai dengan SK penetapan harga resmi atau skema target kuota khusus.`,
      recommendationNote: 'Anda tetap dapat menyimpan margin ini sesuai kebutuhan penetapan harga yang Anda rencanakan.',
    };
  }

  return {
    status: 'WITHIN_STANDARD',
    isWithinStandard: true,
    badgeLabel: 'Sesuai Rekomendasi Standar',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    title: 'Margin Sesuai Rekomendasi Standar',
    message: `Margin Rp ${margin.toLocaleString('id-ID')}/L berada dalam rentang ideal rekomendasi operasional Pertashop (${PERTASHOP_RECOMMENDED_MARGIN_RANGE.label}). Estimasi profitabilitas dan arus kas sehat.`,
    recommendationNote: 'Margin standar reguler Pertamax Pertashop adalah Rp 804/L.',
  };
}

/**
 * Menerapkan penyesuaian delta serentak secara berkesinambungan (misal +Rp 500, +Rp 1, -Rp 25, dst)
 * Mendukung angka desimal dan tidak membatasi batas minimum kaku.
 */
export function applyPriceDelta(
  delta: number,
  currentState: { sellingPrice: number; buyPrice: number; margin: number; linkMode: PriceLinkMode }
): { sellingPrice: number; buyPrice: number; margin: number; marginPercent: number } {
  const { sellingPrice, buyPrice, margin, linkMode } = currentState;

  if (linkMode === 'LOCK_MARGIN') {
    // Keduanya naik/turun bersamaan, margin tetap persis sama
    const nextSelling = Math.max(0, Math.round((sellingPrice + delta) * 10000) / 10000);
    const nextBuy = Math.max(0, Math.round((buyPrice + delta) * 10000) / 10000);
    const nextMargin = Math.round((nextSelling - nextBuy) * 10000) / 10000;
    const marginPercent = nextSelling > 0 ? (nextMargin / nextSelling) * 100 : 0;
    return {
      sellingPrice: nextSelling,
      buyPrice: nextBuy,
      margin: nextMargin,
      marginPercent,
    };
  } else if (linkMode === 'LOCK_BUY_PRICE') {
    const nextSelling = Math.max(0, Math.round((sellingPrice + delta) * 10000) / 10000);
    const nextMargin = Math.round((nextSelling - buyPrice) * 10000) / 10000;
    const marginPercent = nextSelling > 0 ? (nextMargin / nextSelling) * 100 : 0;
    return {
      sellingPrice: nextSelling,
      buyPrice,
      margin: nextMargin,
      marginPercent,
    };
  } else if (linkMode === 'LOCK_SELLING_PRICE') {
    const nextBuy = Math.max(0, Math.round((buyPrice + delta) * 10000) / 10000);
    const nextMargin = Math.round((sellingPrice - nextBuy) * 10000) / 10000;
    const marginPercent = sellingPrice > 0 ? (nextMargin / sellingPrice) * 100 : 0;
    return {
      sellingPrice,
      buyPrice: nextBuy,
      margin: nextMargin,
      marginPercent,
    };
  } else {
    // FREE: Ubah harga jual dan hitung margin secara fleksibel
    const nextSelling = Math.max(0, Math.round((sellingPrice + delta) * 10000) / 10000);
    const nextMargin = Math.round((nextSelling - buyPrice) * 10000) / 10000;
    const marginPercent = nextSelling > 0 ? (nextMargin / nextSelling) * 100 : 0;
    return {
      sellingPrice: nextSelling,
      buyPrice,
      margin: nextMargin,
      marginPercent,
    };
  }
}

