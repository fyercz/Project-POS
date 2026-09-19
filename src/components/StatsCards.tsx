import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Fuel,
  Award,
  DollarSign,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { SaleRecord, TankConfig } from '../types';
import {
  formatRupiah,
  formatNumber,
  formatLiter,
  formatShortDate,
  formatDateIndo,
  getTodayDateString,
  STANDARD_SHIFTS,
} from '../utils/formatters';

interface StatsCardsProps {
  todaySales: SaleRecord[];
  allSales: SaleRecord[];
  tank: TankConfig;
  currentUnitPrice: number;
  currentMarginPerLiter: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  todaySales,
  allSales,
  currentUnitPrice,
  currentMarginPerLiter,
}) => {
  const todayStr = getTodayDateString();

  // Find latest active date from history if today has no sales
  const sortedDates = useMemo(() => {
    return Array.from(new Set(allSales.map((s) => s.transactionDate))).sort();
  }, [allSales]);
  const latestActiveDate = sortedDates[sortedDates.length - 1];

  // Active view date mode (today by default; switchable to latest active date if today is empty)
  const [dateMode, setDateMode] = useState<'today' | 'latest'>(
    todaySales.length > 0 || !latestActiveDate ? 'today' : 'today'
  );

  const activeDate = dateMode === 'latest' && latestActiveDate ? latestActiveDate : todayStr;
  const isViewingToday = activeDate === todayStr;

  // Sales records for the selected active date
  const activeDaySales = useMemo(() => {
    if (isViewingToday) return todaySales;
    return allSales.filter((s) => s.transactionDate === activeDate);
  }, [isViewingToday, todaySales, allSales, activeDate]);

  // Today's aggregate numbers for the top 4 KPI cards
  const todayLiters = todaySales.reduce((acc, s) => acc + s.literSold, 0);
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const todayProfit = todaySales.reduce((acc, s) => acc + s.totalProfit, 0);
  const todayCash = todaySales.reduce((acc, s) => acc + s.paymentCash, 0);
  const todayNonCash = todaySales.reduce((acc, s) => acc + s.paymentQris + s.paymentEdc, 0);

  // Overall statistics for avg comparison
  const totalVolumeAll = allSales.reduce((acc, s) => acc + s.literSold, 0);
  const uniqueDates = sortedDates.length || 1;
  const avgDailyLiters = totalVolumeAll / uniqueDates;

  // Active Day Totals for the Shift Section
  const dayTotalLiters = activeDaySales.reduce((acc, s) => acc + s.literSold, 0);
  const dayTotalRevenue = activeDaySales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const dayTotalProfit = activeDaySales.reduce((acc, s) => acc + s.totalProfit, 0);

  // Shift 1 Data Extraction
  const shift1Records = activeDaySales.filter((s) => {
    const name = (s.shift || '').toLowerCase();
    return name.includes('shift 1') || name.includes('pagi');
  });
  const shift1HasData = shift1Records.length > 0;
  const shift1Liters = shift1Records.reduce((acc, s) => acc + s.literSold, 0);
  const shift1Revenue = shift1Records.reduce((acc, s) => acc + s.totalRevenue, 0);
  const shift1Profit = shift1Records.reduce((acc, s) => acc + s.totalProfit, 0);
  const shift1Cash = shift1Records.reduce((acc, s) => acc + s.paymentCash, 0);
  const shift1NonCash = shift1Records.reduce((acc, s) => acc + (s.paymentQris + s.paymentEdc), 0);
  const shift1Operators = Array.from(new Set(shift1Records.map((s) => s.operatorName))).join(', ') || 'Daslam';
  const shift1CashDiff = shift1Records.reduce((acc, s) => acc + (s.cashDifference || 0), 0);
  const shift1MarginRate = shift1Liters > 0 ? shift1Profit / shift1Liters : currentMarginPerLiter;
  const shift1LiterPercent = dayTotalLiters > 0 ? (shift1Liters / dayTotalLiters) * 100 : 0;
  const shift1RevenuePercent = dayTotalRevenue > 0 ? (shift1Revenue / dayTotalRevenue) * 100 : 0;

  // Shift 2 Data Extraction
  const shift2Records = activeDaySales.filter((s) => {
    const name = (s.shift || '').toLowerCase();
    return name.includes('shift 2') || name.includes('siang') || name.includes('sore');
  });
  const shift2HasData = shift2Records.length > 0;
  const shift2Liters = shift2Records.reduce((acc, s) => acc + s.literSold, 0);
  const shift2Revenue = shift2Records.reduce((acc, s) => acc + s.totalRevenue, 0);
  const shift2Profit = shift2Records.reduce((acc, s) => acc + s.totalProfit, 0);
  const shift2Cash = shift2Records.reduce((acc, s) => acc + s.paymentCash, 0);
  const shift2NonCash = shift2Records.reduce((acc, s) => acc + (s.paymentQris + s.paymentEdc), 0);
  const shift2Operators = Array.from(new Set(shift2Records.map((s) => s.operatorName))).join(', ') || 'Angga';
  const shift2CashDiff = shift2Records.reduce((acc, s) => acc + (s.cashDifference || 0), 0);
  const shift2MarginRate = shift2Liters > 0 ? shift2Profit / shift2Liters : currentMarginPerLiter;
  const shift2LiterPercent = dayTotalLiters > 0 ? (shift2Liters / dayTotalLiters) * 100 : 0;
  const shift2RevenuePercent = dayTotalRevenue > 0 ? (shift2Revenue / dayTotalRevenue) * 100 : 0;

  // Check for Full Day Shift
  const fullDayRecords = activeDaySales.filter((s) => {
    const name = (s.shift || '').toLowerCase();
    return name.includes('full');
  });
  const hasFullDayOnly = fullDayRecords.length > 0 && !shift1HasData && !shift2HasData;
  const fullDayLiters = fullDayRecords.reduce((acc, s) => acc + s.literSold, 0);
  const fullDayRevenue = fullDayRecords.reduce((acc, s) => acc + s.totalRevenue, 0);
  const fullDayProfit = fullDayRecords.reduce((acc, s) => acc + s.totalProfit, 0);
  const fullDayOperators = Array.from(new Set(fullDayRecords.map((s) => s.operatorName))).join(', ');
  const fullDayCash = fullDayRecords.reduce((acc, s) => acc + s.paymentCash, 0);
  const fullDayNonCash = fullDayRecords.reduce((acc, s) => acc + (s.paymentQris + s.paymentEdc), 0);
  const fullDayCashDiff = fullDayRecords.reduce((acc, s) => acc + (s.cashDifference || 0), 0);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. TOP 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* KPI 1: Volume Terjual Hari Ini */}
        <div
          id="kpi-volume-today"
          className="bg-white rounded-xl p-4 sm:p-4.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Volume Terjual Hari Ini
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {formatNumber(todayLiters, 1)}
                </span>
                <span className="text-xs font-bold text-slate-500">Liter</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80">
              <Fuel className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{todaySales.length} shift tercatat</span>
            <span className="font-semibold text-slate-700 font-mono">
              Avg: {Math.round(avgDailyLiters)} L/hari
            </span>
          </div>
        </div>

        {/* KPI 2: Total Omzet Hari Ini */}
        <div
          id="kpi-revenue-today"
          className="bg-white rounded-xl p-4 sm:p-4.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Total Omzet Penjualan
              </span>
              <div className="mt-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {formatRupiah(todayRevenue)}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Tunai: <strong className="text-slate-800 font-mono">{formatRupiah(todayCash)}</strong>
            </span>
            <span className="text-slate-500">
              QRIS: <strong className="text-slate-800 font-mono">{formatRupiah(todayNonCash)}</strong>
            </span>
          </div>
        </div>

        {/* KPI 3: Estimasi Laba/Margin Hari Ini */}
        <div
          id="kpi-profit-today"
          className="bg-white rounded-xl p-4 sm:p-4.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Estimasi Margin Dealer
              </span>
              <div className="mt-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono tracking-tight">
                  {formatRupiah(todayProfit)}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Margin Pertashop</span>
            <span className="font-bold text-emerald-700 font-mono">
              {formatRupiah(currentMarginPerLiter)} / Liter
            </span>
          </div>
        </div>

        {/* KPI 4: Tarif Pertamax Aktif */}
        <div
          id="kpi-current-unit-price"
          className="bg-white rounded-xl p-4 sm:p-4.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Tarif Pertamax Aktif
              </span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-blue-600 font-mono tracking-tight">
                  {formatRupiah(currentUnitPrice)}
                </span>
                <span className="text-xs text-slate-400 font-normal">/ L</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>RON 92 Non-Subsidi</span>
            <span className="font-semibold text-blue-700">Disesuaikan Tiap Hari</span>
          </div>
        </div>
      </div>

      {/* 2. RINGKASAN PERFORMA KEUANGAN PER SHIFT (Total Liter vs Omzet vs Estimasi Profit) */}
      <div
        id="shift-financial-performance-card"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4"
      >
        {/* Card Header with transparency context & date toggler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Performa Finansial Per Shift
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Transparansi Harian
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Komparasi real-time: <strong className="text-slate-700">Total Liter</strong> vs{' '}
              <strong className="text-slate-700">Omzet</strong> vs{' '}
              <strong className="text-slate-700">Estimasi Margin/Profit</strong> antar shift
            </p>
          </div>

          {/* Quick Date Toggle if today has no sales yet */}
          {latestActiveDate && latestActiveDate !== todayStr && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setDateMode('today')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                  isViewingToday
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Hari Ini {todaySales.length > 0 ? `(${todaySales.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setDateMode('latest')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                  !isViewingToday
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
                title={`Lihat data historis terakhir: ${formatShortDate(latestActiveDate)}`}
              >
                <span>Aktif Terakhir</span>
                <span className="text-[10px] opacity-75">({formatShortDate(latestActiveDate)})</span>
              </button>
            </div>
          )}
        </div>

        {/* Informative notification if viewing past active date */}
        {!isViewingToday && latestActiveDate && (
          <div className="px-3 py-2 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                Menampilkan data shift tanggal: <strong>{formatDateIndo(latestActiveDate)}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDateMode('today')}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-950 underline cursor-pointer"
            >
              Lihat Hari Ini
            </button>
          </div>
        )}

        {/* Shift Cards Grid */}
        {hasFullDayOnly ? (
          /* Case 1: Full Day Shift Recorded */
          <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Full Day Operasional (05.30 - 19.30)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  Full Shift
                </span>
              </div>
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <strong className="text-slate-800">{fullDayOperators || 'Operator'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-500 block">Total Liter</span>
                <span className="text-base font-extrabold font-mono text-blue-700">
                  {formatNumber(fullDayLiters, 1)} <span className="text-xs font-normal">L</span>
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-500 block">Omzet Penjualan</span>
                <span className="text-base font-extrabold font-mono text-slate-900">
                  {formatRupiah(fullDayRevenue)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Tunai: {formatRupiah(fullDayCash)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-500 block">Estimasi Profit</span>
                <span className="text-base font-extrabold font-mono text-emerald-700">
                  {formatRupiah(fullDayProfit)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  Margin: Rp {formatNumber(fullDayLiters > 0 ? fullDayProfit / fullDayLiters : currentMarginPerLiter, 0)}/L
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Case 2: Standard Shift 1 vs Shift 2 Comparison */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Shift 1 Card */}
            <div
              id="shift-1-performance-card"
              className={`rounded-xl p-3.5 sm:p-4 border transition-all flex flex-col justify-between gap-3 ${
                shift1HasData
                  ? 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200/80 shadow-2xs'
                  : 'bg-slate-50/60 border-slate-200/80'
              }`}
            >
              {/* Shift 1 Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Shift 1 <span className="font-normal text-slate-500">(05.30 - 13.30)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" />
                      Operator: <strong className="text-slate-700">{shift1Operators}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  {shift1HasData ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Terekap
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Menunggu Data
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Core Financial Metrics */}
              <div className="space-y-2">
                {/* 1. Total Liter */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Fuel className="w-3.5 h-3.5 text-blue-600" />
                    <span>Total Liter:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-blue-700">
                      {formatNumber(shift1Liters, 1)} L
                    </span>
                    {dayTotalLiters > 0 && shift1HasData && (
                      <span className="text-[10px] text-slate-400 block">
                        ({shift1LiterPercent.toFixed(1)}% harian)
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Total Omzet */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <DollarSign className="w-3.5 h-3.5 text-slate-600" />
                    <span>Total Omzet:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-slate-900">
                      {formatRupiah(shift1Revenue)}
                    </span>
                    {shift1HasData && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Tunai: {formatRupiah(shift1Cash)} | QRIS: {formatRupiah(shift1NonCash)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Estimasi Profit */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Estimasi Profit:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-emerald-700">
                      {formatRupiah(shift1Profit)}
                    </span>
                    <span className="text-[10px] text-emerald-600/90 block">
                      Margin: Rp {formatNumber(shift1MarginRate, 0)}/L
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift 1 Footer Rekonsiliasi Kas */}
              {shift1HasData && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Status Rekonsiliasi:</span>
                  {shift1CashDiff === 0 ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Kas Klop / Pas
                    </span>
                  ) : shift1CashDiff > 0 ? (
                    <span className="font-semibold text-blue-700 font-mono">
                      Lebih +{formatRupiah(shift1CashDiff)}
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-600 font-mono">
                      Kurang -{formatRupiah(Math.abs(shift1CashDiff))}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Shift 2 Card */}
            <div
              id="shift-2-performance-card"
              className={`rounded-xl p-3.5 sm:p-4 border transition-all flex flex-col justify-between gap-3 ${
                shift2HasData
                  ? 'bg-gradient-to-b from-indigo-50/50 to-white border-indigo-200/80 shadow-2xs'
                  : 'bg-slate-50/60 border-slate-200/80'
              }`}
            >
              {/* Shift 2 Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Shift 2 <span className="font-normal text-slate-500">(13.30 - 19.30)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" />
                      Operator: <strong className="text-slate-700">{shift2Operators}</strong>
                    </span>
                  </div>
                </div>

                <div>
                  {shift2HasData ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Terekap
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Menunggu Data
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Core Financial Metrics */}
              <div className="space-y-2">
                {/* 1. Total Liter */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Fuel className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Total Liter:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-indigo-700">
                      {formatNumber(shift2Liters, 1)} L
                    </span>
                    {dayTotalLiters > 0 && shift2HasData && (
                      <span className="text-[10px] text-slate-400 block">
                        ({shift2LiterPercent.toFixed(1)}% harian)
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Total Omzet */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <DollarSign className="w-3.5 h-3.5 text-slate-600" />
                    <span>Total Omzet:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-slate-900">
                      {formatRupiah(shift2Revenue)}
                    </span>
                    {shift2HasData && (
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Tunai: {formatRupiah(shift2Cash)} | QRIS: {formatRupiah(shift2NonCash)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Estimasi Profit */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Estimasi Profit:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono text-emerald-700">
                      {formatRupiah(shift2Profit)}
                    </span>
                    <span className="text-[10px] text-emerald-600/90 block">
                      Margin: Rp {formatNumber(shift2MarginRate, 0)}/L
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift 2 Footer Rekonsiliasi Kas */}
              {shift2HasData && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Status Rekonsiliasi:</span>
                  {shift2CashDiff === 0 ? (
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Kas Klop / Pas
                    </span>
                  ) : shift2CashDiff > 0 ? (
                    <span className="font-semibold text-blue-700 font-mono">
                      Lebih +{formatRupiah(shift2CashDiff)}
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-600 font-mono">
                      Kurang -{formatRupiah(Math.abs(shift2CashDiff))}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. VISUAL DISTRIBUTION BAR (Liter Shift 1 vs Shift 2) */}
        {dayTotalLiters > 0 && !hasFullDayOnly && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Shift 1: <strong>{shift1LiterPercent.toFixed(1)}%</strong> ({formatNumber(shift1Liters, 1)} L)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Shift 2: <strong>{shift2LiterPercent.toFixed(1)}%</strong> ({formatNumber(shift2Liters, 1)} L)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
              <div
                style={{ width: `${Math.max(shift1LiterPercent, 0)}%` }}
                className="h-full bg-blue-600 transition-all duration-500"
                title={`Shift 1: ${shift1LiterPercent.toFixed(1)}%`}
              />
              <div
                style={{ width: `${Math.max(shift2LiterPercent, 0)}%` }}
                className="h-full bg-indigo-600 transition-all duration-500"
                title={`Shift 2: ${shift2LiterPercent.toFixed(1)}%`}
              />
            </div>
          </div>
        )}

        {/* 4. TOTAL FOOTER FOR DAILY SHIFT TRANSPARENCY */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Total Hari Ini:</span>
            <span className="font-mono font-bold text-slate-900">
              {formatNumber(dayTotalLiters, 1)} L
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono font-bold text-slate-900">
              {formatRupiah(dayTotalRevenue)}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono font-bold text-emerald-700">
              Laba: {formatRupiah(dayTotalProfit)}
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            {isViewingToday
              ? '* Data diperbarui otomatis setiap pergantian shift'
              : `* Arsip operasional ${formatShortDate(activeDate)}`}
          </div>
        </div>
      </div>
    </div>
  );
};

