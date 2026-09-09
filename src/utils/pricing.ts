import { Product, PriceHistory, SaleRecord, PurchaseOrder } from '../types';
import { addDays, getTodayDateString, getShiftCategory } from './formatters';

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
 * Automatically resolves the latest inputted price by checking:
 * 1. Exact month match in priceHistory (latest in that month)
 * 2. Exact month match in existing sales (latest in that month)
 * 3. Latest price in priceHistory effective on or before dateStr
 * 4. Latest sale on or before dateStr
 * 5. Latest priceHistory overall (most recently updated)
 * 6. Latest sale recorded overall
 * 7. Product default currentPrice / buyPrice
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

  const targetMonth = dateStr.substring(0, 7); // e.g. "2026-08"
  const monthLabel = formatMonthYearId(targetMonth);

  // 1. Check exact month match in priceHistory for this product
  const monthEntries = (priceHistory || []).filter(
    (h) => h.productId === productId && h.effectiveDate.startsWith(targetMonth)
  );

  if (monthEntries.length > 0) {
    const sorted = [...monthEntries].sort((a, b) => {
      const cmp = b.effectiveDate.localeCompare(a.effectiveDate);
      if (cmp !== 0) return cmp;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    return {
      sellingPrice: sorted[0].newPrice,
      buyPrice: sorted[0].newBuyPrice,
      marginPerLiter: sorted[0].marginPerLiter || sorted[0].newPrice - sorted[0].newBuyPrice,
      sourceDesc: `Tarif ${monthLabel}`,
    };
  }

  // 2. Check exact month match in sales for this product
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

  // 3. Check latest price effective on or before dateStr from priceHistory
  const applicableHistory = (priceHistory || [])
    .filter((h) => h.productId === productId && h.effectiveDate <= `${dateStr} 23:59`)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

  // 4. Check latest sale on or before dateStr
  const applicableSales = (sales || [])
    .filter((s) => s.productId === productId && s.transactionDate <= dateStr && s.unitPrice > 0)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  if (applicableHistory.length > 0 && applicableSales.length > 0) {
    const histDate = applicableHistory[0].effectiveDate.substring(0, 10);
    const saleDate = applicableSales[0].transactionDate;
    if (saleDate > histDate) {
      const s = applicableSales[0];
      const buyPrice = s.buyPriceSnapshot || applicableHistory[0].newBuyPrice || defaultBuy;
      return {
        sellingPrice: s.unitPrice,
        buyPrice,
        marginPerLiter: s.unitPrice - buyPrice,
        sourceDesc: `Input Penjualan ${s.transactionDate}`,
      };
    } else {
      const h = applicableHistory[0];
      return {
        sellingPrice: h.newPrice,
        buyPrice: h.newBuyPrice,
        marginPerLiter: h.marginPerLiter || h.newPrice - h.newBuyPrice,
        sourceDesc: `Tarif per ${h.effectiveDate.substring(0, 10)}`,
      };
    }
  } else if (applicableHistory.length > 0) {
    const h = applicableHistory[0];
    return {
      sellingPrice: h.newPrice,
      buyPrice: h.newBuyPrice,
      marginPerLiter: h.marginPerLiter || h.newPrice - h.newBuyPrice,
      sourceDesc: `Tarif per ${h.effectiveDate.substring(0, 10)}`,
    };
  } else if (applicableSales.length > 0) {
    const s = applicableSales[0];
    const buyPrice = s.buyPriceSnapshot || defaultBuy;
    return {
      sellingPrice: s.unitPrice,
      buyPrice,
      marginPerLiter: s.unitPrice - buyPrice,
      sourceDesc: `Input Penjualan ${s.transactionDate}`,
    };
  }

  // 5. If dateStr is before all entries or no prior entries, check latest entry in priceHistory overall
  if (priceHistory && priceHistory.length > 0) {
    const latestHist = [...priceHistory]
      .filter((h) => h.productId === productId)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (latestHist) {
      return {
        sellingPrice: latestHist.newPrice,
        buyPrice: latestHist.newBuyPrice,
        marginPerLiter: latestHist.marginPerLiter || latestHist.newPrice - latestHist.newBuyPrice,
        sourceDesc: `Tarif Terakhir Diinput (${latestHist.effectiveDate.substring(0, 10)})`,
      };
    }
  }

  // 6. Any sale recorded at all
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
        sourceDesc: `Input Penjualan Terakhir (${latestSale.transactionDate})`,
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
  fallbackPrice: number = 12100
): {
  buyPrice: number;
  lastPoNumber?: string;
  lastPoDate?: string;
  hasHistory: boolean;
  volumeKL?: number;
} {
  const matching = (purchases || []).filter(
    (p) => p.productId === productId && p.buyPricePerLiter > 0
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

  return {
    targetDate: finalDate,
    targetShift: finalShift,
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

