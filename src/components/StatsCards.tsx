import React from 'react';
import { TrendingUp, Fuel, Award, DollarSign } from 'lucide-react';
import { SaleRecord, TankConfig } from '../types';
import { formatRupiah, formatNumber } from '../utils/formatters';

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
  // Today's numbers
  const todayLiters = todaySales.reduce((acc, s) => acc + s.literSold, 0);
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const todayProfit = todaySales.reduce((acc, s) => acc + s.totalProfit, 0);
  const todayCash = todaySales.reduce((acc, s) => acc + s.paymentCash, 0);
  const todayNonCash = todaySales.reduce((acc, s) => acc + s.paymentQris + s.paymentEdc, 0);

  // Overall statistics
  const totalVolumeAll = allSales.reduce((acc, s) => acc + s.literSold, 0);
  const uniqueDates = Array.from(new Set(allSales.map((s) => s.transactionDate))).length || 1;
  const avgDailyLiters = totalVolumeAll / uniqueDates;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      {/* 1. Volume Terjual Hari Ini */}
      <div
        id="kpi-volume-today"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Volume Terjual Hari Ini
            </span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatNumber(todayLiters, 1)}
              </span>
              <span className="text-xs font-bold text-slate-500">Liter</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Fuel className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{todaySales.length} transaksi/shift</span>
          <span className="font-semibold text-slate-700 font-mono">
            Avg: {Math.round(avgDailyLiters)} L/hari
          </span>
        </div>
      </div>

      {/* 2. Total Omzet Hari Ini */}
      <div
        id="kpi-revenue-today"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Total Omzet Penjualan
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                {formatRupiah(todayRevenue)}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Tunai: <strong className="text-slate-800 font-mono">{formatRupiah(todayCash)}</strong>
          </span>
          <span className="text-slate-500">
            QRIS: <strong className="text-slate-800 font-mono">{formatRupiah(todayNonCash)}</strong>
          </span>
        </div>
      </div>

      {/* 3. Estimasi Laba/Margin Hari Ini */}
      <div
        id="kpi-profit-today"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Estimasi Margin Dealer
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono tracking-tight">
                {formatRupiah(todayProfit)}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Margin Pertashop</span>
          <span className="font-bold text-emerald-700 font-mono">
            {formatRupiah(currentMarginPerLiter)} / Liter
          </span>
        </div>
      </div>

      {/* 4. Harga Satuan BBM */}
      <div
        id="kpi-current-unit-price"
        className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Tarif Pertamax Aktif
            </span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-xl sm:text-2xl font-extrabold text-blue-600 font-mono tracking-tight">
                {formatRupiah(currentUnitPrice)}
              </span>
              <span className="text-xs text-slate-400 font-normal">/ L</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>RON 92 Non-Subsidi</span>
          <span className="font-semibold text-blue-700">Disesuaikan Tiap Hari</span>
        </div>
      </div>
    </div>
  );
};
