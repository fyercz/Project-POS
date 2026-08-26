import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  Fuel,
  DollarSign,
  Receipt,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  Zap,
  Droplet,
  Wrench,
  Users,
  Building,
  Info,
} from 'lucide-react';
import {
  SaleRecord,
  PurchaseOrder,
  ExpenseRecord,
  Product,
  PertashopProfile,
} from '../types';
import {
  formatRupiah,
  formatNumber,
  formatLiter,
  formatDateIndo,
  formatShortDate,
  MONTH_NAMES_INDO,
  MONTH_NAMES_SHORT,
  formatMonthYear,
  getTodayDateString,
} from '../utils/formatters';

interface SummaryReportViewProps {
  sales: SaleRecord[];
  purchases: PurchaseOrder[];
  expenses: ExpenseRecord[];
  products: Product[];
  profile: PertashopProfile;
  onOpenPrintModal: (mode: 'MONTHLY' | 'YEARLY', month: string, year: number) => void;
}

export const SummaryReportView: React.FC<SummaryReportViewProps> = ({
  sales,
  purchases,
  expenses,
  products,
  profile,
  onOpenPrintModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(7); // 0 = Jan, 7 = Aug (current)
  const [hoveredDailyItem, setHoveredDailyItem] = useState<{
    tanggal: string;
    liter: number;
    labaBersih: number;
    beban: number;
  } | null>(null);
  const [hoveredYearlyItem, setHoveredYearlyItem] = useState<{
    monthName: string;
    liters: number;
    netProfit: number;
    expTotal: number;
  } | null>(null);

  // Primary product
  const primaryProduct = products.find((p) => p.id === 'prod-pertamax-92') || products[0];

  // Available unique years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    sales.forEach((s) => {
      const y = parseInt(s.transactionDate.substring(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    });
    expenses.forEach((e) => {
      const y = parseInt(e.date.substring(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, expenses]);

  // Selected Month formatted string YYYY-MM
  const selectedMonthStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonthIndex(11);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonthIndex(0);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  // --- MONTHLY DATA CALCULATIONS ---
  const currentMonthSales = useMemo(() => {
    return sales.filter((s) => s.transactionDate.startsWith(selectedMonthStr));
  }, [sales, selectedMonthStr]);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(selectedMonthStr));
  }, [expenses, selectedMonthStr]);

  const currentMonthPurchases = useMemo(() => {
    return purchases.filter((p) => p.orderDate.startsWith(selectedMonthStr));
  }, [purchases, selectedMonthStr]);

  // Monthly KPIs
  const monthTotalLiters = useMemo(
    () => currentMonthSales.reduce((acc, curr) => acc + curr.literSold, 0),
    [currentMonthSales]
  );
  const monthTotalRevenue = useMemo(
    () => currentMonthSales.reduce((acc, curr) => acc + curr.totalRevenue, 0),
    [currentMonthSales]
  );
  const monthTotalGrossProfit = useMemo(
    () => currentMonthSales.reduce((acc, curr) => acc + curr.totalProfit, 0),
    [currentMonthSales]
  );
  const monthTotalCash = useMemo(
    () => currentMonthSales.reduce((acc, curr) => acc + curr.paymentCash, 0),
    [currentMonthSales]
  );
  const monthTotalQris = useMemo(
    () => currentMonthSales.reduce((acc, curr) => acc + (curr.paymentQris + curr.paymentEdc), 0),
    [currentMonthSales]
  );

  // Monthly Expense breakdowns
  const monthExpensesGaji = useMemo(
    () =>
      currentMonthExpenses
        .filter((e) => e.category === 'GAJI_OPERATOR')
        .reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );
  const monthExpensesLembur = useMemo(
    () =>
      currentMonthExpenses
        .filter((e) => e.category === 'LEMBURAN')
        .reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );
  const monthExpensesPln = useMemo(
    () =>
      currentMonthExpenses
        .filter((e) => e.category === 'TOKEN_LISTRIK')
        .reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );
  const monthExpensesPdam = useMemo(
    () =>
      currentMonthExpenses
        .filter((e) => e.category === 'PDAM')
        .reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );
  const monthExpensesMaint = useMemo(
    () =>
      currentMonthExpenses
        .filter((e) => e.category === 'MAINTENANCE_ALAT')
        .reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );
  const monthExpensesLain = useMemo(
    () =>
      currentMonthExpenses
        .filter((e) => e.category === 'LAIN_LAIN')
        .reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );

  const monthTotalExpenses = useMemo(
    () => currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0),
    [currentMonthExpenses]
  );

  const monthNetProfit = monthTotalGrossProfit - monthTotalExpenses;
  const monthNetMarginPercent =
    monthTotalGrossProfit > 0 ? ((monthNetProfit / monthTotalGrossProfit) * 100).toFixed(1) : '0';

  const monthDORcvKL = useMemo(
    () =>
      currentMonthPurchases
        .filter((p) => p.status === 'SELESAI')
        .reduce((acc, curr) => acc + (curr.volumeKL || curr.volumeLiters / 1000), 0),
    [currentMonthPurchases]
  );

  // Group daily records for the monthly chart & daily log table
  const dailyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        dayNum: number;
        liters: number;
        revenue: number;
        grossProfit: number;
        cash: number;
        qris: number;
        shiftsCount: number;
      }
    >();

    // Determine total days in this month
    const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${selectedMonthStr}-${String(d).padStart(2, '0')}`;
      map.set(dStr, {
        date: dStr,
        dayNum: d,
        liters: 0,
        revenue: 0,
        grossProfit: 0,
        cash: 0,
        qris: 0,
        shiftsCount: 0,
      });
    }

    currentMonthSales.forEach((s) => {
      const item = map.get(s.transactionDate);
      if (item) {
        item.liters += s.literSold;
        item.revenue += s.totalRevenue;
        item.grossProfit += s.totalProfit;
        item.cash += s.paymentCash;
        item.qris += s.paymentQris + s.paymentEdc;
        item.shiftsCount += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.dayNum - b.dayNum);
  }, [currentMonthSales, selectedYear, selectedMonthIndex, selectedMonthStr]);

  // Daily Chart dataset with Net Profit approximation
  const dailyChartData = useMemo(() => {
    return dailyBreakdown.map((d) => {
      // Find expenses on that day
      const dayExp = currentMonthExpenses
        .filter((e) => e.date === d.date)
        .reduce((acc, curr) => acc + curr.amount, 0);

      const netProf = d.grossProfit - dayExp;

      return {
        tanggal: `Tgl ${d.dayNum}`,
        fullDate: d.date,
        liter: d.liters,
        labaKotor: d.grossProfit,
        beban: dayExp,
        labaBersih: netProf,
      };
    });
  }, [dailyBreakdown, currentMonthExpenses]);

  // Active days count
  const activeOperatingDays = useMemo(
    () => dailyBreakdown.filter((d) => d.liters > 0).length,
    [dailyBreakdown]
  );
  const avgDailyLiters =
    activeOperatingDays > 0 ? Math.round(monthTotalLiters / activeOperatingDays) : 0;

  // --- YEARLY DATA CALCULATIONS (12 MONTHS MATRIX) ---
  const currentYearSales = useMemo(() => {
    return sales.filter((s) => s.transactionDate.startsWith(String(selectedYear)));
  }, [sales, selectedYear]);

  const currentYearExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(String(selectedYear)));
  }, [expenses, selectedYear]);

  const currentYearPurchases = useMemo(() => {
    return purchases.filter((p) => p.orderDate.startsWith(String(selectedYear)));
  }, [purchases, selectedYear]);

  // Yearly 12-Month Matrix
  const yearlyMatrix = useMemo(() => {
    return MONTH_NAMES_INDO.map((name, index) => {
      const mStr = String(index + 1).padStart(2, '0');
      const ym = `${selectedYear}-${mStr}`;
      const mSales = currentYearSales.filter((s) => s.transactionDate.startsWith(ym));
      const mExp = currentYearExpenses.filter((e) => e.date.startsWith(ym));
      const mPurch = currentYearPurchases.filter((p) => p.orderDate.startsWith(ym));

      const liters = mSales.reduce((acc, curr) => acc + curr.literSold, 0);
      const revenue = mSales.reduce((acc, curr) => acc + curr.totalRevenue, 0);
      const grossProfit = mSales.reduce((acc, curr) => acc + curr.totalProfit, 0);
      const expTotal = mExp.reduce((acc, curr) => acc + curr.amount, 0);
      const netProfit = grossProfit - expTotal;
      const doKL = mPurch.reduce((acc, curr) => acc + (curr.volumeKL || curr.volumeLiters / 1000), 0);

      const gajiLembur = mExp
        .filter((e) => e.category === 'GAJI_OPERATOR' || e.category === 'LEMBURAN')
        .reduce((acc, curr) => acc + curr.amount, 0);
      const utilitas = mExp
        .filter((e) => e.category === 'TOKEN_LISTRIK' || e.category === 'PDAM')
        .reduce((acc, curr) => acc + curr.amount, 0);
      const maintLain = mExp
        .filter((e) => e.category === 'MAINTENANCE_ALAT' || e.category === 'LAIN_LAIN')
        .reduce((acc, curr) => acc + curr.amount, 0);

      const netMargin = grossProfit > 0 ? ((netProfit / grossProfit) * 100).toFixed(1) : '0';

      return {
        monthIndex: index,
        monthName: name,
        shortName: MONTH_NAMES_SHORT[index],
        monthKey: ym,
        liters,
        revenue,
        grossProfit,
        gajiLembur,
        utilitas,
        maintLain,
        expTotal,
        netProfit,
        doKL,
        netMargin,
        hasData: mSales.length > 0 || mExp.length > 0,
      };
    });
  }, [currentYearSales, currentYearExpenses, currentYearPurchases, selectedYear]);

  // Yearly Aggregate Totals
  const yearTotalLiters = useMemo(
    () => currentYearSales.reduce((acc, curr) => acc + curr.literSold, 0),
    [currentYearSales]
  );
  const yearTotalRevenue = useMemo(
    () => currentYearSales.reduce((acc, curr) => acc + curr.totalRevenue, 0),
    [currentYearSales]
  );
  const yearTotalGrossProfit = useMemo(
    () => currentYearSales.reduce((acc, curr) => acc + curr.totalProfit, 0),
    [currentYearSales]
  );
  const yearTotalExpenses = useMemo(
    () => currentYearExpenses.reduce((acc, curr) => acc + curr.amount, 0),
    [currentYearExpenses]
  );
  const yearTotalNetProfit = yearTotalGrossProfit - yearTotalExpenses;
  const yearTotalDOKL = useMemo(
    () => currentYearPurchases.reduce((acc, curr) => acc + (curr.volumeKL || curr.volumeLiters / 1000), 0),
    [currentYearPurchases]
  );

  const monthsWithDataCount = useMemo(
    () => yearlyMatrix.filter((m) => m.hasData).length || 1,
    [yearlyMatrix]
  );
  const avgMonthlyNetProfit = Math.round(yearTotalNetProfit / monthsWithDataCount);

  // Best performing month in the year
  const bestMonth = useMemo(() => {
    const valid = yearlyMatrix.filter((m) => m.hasData && m.netProfit > 0);
    if (valid.length === 0) return null;
    return valid.reduce((best, curr) => (curr.netProfit > best.netProfit ? curr : best), valid[0]);
  }, [yearlyMatrix]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (activeSubTab === 'MONTHLY') {
      const headers = ['Tanggal', 'Liter Terjual', 'Omzet (Rp)', 'Laba Kotor (Rp)', 'Penerimaan Tunai (Rp)', 'Penerimaan QRIS (Rp)'];
      const rows = dailyBreakdown
        .filter((d) => d.liters > 0)
        .map((d) => [d.date, d.liters, d.revenue, d.grossProfit, d.cash, d.qris]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Bulanan_Pertashop_${selectedMonthStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'Bulan',
        'Volume Liter',
        'DO Masuk (KL)',
        'Omzet (Rp)',
        'Laba Kotor (Rp)',
        'Beban Gaji & Lembur (Rp)',
        'Beban Utilitas (Rp)',
        'Beban Servis & Lain (Rp)',
        'Total Beban (Rp)',
        'Laba Bersih (Rp)',
        'Net Margin (%)',
      ];
      const rows = yearlyMatrix.map((m) => [
        m.monthName,
        m.liters,
        m.doKL,
        m.revenue,
        m.grossProfit,
        m.gajiLembur,
        m.utilitas,
        m.maintLain,
        m.expTotal,
        m.netProfit,
        m.netMargin,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Tahunan_Pertashop_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation & Selectors */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Tab Toggle: Bulanan vs Tahunan */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('MONTHLY')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'MONTHLY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Summary Bulanan (Monthly)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('YEARLY')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'YEARLY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Summary Tahunan (Yearly)</span>
          </button>
        </div>

        {/* Date & Period Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {activeSubTab === 'MONTHLY' ? (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1 px-2">
                <select
                  value={selectedMonthIndex}
                  onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  {MONTH_NAMES_INDO.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-medium text-slate-500">Pilih Tahun Buku:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons: Export & Print */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Download Data CSV/Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPrintModal(activeSubTab, selectedMonthStr, selectedYear)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan Resmi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SUMMARY BULANAN (MONTHLY) VIEW                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'MONTHLY' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Card 1: Volume Liter */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Volume Terjual
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Fuel className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatLiter(monthTotalLiters)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Rata-rata:</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    {formatNumber(avgDailyLiters, 0)} L/hari
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Omzet Penjualan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Omzet Bruto
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatRupiah(monthTotalRevenue)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Tunai: {formatRupiah(monthTotalCash)}
                </div>
              </div>
            </div>

            {/* Card 3: Laba Kotor Margin BBM */}
            <div className="bg-white rounded-2xl p-4 border border-amber-200/80 bg-amber-50/20 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-800 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Laba Kotor BBM
                </span>
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-amber-950 font-mono">
                  {formatRupiah(monthTotalGrossProfit)}
                </div>
                <div className="text-[11px] text-amber-700 mt-1">
                  Margin @ Rp {primaryProduct.marginPerLiter}/L
                </div>
              </div>
            </div>

            {/* Card 4: Total Beban Operasional */}
            <div className="bg-white rounded-2xl p-4 border border-rose-200/80 bg-rose-50/20 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-800 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Beban Operasional
                </span>
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-950 font-mono">
                  {formatRupiah(monthTotalExpenses)}
                </div>
                <div className="text-[11px] text-rose-600 mt-1">
                  Gaji, Listrik, PDAM, Servis
                </div>
              </div>
            </div>

            {/* Card 5: Laba Bersih Bersih (Net Profit) */}
            <div className="bg-white rounded-2xl p-4 border-2 border-emerald-500 bg-emerald-50/30 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Laba Bersih Riil
                </span>
                <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-emerald-950 font-mono">
                  {formatRupiah(monthNetProfit)}
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center justify-between">
                  <span>Net Efficiency:</span>
                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    {monthNetMarginPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 6: Pasokan DO Masuk */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  DO Pertamina
                </span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatNumber(monthDORcvKL, 1)} KL
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {currentMonthPurchases.length} kali pemesanan
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Charts & Cost Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Daily Volume & Net Profit (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Tren Penjualan & Laba Harian ({formatMonthYear(selectedMonthStr)})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Fluktuasi liter terjual dispenser dan estimasi laba bersih harian
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 bg-blue-600 rounded-xs"></span>
                      <span className="text-slate-600">Volume (Liter)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
                      <span className="text-slate-600">Laba Bersih (Rp)</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Tooltip Card */}
                {hoveredDailyItem ? (
                  <div className="mb-2 p-2 bg-slate-900 text-white rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-blue-300">{hoveredDailyItem.tanggal}</span>
                    <div className="flex items-center gap-4">
                      <span>
                        Volume: <strong className="text-white font-mono">{formatNumber(hoveredDailyItem.liter, 0)} L</strong>
                      </span>
                      <span>
                        Beban: <strong className="text-rose-300 font-mono">{formatRupiah(hoveredDailyItem.beban)}</strong>
                      </span>
                      <span>
                        Laba Bersih: <strong className="text-emerald-300 font-mono">{formatRupiah(hoveredDailyItem.labaBersih)}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 p-2 bg-slate-50 text-slate-500 rounded-xl text-xs border border-slate-200 text-center italic">
                    Arahkan kursor / sentuh batang grafik untuk melihat detail penjualan & laba harian
                  </div>
                )}

                {/* Custom SVG Bar Chart */}
                <div className="h-56 w-full flex items-end gap-1 sm:gap-1.5 pt-6 pb-2 px-1 border-b border-slate-200">
                  {dailyChartData.map((d, idx) => {
                    const maxLiter = Math.max(...dailyChartData.map((item) => item.liter), 1200);
                    const maxProfit = Math.max(...dailyChartData.map((item) => Math.max(0, item.labaBersih)), 800000);
                    const literHeight = d.liter > 0 ? Math.max(8, (d.liter / maxLiter) * 100) : 0;
                    const profitHeight = d.labaBersih > 0 ? Math.max(8, (d.labaBersih / maxProfit) * 100) : 0;

                    return (
                      <div
                        key={d.tanggal}
                        onMouseEnter={() => setHoveredDailyItem(d)}
                        onMouseLeave={() => setHoveredDailyItem(null)}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      >
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          {/* Liter Bar */}
                          <div
                            style={{ height: `${literHeight}%` }}
                            className={`w-full max-w-[10px] sm:max-w-[14px] rounded-t-sm transition-all duration-300 ${
                              d.liter > 0
                                ? 'bg-blue-600 group-hover:bg-blue-700'
                                : 'bg-slate-200/50'
                            }`}
                          />
                          {/* Net Profit Bar */}
                          <div
                            style={{ height: `${profitHeight}%` }}
                            className={`w-full max-w-[10px] sm:max-w-[14px] rounded-t-sm transition-all duration-300 ${
                              d.labaBersih > 0
                                ? 'bg-emerald-500 group-hover:bg-emerald-600'
                                : 'bg-slate-200/50'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis labels */}
                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5">
                  <span>Tgl 1</span>
                  <span>Tgl 5</span>
                  <span>Tgl 10</span>
                  <span>Tgl 15</span>
                  <span>Tgl 20</span>
                  <span>Tgl 25</span>
                  <span>Tgl {dailyChartData.length}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Monthly Operational Expense Structure */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <span>Struktur Beban Operasional</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    {formatRupiah(monthTotalExpenses)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Rincian alokasi biaya operasional bulan {formatMonthYear(selectedMonthStr)}
                </p>

                <div className="space-y-3">
                  {/* Gaji Operator */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="flex items-center space-x-1.5 text-slate-700">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gaji Operator (@ Rp 40k/hari)</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(monthExpensesGaji)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{
                          width: `${monthTotalExpenses > 0 ? (monthExpensesGaji / monthTotalExpenses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Lemburan */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="flex items-center space-x-1.5 text-slate-700">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Uang Lemburan (@ Rp 30k/shift)</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(monthExpensesLembur)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{
                          width: `${monthTotalExpenses > 0 ? (monthExpensesLembur / monthTotalExpenses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Listrik PLN */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="flex items-center space-x-1.5 text-slate-700">
                        <Zap className="w-3.5 h-3.5 text-purple-600" />
                        <span>Token Listrik PLN</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(monthExpensesPln)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full"
                        style={{
                          width: `${monthTotalExpenses > 0 ? (monthExpensesPln / monthTotalExpenses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Air PDAM */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="flex items-center space-x-1.5 text-slate-700">
                        <Droplet className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Tagihan Air PDAM</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(monthExpensesPdam)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{
                          width: `${monthTotalExpenses > 0 ? (monthExpensesPdam / monthTotalExpenses) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Maintenance */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="flex items-center space-x-1.5 text-slate-700">
                        <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Maintenance & Tera Nozzle</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(monthExpensesMaint + monthExpensesLain)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full"
                        style={{
                          width: `${
                            monthTotalExpenses > 0
                              ? ((monthExpensesMaint + monthExpensesLain) / monthTotalExpenses) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Profitability insight banner */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600">Beban / Liter BBM:</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {monthTotalLiters > 0 ? Math.round(monthTotalExpenses / monthTotalLiters) : 0} / Liter
                </span>
              </div>
            </div>
          </div>

          {/* Table: Daily Sales & Financial Journal */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Rekapitulasi Harian Penjualan ({formatMonthYear(selectedMonthStr)})
                </h3>
                <p className="text-xs text-slate-500">
                  Detail per tanggal transaksi penjualan bahan bakar dan setoran kasir
                </p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-mono">
                {activeOperatingDays} Hari Aktif Penjualan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Tanggal Transaksi</th>
                    <th className="py-3 px-4 text-center">Jumlah Shift</th>
                    <th className="py-3 px-4 text-right">Volume (Liter)</th>
                    <th className="py-3 px-4 text-right">Omzet Kotor (Rp)</th>
                    <th className="py-3 px-4 text-right">Laba Margin BBM</th>
                    <th className="py-3 px-4 text-right">Tunai Kasir</th>
                    <th className="py-3 px-4 text-right">QRIS / EDC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {dailyBreakdown.filter((d) => d.liters > 0).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Belum ada catatan penjualan pada bulan {formatMonthYear(selectedMonthStr)}.
                      </td>
                    </tr>
                  ) : (
                    dailyBreakdown
                      .filter((d) => d.liters > 0)
                      .map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {formatShortDate(d.date)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md text-[11px]">
                              {d.shiftsCount} Shift
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            {formatLiter(d.liters)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                            {formatRupiah(d.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(d.grossProfit)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatRupiah(d.cash)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-600">
                            {formatRupiah(d.qris)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
                {dailyBreakdown.filter((d) => d.liters > 0).length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-4 uppercase text-[11px]">Total Bulanan</td>
                      <td className="py-3 px-4 text-center font-mono">
                        {currentMonthSales.length} Total Shift
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-900 font-black">
                        {formatLiter(monthTotalLiters)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-black">
                        {formatRupiah(monthTotalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-900 font-black">
                        {formatRupiah(monthTotalGrossProfit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {formatRupiah(monthTotalCash)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-900">
                        {formatRupiah(monthTotalQris)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SUMMARY TAHUNAN (YEARLY) VIEW                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'YEARLY' && (
        <div className="space-y-6">
          {/* Executive Yearly Grand KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Card 1: YTD Net Profit */}
            <div className="bg-white rounded-2xl p-4 border-2 border-emerald-500 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Akumulasi Laba Bersih
                </span>
                <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-emerald-950 font-mono">
                  {formatRupiah(yearTotalNetProfit)}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  Tahun Buku {selectedYear}
                </div>
              </div>
            </div>

            {/* Card 2: Total Volume BBM YTD */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  Total Volume Terjual
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Fuel className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatLiter(yearTotalLiters)}
                </div>
                <div className="text-[11px] text-blue-700 font-semibold mt-1">
                  ≈ {formatNumber(yearTotalLiters / 1000, 1)} KiloLiter (KL)
                </div>
              </div>
            </div>

            {/* Card 3: Total Omzet Tahunan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Omzet Tahunan
                </span>
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatRupiah(yearTotalRevenue)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Laba Kotor: {formatRupiah(yearTotalGrossProfit)}
                </div>
              </div>
            </div>

            {/* Card 4: Total Beban Tahunan */}
            <div className="bg-white rounded-2xl p-4 border border-rose-200/80 bg-rose-50/20 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-800 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Total Beban Tahunan
                </span>
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-rose-950 font-mono">
                  {formatRupiah(yearTotalExpenses)}
                </div>
                <div className="text-[11px] text-rose-600 mt-1">
                  Gaji, PLN, PDAM & Perawatan
                </div>
              </div>
            </div>

            {/* Card 5: Rata-rata Laba Bersih Bulanan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Rata-rata Laba / Bln
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {formatRupiah(avgMonthlyNetProfit)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Basis {monthsWithDataCount} bulan aktif
                </div>
              </div>
            </div>

            {/* Card 6: Best Performing Month */}
            <div className="bg-white rounded-2xl p-4 border border-purple-200/80 bg-purple-50/20 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-800 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Bulan Terbaik
                </span>
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-base font-black text-purple-950 font-mono">
                  {bestMonth ? bestMonth.monthName : '-'}
                </div>
                <div className="text-[11px] text-purple-800 font-semibold mt-1">
                  {bestMonth ? formatRupiah(bestMonth.netProfit) : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* 12-Month Performance Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Grafik Perbandingan Kinerja 12 Bulan (Januari - Desember {selectedYear})
                </h3>
                <p className="text-xs text-slate-500">
                  Komparasi volume penjualan (Liter), laba kotor, dan laba bersih per bulan
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 bg-blue-600 rounded-xs"></span>
                  <span className="text-slate-600">Volume (Liter)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
                  <span className="text-slate-600">Laba Bersih (Rp)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 bg-rose-400 rounded-xs"></span>
                  <span className="text-slate-600">Beban OpEx (Rp)</span>
                </div>
              </div>
            </div>

            {/* Interactive Tooltip Card for Year */}
            {hoveredYearlyItem ? (
              <div className="mb-2 p-2.5 bg-slate-900 text-white rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-blue-300 text-sm">{hoveredYearlyItem.monthName}</span>
                <div className="flex items-center gap-4">
                  <span>
                    Volume: <strong className="text-white font-mono">{formatNumber(hoveredYearlyItem.liters, 0)} L</strong>
                  </span>
                  <span>
                    Beban: <strong className="text-rose-300 font-mono">{formatRupiah(hoveredYearlyItem.expTotal)}</strong>
                  </span>
                  <span>
                    Laba Bersih: <strong className="text-emerald-300 font-mono">{formatRupiah(hoveredYearlyItem.netProfit)}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-2 p-2 bg-slate-50 text-slate-500 rounded-xl text-xs border border-slate-200 text-center italic">
                Arahkan kursor / sentuh bulan untuk melihat perbandingan kinerja keuangan 12 bulan
              </div>
            )}

            {/* 12-Month Custom SVG Bar Chart */}
            <div className="h-64 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-200">
              {yearlyMatrix.map((m) => {
                const maxLiterYear = Math.max(...yearlyMatrix.map((item) => item.liters), 25000);
                const maxProfitYear = Math.max(...yearlyMatrix.map((item) => Math.max(0, item.netProfit)), 20000000);
                const maxExpYear = Math.max(...yearlyMatrix.map((item) => item.expTotal), 5000000);

                const literHeight = m.liters > 0 ? Math.max(8, (m.liters / maxLiterYear) * 100) : 0;
                const profitHeight = m.netProfit > 0 ? Math.max(8, (m.netProfit / maxProfitYear) * 100) : 0;
                const expHeight = m.expTotal > 0 ? Math.max(8, (m.expTotal / maxExpYear) * 100) : 0;

                return (
                  <div
                    key={m.monthKey}
                    onMouseEnter={() => setHoveredYearlyItem(m)}
                    onMouseLeave={() => setHoveredYearlyItem(null)}
                    onClick={() => {
                      setSelectedMonthIndex(m.monthIndex);
                      setActiveSubTab('MONTHLY');
                    }}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* Liter Bar */}
                      <div
                        style={{ height: `${literHeight}%` }}
                        className={`w-full max-w-[12px] sm:max-w-[16px] rounded-t-sm transition-all duration-300 ${
                          m.liters > 0
                            ? 'bg-blue-600 group-hover:bg-blue-700'
                            : 'bg-slate-200/40'
                        }`}
                      />
                      {/* Net Profit Bar */}
                      <div
                        style={{ height: `${profitHeight}%` }}
                        className={`w-full max-w-[12px] sm:max-w-[16px] rounded-t-sm transition-all duration-300 ${
                          m.netProfit > 0
                            ? 'bg-emerald-500 group-hover:bg-emerald-600'
                            : 'bg-slate-200/40'
                        }`}
                      />
                      {/* OpEx Bar */}
                      <div
                        style={{ height: `${expHeight}%` }}
                        className={`w-full max-w-[12px] sm:max-w-[16px] rounded-t-sm transition-all duration-300 ${
                          m.expTotal > 0
                            ? 'bg-rose-400 group-hover:bg-rose-500'
                            : 'bg-slate-200/40'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis labels for 12 Months */}
            <div className="grid grid-cols-12 text-center text-[10px] sm:text-xs text-slate-600 font-semibold pt-2">
              {yearlyMatrix.map((m) => (
                <button
                  type="button"
                  key={m.shortName}
                  onClick={() => {
                    setSelectedMonthIndex(m.monthIndex);
                    setActiveSubTab('MONTHLY');
                  }}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {m.shortName}
                </button>
              ))}
            </div>
          </div>

          {/* 12-Month Financial Performance Table Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Matriks Keuangan & Laba Rugi 12 Bulan (Tahun {selectedYear})
                </h3>
                <p className="text-xs text-slate-500">
                  Ikhtisar bulanan lengkap dengan rincian beban operasional, laba kotor, dan laba bersih
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Bulan</th>
                    <th className="py-3 px-4 text-right">Volume (Liter)</th>
                    <th className="py-3 px-4 text-right">DO (KL)</th>
                    <th className="py-3 px-4 text-right">Omzet (Rp)</th>
                    <th className="py-3 px-4 text-right">Laba Kotor Margin</th>
                    <th className="py-3 px-4 text-right">Gaji & Lembur</th>
                    <th className="py-3 px-4 text-right">Utilitas & Servis</th>
                    <th className="py-3 px-4 text-right">Total Beban</th>
                    <th className="py-3 px-4 text-right">Laba Bersih</th>
                    <th className="py-3 px-4 text-center">Net Margin</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {yearlyMatrix.map((m) => (
                    <tr
                      key={m.monthKey}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !m.hasData ? 'text-slate-400 bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {m.monthName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                        {m.liters > 0 ? formatLiter(m.liters) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-blue-700">
                        {m.doKL > 0 ? `${m.doKL} KL` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {m.revenue > 0 ? formatRupiah(m.revenue) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                        {m.grossProfit > 0 ? formatRupiah(m.grossProfit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {m.gajiLembur > 0 ? formatRupiah(m.gajiLembur) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {m.utilitas + m.maintLain > 0 ? formatRupiah(m.utilitas + m.maintLain) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        {m.expTotal > 0 ? formatRupiah(m.expTotal) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800">
                        {m.netProfit !== 0 ? formatRupiah(m.netProfit) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {m.hasData ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
                            {m.netMargin}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthIndex(m.monthIndex);
                            setActiveSubTab('MONTHLY');
                          }}
                          className="px-2.5 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md font-semibold transition-colors cursor-pointer"
                        >
                          Lihat Bulan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3.5 px-4 uppercase text-[11px]">Total YTD {selectedYear}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-blue-900 font-black">
                      {formatLiter(yearTotalLiters)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-blue-900 font-black">
                      {formatNumber(yearTotalDOKL, 1)} KL
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-black">
                      {formatRupiah(yearTotalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-900 font-black">
                      {formatRupiah(yearTotalGrossProfit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700" colSpan={2}>
                      Total Akumulasi OpEx
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-800 font-black">
                      {formatRupiah(yearTotalExpenses)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-900 font-black">
                      {formatRupiah(yearTotalNetProfit)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      {yearTotalGrossProfit > 0
                        ? `${((yearTotalNetProfit / yearTotalGrossProfit) * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
