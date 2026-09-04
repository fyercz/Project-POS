import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  Fuel,
  Receipt,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  PertashopProfile,
  SaleRecord,
  PurchaseOrder,
  ExpenseRecord,
  Product,
} from '../types';
import {
  formatRupiah,
  formatNumber,
  formatLiter,
  formatDateIndo,
  formatShortDate,
  MONTH_NAMES_INDO,
  formatMonthYear,
} from '../utils/formatters';

interface PrintSummaryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PertashopProfile;
  sales: SaleRecord[];
  purchases: PurchaseOrder[];
  expenses: ExpenseRecord[];
  products: Product[];
  initialMode?: 'MONTHLY' | 'YEARLY';
  initialMonth?: string; // YYYY-MM e.g. "2026-08"
  initialYear?: number; // e.g. 2026
}

export const PrintSummaryReportModal: React.FC<PrintSummaryReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  sales,
  purchases,
  expenses,
  products,
  initialMode = 'MONTHLY',
  initialMonth = '2026-08',
  initialYear = 2026,
}) => {
  const [reportType, setReportType] = useState<'MONTHLY' | 'YEARLY'>(initialMode);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  if (!isOpen) return null;

  // Available unique years from sales
  const availableYears = Array.from(
    new Set([
      ...sales.map((s) => s.transactionDate.substring(0, 4)),
      ...expenses.map((e) => e.date.substring(0, 4)),
      String(new Date().getFullYear()),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // --- MONTHLY CALCULATIONS ---
  const monthSales = sales.filter((s) => s.transactionDate.startsWith(selectedMonth));
  const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));
  const monthPurchases = purchases.filter((p) => p.orderDate.startsWith(selectedMonth));

  const totalMonthLiters = monthSales.reduce((acc, curr) => acc + curr.literSold, 0);
  const totalMonthRevenue = monthSales.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalMonthGrossProfit = monthSales.reduce((acc, curr) => acc + curr.totalProfit, 0);
  const totalMonthCash = monthSales.reduce((acc, curr) => acc + curr.paymentCash, 0);
  const totalMonthQris = monthSales.reduce((acc, curr) => acc + (curr.paymentQris + curr.paymentEdc), 0);

  // Expense categories breakdown for month
  const monthGaji = monthExpenses
    .filter((e) => e.category === 'GAJI_OPERATOR')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthLembur = monthExpenses
    .filter((e) => e.category === 'LEMBURAN')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthLosses = monthExpenses
    .filter((e) => e.category === 'LOSSES_MINYAK')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthLossesLiters = monthExpenses
    .filter((e) => e.category === 'LOSSES_MINYAK')
    .reduce((acc, curr) => acc + (curr.fuelLossLiters || 0), 0);
  const monthPln = monthExpenses
    .filter((e) => e.category === 'TOKEN_LISTRIK')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthPdam = monthExpenses
    .filter((e) => e.category === 'PDAM')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthMaint = monthExpenses
    .filter((e) => e.category === 'MAINTENANCE_ALAT')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthLain = monthExpenses
    .filter((e) => e.category === 'LAINNYA' || (e.category as string) === 'LAIN_LAIN')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalMonthExpenses = monthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const monthNetProfit = totalMonthGrossProfit - totalMonthExpenses;
  const totalMonthDORcv = monthPurchases
    .filter((p) => p.status === 'SELESAI')
    .reduce((acc, curr) => acc + (curr.actualLitersReceived || curr.volumeLiters), 0);

  // Group month sales by day for the daily table
  const salesByDayMap = new Map<string, { liters: number; revenue: number; profit: number; count: number }>();
  monthSales.forEach((s) => {
    const existing = salesByDayMap.get(s.transactionDate) || { liters: 0, revenue: 0, profit: 0, count: 0 };
    salesByDayMap.set(s.transactionDate, {
      liters: existing.liters + s.literSold,
      revenue: existing.revenue + s.totalRevenue,
      profit: existing.profit + s.totalProfit,
      count: existing.count + 1,
    });
  });

  const sortedDays = Array.from(salesByDayMap.keys()).sort();

  // --- YEARLY CALCULATIONS ---
  const yearSales = sales.filter((s) => s.transactionDate.startsWith(String(selectedYear)));
  const yearExpenses = expenses.filter((e) => e.date.startsWith(String(selectedYear)));
  const yearPurchases = purchases.filter((p) => p.orderDate.startsWith(String(selectedYear)));

  // Matrix per month (01 to 12)
  const yearlyMatrix = MONTH_NAMES_INDO.map((name, index) => {
    const mStr = String(index + 1).padStart(2, '0');
    const ym = `${selectedYear}-${mStr}`;
    const mSales = yearSales.filter((s) => s.transactionDate.startsWith(ym));
    const mExp = yearExpenses.filter((e) => e.date.startsWith(ym));
    const mPurch = yearPurchases.filter((p) => p.orderDate.startsWith(ym));

    const liters = mSales.reduce((acc, curr) => acc + curr.literSold, 0);
    const revenue = mSales.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    const grossProfit = mSales.reduce((acc, curr) => acc + curr.totalProfit, 0);
    const expTotal = mExp.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = grossProfit - expTotal;
    const doKL = mPurch.reduce((acc, curr) => acc + (curr.volumeKL || curr.volumeLiters / 1000), 0);

    const gaji = mExp.filter((e) => e.category === 'GAJI_OPERATOR' || e.category === 'LEMBURAN').reduce((acc, curr) => acc + curr.amount, 0);
    const losses = mExp.filter((e) => e.category === 'LOSSES_MINYAK').reduce((acc, curr) => acc + curr.amount, 0);
    const lossesLiters = mExp.filter((e) => e.category === 'LOSSES_MINYAK').reduce((acc, curr) => acc + (curr.fuelLossLiters || 0), 0);
    const lossesPercent = liters > 0 ? (lossesLiters / liters) * 100 : 0;
    const lossRatePerLiter = liters > 0 ? Math.round(losses / liters) : 0;
    const utilitas = mExp.filter((e) => e.category === 'TOKEN_LISTRIK' || e.category === 'PDAM').reduce((acc, curr) => acc + curr.amount, 0);
    const maint = mExp.filter((e) => e.category === 'MAINTENANCE_ALAT' || e.category === 'LAINNYA' || (e.category as string) === 'LAIN_LAIN').reduce((acc, curr) => acc + curr.amount, 0);

    return {
      monthIndex: index,
      monthName: name,
      monthKey: ym,
      liters,
      revenue,
      grossProfit,
      gaji,
      losses,
      lossesLiters,
      lossesPercent,
      lossRatePerLiter,
      utilitas,
      maint,
      expTotal,
      netProfit,
      doKL,
      hasData: mSales.length > 0 || mExp.length > 0,
    };
  });

  const totalYearLiters = yearSales.reduce((acc, curr) => acc + curr.literSold, 0);
  const totalYearRevenue = yearSales.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalYearGrossProfit = yearSales.reduce((acc, curr) => acc + curr.totalProfit, 0);
  const totalYearExpenses = yearExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalYearNetProfit = totalYearGrossProfit - totalYearExpenses;
  const totalYearDOKL = yearPurchases.reduce((acc, curr) => acc + (curr.volumeKL || curr.volumeLiters / 1000), 0);
  const totalYearLosses = yearExpenses
    .filter((e) => e.category === 'LOSSES_MINYAK')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalYearLossesLiters = yearExpenses
    .filter((e) => e.category === 'LOSSES_MINYAK')
    .reduce((acc, curr) => acc + (curr.fuelLossLiters || 0), 0);
  const totalYearLossesPercent = totalYearLiters > 0 ? (totalYearLossesLiters / totalYearLiters) * 100 : 0;
  const totalYearLossRatePerLiter = totalYearLiters > 0 ? Math.round(totalYearLosses / totalYearLiters) : 0;

  return (
    <div
      id="print-summary-report-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none print:w-full">
        {/* Modal Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Cetak Laporan Keuangan & Rekap Eksekutif
              </h2>
              <p className="text-xs text-slate-400">
                Format resmi dealer Pertashop untuk pelaporan bulanan & tahunan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Report Type */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setReportType('MONTHLY')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  reportType === 'MONTHLY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Rekap Bulanan
              </button>
              <button
                type="button"
                onClick={() => setReportType('YEARLY')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  reportType === 'YEARLY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Rekap Tahunan
              </button>
            </div>

            {/* Selectors */}
            {reportType === 'MONTHLY' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="p-8 overflow-y-auto flex-1 text-slate-900 bg-white print:p-0 print:overflow-visible font-sans text-xs">
          {/* Header Kop Surat Resmi Pertashop */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-blue-700 rounded-xl flex flex-col items-center justify-center text-white font-black shadow-xs">
                <span className="text-base tracking-tighter leading-none">PERTAMINA</span>
                <span className="text-[9px] bg-red-600 px-1.5 py-0.5 rounded mt-1 font-bold">PERTASHOP</span>
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {profile.pertashopName}
                </h1>
                <p className="text-[11px] font-semibold text-slate-700">
                  Kode Unit Dealer: <span className="font-mono text-blue-800">{profile.pertashopCode}</span> | Mitra Resmi Pertamina Patra Niaga
                </p>
                <p className="text-[10px] text-slate-500">
                  {profile.location} • Supply Point: {profile.tbbmDepot}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded-sm uppercase tracking-wider mb-1">
                {reportType === 'MONTHLY' ? 'Laporan Keuangan Bulanan' : 'Laporan Laba Rugi Tahunan'}
              </span>
              <p className="font-mono text-[11px] font-bold text-slate-800">
                Periode: {reportType === 'MONTHLY' ? formatMonthYear(selectedMonth) : `Tahun Buku ${selectedYear}`}
              </p>
              <p className="text-[9px] text-slate-400">
                Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* DOCUMENT BODY - MONTHLY REPORT */}
          {reportType === 'MONTHLY' && (
            <div className="space-y-5">
              {/* Section 1: Executive KPI Cards */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  I. Ringkasan Eksekutif Kinerja Finansial & Penjualan ({formatMonthYear(selectedMonth)})
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-blue-700">Volume BBM Terjual</div>
                    <div className="text-lg font-black text-blue-900 font-mono mt-0.5">
                      {formatLiter(totalMonthLiters)}
                    </div>
                    <div className="text-[9px] text-blue-600 mt-0.5">
                      Rata-rata: {sortedDays.length > 0 ? formatNumber(totalMonthLiters / sortedDays.length, 0) : 0} L / hari aktif
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-slate-600">Total Omzet Penjualan</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {formatRupiah(totalMonthRevenue)}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Tunai: {formatRupiah(totalMonthCash)} | QRIS: {formatRupiah(totalMonthQris)}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-amber-800">Laba Kotor (Gross Margin)</div>
                    <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
                      {formatRupiah(totalMonthGrossProfit)}
                    </div>
                    <div className="text-[9px] text-amber-700 mt-0.5">
                      Margin BBM @ Rp {products[0]?.marginPerLiter || 850}/Liter
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-emerald-800">Laba Bersih Bersih (Net Profit)</div>
                    <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                      {formatRupiah(monthNetProfit)}
                    </div>
                    <div className="text-[9px] text-emerald-700 mt-0.5">
                      Setelah beban operasional {formatRupiah(totalMonthExpenses)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Pos Beban & Pengeluaran Operasional Bulanan */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>II. Rincian Beban Operasional Bulanan (OpEx)</span>
                  <span className="font-mono text-rose-700 font-bold">
                    Total Beban: {formatRupiah(totalMonthExpenses)}
                  </span>
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                      <span>1. Gaji Operator</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(monthGaji)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600 mt-1">
                      <span>2. Uang Lemburan</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(monthLembur)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 border border-rose-200 rounded-lg bg-rose-50/40">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-rose-700">
                      <span>3. Losses Minyak (BBM)</span>
                      <span className="font-mono font-bold text-rose-900">{formatRupiah(monthLosses)}</span>
                    </div>
                    <div className="text-[9px] text-rose-600 mt-1 font-mono">
                      Selisih: {formatNumber(monthLossesLiters, 1)} Liter
                    </div>
                  </div>

                  <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                      <span>4. Token Listrik PLN</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(monthPln)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600 mt-1">
                      <span>5. Tagihan Air PDAM</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(monthPdam)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                      <span>6. Maintenance & Tera</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(monthMaint)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600 mt-1">
                      <span>7. Biaya Lain / ATK</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(monthLain)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Rekap Harian Penjualan */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  III. Log Transaksi Harian ({formatMonthYear(selectedMonth)})
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-1.5 border-r border-slate-300">Tanggal</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Liter Terjual</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Omzet (Rp)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Laba Margin BBM</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Kas Tunai</th>
                      <th className="p-1.5 text-right">QRIS / EDC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDays.map((dateStr) => {
                      const data = salesByDayMap.get(dateStr)!;
                      const daySales = monthSales.filter((s) => s.transactionDate === dateStr);
                      const cash = daySales.reduce((acc, curr) => acc + curr.paymentCash, 0);
                      const qris = daySales.reduce((acc, curr) => acc + curr.paymentQris + curr.paymentEdc, 0);

                      return (
                        <tr key={dateStr} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-1.5 border-r border-slate-200 font-mono text-[11px]">
                            {formatShortDate(dateStr)} ({data.count} shift)
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">
                            {formatNumber(data.liters, 0)} L
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-medium">
                            {formatRupiah(data.revenue)}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-800">
                            {formatRupiah(data.profit)}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-700">
                            {formatRupiah(cash)}
                          </td>
                          <td className="p-1.5 text-right font-mono text-blue-700">
                            {formatRupiah(qris)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-slate-300 uppercase">Total Bulanan</td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-blue-900">
                        {formatLiter(totalMonthLiters)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold">
                        {formatRupiah(totalMonthRevenue)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-emerald-900">
                        {formatRupiah(totalMonthGrossProfit)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono">
                        {formatRupiah(totalMonthCash)}
                      </td>
                      <td className="p-1.5 text-right font-mono text-blue-900">
                        {formatRupiah(totalMonthQris)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Section 4: Pasokan DO Pertamina Bulan Ini */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  IV. Realisasi Penerimaan DO Pertamina (Total: {formatNumber(totalMonthDORcv / 1000, 1)} KL)
                </h3>
                {monthPurchases.length === 0 ? (
                  <p className="text-slate-500 italic">Tidak ada catatan pemesanan DO pada bulan {formatMonthYear(selectedMonth)}.</p>
                ) : (
                  <table className="w-full border-collapse border border-slate-300 text-left">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300">
                        <th className="p-1.5 border-r border-slate-300">No. PO & Tanggal</th>
                        <th className="p-1.5 border-r border-slate-300">Produk & Volume</th>
                        <th className="p-1.5 border-r border-slate-300">TBBM Depot & Plat Mobil</th>
                        <th className="p-1.5 border-r border-slate-300 text-right">Nilai Penebusan (Rp)</th>
                        <th className="p-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthPurchases.map((po) => (
                        <tr key={po.id} className="border-b border-slate-200">
                          <td className="p-1.5 border-r border-slate-200 font-mono">
                            {po.poNumber} <span className="text-[10px] text-slate-500">({formatShortDate(po.orderDate)})</span>
                          </td>
                          <td className="p-1.5 border-r border-slate-200 font-medium">
                            {po.productName} - {po.volumeKL} KL ({formatLiter(po.volumeLiters)})
                          </td>
                          <td className="p-1.5 border-r border-slate-200">
                            {po.supplyDepot} {po.truckPlateNumber && `(${po.truckPlateNumber})`}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold">
                            {formatRupiah(po.totalAmount)}
                          </td>
                          <td className="p-1.5 text-center font-bold text-[10px]">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* DOCUMENT BODY - YEARLY REPORT */}
          {reportType === 'YEARLY' && (
            <div className="space-y-5">
              {/* Section 1: Executive KPI Cards Year */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  I. Ikhtisar Kinerja Finansial Tahunan (Tahun Buku {selectedYear})
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-blue-700">Total Volume BBM (YTD)</div>
                    <div className="text-lg font-black text-blue-900 font-mono mt-0.5">
                      {formatLiter(totalYearLiters)}
                    </div>
                    <div className="text-[9px] text-blue-600 mt-0.5">
                      Setara {formatNumber(totalYearLiters / 1000, 1)} KiloLiter (KL)
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-slate-600">Total Omzet Penjualan</div>
                    <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                      {formatRupiah(totalYearRevenue)}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Penebusan DO Masuk: {formatNumber(totalYearDOKL, 1)} KL
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-amber-800">Laba Kotor Margin BBM</div>
                    <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
                      {formatRupiah(totalYearGrossProfit)}
                    </div>
                    <div className="text-[9px] text-amber-700 mt-0.5">
                      Total Beban OpEx: {formatRupiah(totalYearExpenses)}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="text-[10px] uppercase font-bold text-emerald-800">Akumulasi Laba Bersih (YTD)</div>
                    <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                      {formatRupiah(totalYearNetProfit)}
                    </div>
                    <div className="text-[9px] text-emerald-700 mt-0.5">
                      Rata-rata: {formatRupiah(totalYearNetProfit / 12)} / bulan
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: 12-Month Financial Performance Matrix */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  II. Matriks Kinerja Laba Rugi 12 Bulan (Januari - Desember {selectedYear})
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-1.5 border-r border-slate-300">Bulan</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Volume (L)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">DO (KL)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Omzet (Rp)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Laba Kotor</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Beban Gaji</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Losses BBM</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Utilitas & Servis</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Total Beban</th>
                      <th className="p-1.5 text-right">Laba Bersih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyMatrix.map((item) => (
                      <tr
                        key={item.monthKey}
                        className={`border-b border-slate-200 ${
                          !item.hasData ? 'text-slate-400 bg-slate-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-1.5 border-r border-slate-200 font-medium">
                          {item.monthName}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">
                          {item.liters > 0 ? formatNumber(item.liters, 0) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono text-blue-700">
                          {item.doKL > 0 ? `${item.doKL} KL` : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">
                          {item.revenue > 0 ? formatRupiah(item.revenue) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold text-slate-800">
                          {item.grossProfit > 0 ? formatRupiah(item.grossProfit) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-600">
                          {item.gaji > 0 ? formatRupiah(item.gaji) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono text-rose-700">
                          {item.losses > 0 ? (
                            <div>
                              <span className="font-semibold">{formatRupiah(item.losses)}</span>
                              <div className="text-[9px] text-rose-600">
                                {formatNumber(item.lossesLiters, 1)} L ({item.lossesPercent.toFixed(2)}%)
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-600">
                          {item.utilitas + item.maint > 0 ? formatRupiah(item.utilitas + item.maint) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono text-rose-700 font-semibold">
                          {item.expTotal > 0 ? formatRupiah(item.expTotal) : '-'}
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-emerald-800">
                          {item.netProfit !== 0 ? formatRupiah(item.netProfit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-slate-300 uppercase">Total YTD {selectedYear}</td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-blue-900">
                        {formatLiter(totalYearLiters)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-blue-900">
                        {formatNumber(totalYearDOKL, 1)} KL
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold">
                        {formatRupiah(totalYearRevenue)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-emerald-900">
                        {formatRupiah(totalYearGrossProfit)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono text-slate-800">
                        {formatRupiah(yearlyMatrix.reduce((a, b) => a + b.gaji, 0))}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono text-rose-900 font-bold">
                        {formatRupiah(totalYearLosses)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono text-slate-800">
                        {formatRupiah(yearlyMatrix.reduce((a, b) => a + (b.utilitas + b.maint), 0))}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-rose-900">
                        {formatRupiah(totalYearExpenses)}
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold text-emerald-900">
                        {formatRupiah(totalYearNetProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Section 3: Ringkasan & Evaluasi Susut Minyak (Losses BBM) 12 Bulan */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>III. Ringkasan & Audit Susut Fisik BBM (Losses Minyak) 12 Bulan</span>
                  <span className="font-mono text-xs font-bold text-rose-700">
                    Total Susut: {formatNumber(totalYearLossesLiters, 1)} Liter ({totalYearLossesPercent.toFixed(2)}%) = {formatRupiah(totalYearLosses)}
                  </span>
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-slate-300">
                      <th className="p-1.5 border-r border-slate-300">Bulan</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Penjualan (L)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Volume Susut (L)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Rasio Susut (%)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Biaya Susut (Rp)</th>
                      <th className="p-1.5 border-r border-slate-300 text-right">Beban/Liter</th>
                      <th className="p-1.5 text-center">Status Toleransi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyMatrix.map((item) => (
                      <tr
                        key={`print-losses-${item.monthKey}`}
                        className={`border-b border-slate-200 ${
                          !item.hasData ? 'text-slate-400 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="p-1.5 border-r border-slate-200 font-medium">
                          {item.monthName}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">
                          {item.liters > 0 ? formatNumber(item.liters, 0) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold text-rose-700">
                          {item.lossesLiters > 0 ? `${formatNumber(item.lossesLiters, 1)} L` : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold text-amber-800">
                          {item.liters > 0 ? `${item.lossesPercent.toFixed(2)}%` : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold">
                          {item.losses > 0 ? formatRupiah(item.losses) : '-'}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-600">
                          {item.liters > 0 ? `Rp ${item.lossRatePerLiter}` : '-'}
                        </td>
                        <td className="p-1.5 text-center font-bold text-[10px]">
                          {item.hasData ? (
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                item.lossesPercent <= 0.5
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.lossesPercent <= 0.5 ? 'Wajar (<0.50%)' : 'Tinggi (>0.50%)'}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-slate-300 uppercase">Total Tahunan (YTD)</td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-blue-900">
                        {formatLiter(totalYearLiters)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-rose-900">
                        {formatNumber(totalYearLossesLiters, 1)} Liter
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-amber-900">
                        {totalYearLossesPercent.toFixed(2)}%
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(totalYearLosses)}
                      </td>
                      <td className="p-1.5 border-r border-slate-300 text-right font-mono text-slate-900">
                        Rp {totalYearLossRatePerLiter} / L
                      </td>
                      <td className="p-1.5 text-center text-emerald-800 font-bold">
                        {totalYearLossesPercent <= 0.5 ? 'Wajar / Memenuhi Syarat' : 'Perlu Tera Ulang'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Section: Lembar Pengesahan & Tanda Tangan */}
          <div className="pt-8 border-t border-slate-300 mt-6">
            <div className="text-[10px] text-slate-500 mb-5 text-center italic">
              Laporan ringkasan eksekutif ini disusun berdasarkan pencatatan totalisator dispenser, log kasir, invoice pemesanan DO Pertamina, dan bukti pengeluaran operasional resmi Pertashop.
            </div>

            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-600 mb-12 uppercase">Dibuat Oleh (Admin / Kasir)</p>
                <p className="font-bold text-slate-900 underline">Daslam</p>
                <p className="text-[9px] text-slate-500">Staf Administrasi & Kasir</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-600 mb-12 uppercase">Diperiksa Oleh (Kepala Lapangan)</p>
                <p className="font-bold text-slate-900 underline">Angga</p>
                <p className="text-[9px] text-slate-500">Penanggung Jawab Operasional</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-600 mb-12 uppercase">Disetujui Oleh (Pemilik / Direktur)</p>
                <p className="font-bold text-slate-900 underline">{profile.ownerName}</p>
                <p className="text-[9px] text-slate-500">Pemilik & Pengelola Pertashop</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
