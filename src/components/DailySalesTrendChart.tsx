import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Droplets,
  Activity,
  Clock,
  Filter,
  User,
  Check,
} from 'lucide-react';
import { SaleRecord } from '../types';
import { formatRupiah, formatNumber, formatShortDate, formatDateIndo } from '../utils/formatters';

export type ShiftFilterOption = 'all' | 'shift1' | 'shift2' | 'fullday';

interface DailySalesTrendChartProps {
  sales: SaleRecord[];
  selectedShift?: ShiftFilterOption;
  onShiftChange?: (shift: ShiftFilterOption) => void;
}

interface DailyAggregatedData {
  date: string;
  dayNumber: string;
  shortLabel: string;
  fullDate: string;
  liters: number;
  revenue: number;
  profit: number;
  transactions: number;
  operators: string[];
  shifts: string[];
  movingAverage7d?: number;
}

export function matchShiftFilter(shiftStr: string, filter: ShiftFilterOption): boolean {
  if (filter === 'all') return true;
  const s = (shiftStr || '').toLowerCase();
  if (filter === 'shift1') {
    return s.includes('shift 1') || s.includes('shift1') || s.includes('pagi');
  }
  if (filter === 'shift2') {
    return s.includes('shift 2') || s.includes('shift2') || s.includes('siang') || s.includes('sore');
  }
  if (filter === 'fullday') {
    return s.includes('full') || s.includes('fullday');
  }
  return false;
}

export const DailySalesTrendChart: React.FC<DailySalesTrendChartProps> = ({
  sales,
  selectedShift: externalShift,
  onShiftChange,
}) => {
  const [internalShift, setInternalShift] = useState<ShiftFilterOption>('all');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);

  // Active shift filter (controlled or uncontrolled)
  const activeShift = externalShift !== undefined ? externalShift : internalShift;

  const handleShiftSelect = (shift: ShiftFilterOption) => {
    if (onShiftChange) {
      onShiftChange(shift);
    } else {
      setInternalShift(shift);
    }
  };

  // Filter sales based on activeShift
  const filteredSales = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    if (activeShift === 'all') return sales;
    return sales.filter((s) => matchShiftFilter(s.shift, activeShift));
  }, [sales, activeShift]);

  // Overall volume across all shifts (for calculating percentage share)
  const overallAllShiftsVolume = useMemo(() => {
    if (!sales) return 0;
    return sales.reduce((acc, s) => acc + s.literSold, 0);
  }, [sales]);

  // Generate 30-day continuous dataset for the filtered sales
  const { chartData, stats } = useMemo(() => {
    if (!sales || sales.length === 0) {
      return {
        chartData: [] as DailyAggregatedData[],
        stats: {
          totalLiters: 0,
          avgLiters: 0,
          maxDay: null as DailyAggregatedData | null,
          minDay: null as DailyAggregatedData | null,
          totalRevenue: 0,
          totalProfit: 0,
          activeDaysCount: 0,
        },
      };
    }

    // Group filtered sales by transactionDate
    const salesMap: Record<
      string,
      {
        liters: number;
        revenue: number;
        profit: number;
        count: number;
        operators: Set<string>;
        shifts: Set<string>;
      }
    > = {};

    filteredSales.forEach((s) => {
      const d = s.transactionDate;
      if (!salesMap[d]) {
        salesMap[d] = {
          liters: 0,
          revenue: 0,
          profit: 0,
          count: 0,
          operators: new Set(),
          shifts: new Set(),
        };
      }
      salesMap[d].liters += s.literSold;
      salesMap[d].revenue += s.totalRevenue;
      salesMap[d].profit += s.totalProfit;
      salesMap[d].count += 1;
      if (s.operatorName) salesMap[d].operators.add(s.operatorName);
      if (s.shift) salesMap[d].shifts.add(s.shift);
    });

    // Find reference end date from entire sales history or today
    const allKnownDates = Array.from(new Set<string>(sales.map((s) => s.transactionDate))).sort();
    const latestSaleDateStr = allKnownDates[allKnownDates.length - 1] || new Date().toISOString().split('T')[0];

    const [year, month, day] = latestSaleDateStr.split('-').map(Number);
    const endDate = new Date(year, month - 1, day);

    // Build array of 30 consecutive calendar days ending at endDate
    const days: DailyAggregatedData[] = [];
    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(endDate);
      targetDate.setDate(endDate.getDate() - i);

      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const existing = salesMap[dateKey];
      const liters = existing ? Math.round(existing.liters * 10) / 10 : 0;
      const revenue = existing ? existing.revenue : 0;
      const profit = existing ? existing.profit : 0;
      const count = existing ? existing.count : 0;
      const operators = existing ? Array.from(existing.operators) : [];
      const shifts = existing ? Array.from(existing.shifts) : [];

      days.push({
        date: dateKey,
        dayNumber: dd,
        shortLabel: formatShortDate(dateKey),
        fullDate: formatDateIndo(dateKey),
        liters,
        revenue,
        profit,
        transactions: count,
        operators,
        shifts,
      });
    }

    // Calculate 7-day moving average for smoothing trend
    days.forEach((dayItem, idx) => {
      const windowStart = Math.max(0, idx - 6);
      const windowItems = days.slice(windowStart, idx + 1);
      const windowSum = windowItems.reduce((acc, curr) => acc + curr.liters, 0);
      dayItem.movingAverage7d = Math.round((windowSum / windowItems.length) * 10) / 10;
    });

    // Compute summary stats
    const totalLiters = days.reduce((acc, d) => acc + d.liters, 0);
    const totalRevenue = days.reduce((acc, d) => acc + d.revenue, 0);
    const totalProfit = days.reduce((acc, d) => acc + d.profit, 0);
    const activeDays = days.filter((d) => d.liters > 0);
    const activeDaysCount = activeDays.length;
    const avgLiters = activeDaysCount > 0 ? Math.round(totalLiters / activeDaysCount) : 0;

    let maxDay: DailyAggregatedData | null = null;
    let minDay: DailyAggregatedData | null = null;

    if (activeDays.length > 0) {
      maxDay = activeDays.reduce((max, d) => (d.liters > max.liters ? d : max), activeDays[0]);
      minDay = activeDays.reduce((min, d) => (d.liters < min.liters ? d : min), activeDays[0]);
    }

    return {
      chartData: days,
      stats: {
        totalLiters,
        avgLiters,
        maxDay,
        minDay,
        totalRevenue,
        totalProfit,
        activeDaysCount,
      },
    };
  }, [sales, filteredSales]);

  const maxLitersValue = useMemo(() => {
    if (chartData.length === 0) return 1000;
    const peak = Math.max(...chartData.map((d) => d.liters), 0);
    return peak > 0 ? Math.ceil((peak * 1.15) / 50) * 50 : 800;
  }, [chartData]);

  // Color config based on selected shift
  const shiftTheme = useMemo(() => {
    switch (activeShift) {
      case 'shift1':
        return {
          name: 'Shift 1 (05.30 - 13.30)',
          shortName: 'Shift 1',
          timeDesc: 'Pagi: 05.30 - 13.30',
          strokeColor: '#0284c7', // sky-600
          activeDotColor: '#0369a1',
          gradientStart: '#0284c7',
          gradientEnd: '#38bdf8',
          barGradientStart: '#38bdf8',
          barGradientEnd: '#0284c7',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'shift2':
        return {
          name: 'Shift 2 (13.30 - 19.30)',
          shortName: 'Shift 2',
          timeDesc: 'Siang/Sore: 13.30 - 19.30',
          strokeColor: '#6366f1', // indigo-500
          activeDotColor: '#4f46e5',
          gradientStart: '#6366f1',
          gradientEnd: '#a5b4fc',
          barGradientStart: '#818cf8',
          barGradientEnd: '#4f46e5',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'fullday':
        return {
          name: 'Full Day (05.30 - 19.30)',
          shortName: 'Full Day',
          timeDesc: 'Operasional Penuh: 05.30 - 19.30',
          strokeColor: '#d97706', // amber-600
          activeDotColor: '#b45309',
          gradientStart: '#d97706',
          gradientEnd: '#fcd34d',
          barGradientStart: '#fbbf24',
          barGradientEnd: '#b45309',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      default:
        return {
          name: 'Semua Shift',
          shortName: 'Semua Shift',
          timeDesc: 'Total Harian Akumulasi Seluruh Shift',
          strokeColor: '#2563eb', // blue-600
          activeDotColor: '#1d4ed8',
          gradientStart: '#2563eb',
          gradientEnd: '#06b6d4',
          barGradientStart: '#38bdf8',
          barGradientEnd: '#1d4ed8',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        };
    }
  }, [activeShift]);

  return (
    <div
      id="analytics-daily-sales-trend-chart"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5"
    >
      {/* 1. Header & Shift Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  Tren Volume Penjualan Harian (30 Hari)
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${shiftTheme.badgeClass}`}
                >
                  {shiftTheme.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {shiftTheme.timeDesc} • Analisis tren pergerakan volume BBM terjual (Liter)
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Chart View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batang (Bar)</span>
            </button>
          </div>

          {/* Moving Average Toggle */}
          <button
            type="button"
            onClick={() => setShowMovingAverage(!showMovingAverage)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              showMovingAverage
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Tampilkan garis rata-rata bergerak 7 hari"
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>MA 7 Hari</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Shift Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/90">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Shift:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Semua Shift */}
          <button
            type="button"
            onClick={() => handleShiftSelect('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeShift === 'all'
                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Semua Shift</span>
          </button>

          {/* Shift 1 */}
          <button
            type="button"
            onClick={() => handleShiftSelect('shift1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeShift === 'shift1'
                ? 'bg-sky-600 text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${activeShift === 'shift1' ? 'bg-sky-200' : 'bg-sky-500'}`}
            />
            <span>Shift 1 (05.30 - 13.30)</span>
          </button>

          {/* Shift 2 */}
          <button
            type="button"
            onClick={() => handleShiftSelect('shift2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeShift === 'shift2'
                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${activeShift === 'shift2' ? 'bg-indigo-200' : 'bg-indigo-500'}`}
            />
            <span>Shift 2 (13.30 - 19.30)</span>
          </button>

          {/* Full Day */}
          <button
            type="button"
            onClick={() => handleShiftSelect('fullday')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeShift === 'fullday'
                ? 'bg-amber-600 text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${activeShift === 'fullday' ? 'bg-amber-200' : 'bg-amber-500'}`}
            />
            <span>Full Day (05.30 - 19.30)</span>
          </button>
        </div>
      </div>

      {/* 3. KPI Stats Summary Cards for the selected Shift */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* KPI 1: Volume */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-blue-800 text-xs font-medium">
            <span>Total Volume ({shiftTheme.shortName})</span>
            <Droplets className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-blue-950 mt-1">
            {formatNumber(stats.totalLiters, 0)} <span className="text-xs font-normal">L</span>
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5 flex items-center justify-between">
            <span>Omzet: {formatRupiah(stats.totalRevenue)}</span>
            {activeShift !== 'all' && overallAllShiftsVolume > 0 && (
              <span className="font-bold">
                {((stats.totalLiters / overallAllShiftsVolume) * 100).toFixed(1)}% porsi
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Rata-Rata */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-medium">
            <span>Rata-Rata Harian</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-950 mt-1">
            {formatNumber(stats.avgLiters, 0)} <span className="text-xs font-normal">L/hari</span>
          </div>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">
            Dari {stats.activeDaysCount} hari aktif tercatat
          </span>
        </div>

        {/* KPI 3: Peak Volume */}
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-medium">
            <span>Peak ({shiftTheme.shortName})</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-indigo-950 mt-1">
            {stats.maxDay && stats.maxDay.liters > 0 ? `${formatNumber(stats.maxDay.liters, 0)} L` : '-'}
          </div>
          <span className="text-[10px] text-indigo-700 mt-0.5 block truncate">
            {stats.maxDay && stats.maxDay.liters > 0 ? stats.maxDay.shortLabel : 'Tidak ada data'}
          </span>
        </div>

        {/* KPI 4: Estimasi Profit */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-amber-800 text-xs font-medium">
            <span>Estimasi Margin ({shiftTheme.shortName})</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-amber-950 mt-1">
            {formatRupiah(stats.totalProfit)}
          </div>
          <span className="text-[10px] text-amber-700 mt-0.5 block truncate">
            {stats.minDay && stats.minDay.liters > 0
              ? `Min: ${formatNumber(stats.minDay.liters, 0)} L (${stats.minDay.shortLabel})`
              : 'Margin dealer operasional'}
          </span>
        </div>
      </div>

      {/* 4. Chart Canvas Area */}
      <div className="pt-2">
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Belum ada data transaksi penjualan untuk shift ini.
          </div>
        ) : (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <defs>
                  {/* Dynamic Gradient Area based on shift theme */}
                  <linearGradient id="shiftLiterAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={shiftTheme.gradientStart} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={shiftTheme.gradientEnd} stopOpacity={0.02} />
                  </linearGradient>
                  {/* Dynamic Gradient Bar */}
                  <linearGradient id="shiftLiterBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={shiftTheme.barGradientStart} />
                    <stop offset="100%" stopColor={shiftTheme.barGradientEnd} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />

                <YAxis
                  domain={[0, maxLitersValue]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val} L`}
                />

                <Tooltip content={<CustomTooltip activeShiftName={shiftTheme.shortName} />} />

                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  formatter={(value) => (
                    <span className="font-semibold text-slate-700">{value}</span>
                  )}
                />

                {/* Rata-Rata Reference Line */}
                {stats.avgLiters > 0 && (
                  <ReferenceLine
                    y={stats.avgLiters}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Rata-rata ${shiftTheme.shortName}: ${stats.avgLiters} L`,
                      position: 'top',
                      fill: '#059669',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {/* Main Volume Representation: Area vs Bar */}
                {chartType === 'area' ? (
                  <Area
                    type="monotone"
                    name={`Volume ${shiftTheme.shortName} (Liter)`}
                    dataKey="liters"
                    stroke={shiftTheme.strokeColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#shiftLiterAreaGradient)"
                    activeDot={{
                      r: 6,
                      stroke: shiftTheme.activeDotColor,
                      strokeWidth: 2,
                      fill: '#ffffff',
                    }}
                  />
                ) : (
                  <Bar
                    name={`Volume ${shiftTheme.shortName} (Liter)`}
                    dataKey="liters"
                    fill="url(#shiftLiterBarGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                )}

                {/* 7-Day Moving Average Line */}
                {showMovingAverage && (
                  <Line
                    type="monotone"
                    name="Tren MA (7 Hari)"
                    dataKey="movingAverage7d"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 5. Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: shiftTheme.strokeColor }}
          />
          <span>Shift Terpilih: <strong>{shiftTheme.name}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Garis Putus-Putus: Rata-Rata Penjualan Shift</span>
        </div>
        <div className="text-[11px] text-slate-400">
          * Menampilkan data 30 hari kalender berkelanjutan
        </div>
      </div>
    </div>
  );
};

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
  payload: DailyAggregatedData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  activeShiftName?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, activeShiftName }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-xl p-3 shadow-xl min-w-[220px] text-xs">
      <div className="font-bold text-cyan-300 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between gap-2">
        <span>{data.fullDate}</span>
        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono font-normal">
          {data.transactions} entri {activeShiftName ? `(${activeShiftName})` : ''}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            Volume BBM:
          </span>
          <span className="font-mono font-bold text-white text-sm">
            {formatNumber(data.liters, 1)} Liter
          </span>
        </div>

        {data.revenue > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              Omzet Penjualan:
            </span>
            <span className="font-mono font-bold text-emerald-300">
              {formatRupiah(data.revenue)}
            </span>
          </div>
        )}

        {data.profit > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Laba Margin:
            </span>
            <span className="font-mono font-bold text-amber-300">
              {formatRupiah(data.profit)}
            </span>
          </div>
        )}

        {data.operators && data.operators.length > 0 && (
          <div className="flex items-center justify-between gap-3 text-slate-300 pt-1 border-t border-slate-800 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <User className="w-3 h-3" />
              Operator:
            </span>
            <span className="font-semibold text-slate-200">
              {data.operators.join(', ')}
            </span>
          </div>
        )}

        {typeof data.movingAverage7d === 'number' && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Rata-rata 7 Hari:</span>
            <span className="font-mono text-amber-400 font-semibold">
              {formatNumber(data.movingAverage7d, 1)} L
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

