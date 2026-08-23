import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Fuel,
  Award,
  BarChart3,
  Calculator,
  PieChart,
  ShieldCheck,
  Receipt,
  UserCheck,
  Zap,
  Droplets,
  Wrench,
  Clock,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { Product, SaleRecord, TankConfig, ExpenseRecord, EXPENSE_RATES } from '../types';
import { formatRupiah, formatNumber, formatLiter, formatShortDate } from '../utils/formatters';

interface AnalyticsViewProps {
  sales: SaleRecord[];
  products: Product[];
  tank: TankConfig;
  expenses: ExpenseRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  sales,
  products,
  tank,
  expenses = [],
}) => {
  const pertamax = products.find((p) => p.id === 'prod-pertamax-92') || products[0];
  const [simulatedSalesVolume, setSimulatedSalesVolume] = useState<number>(1000); // 1.000 L / hari
  const [simulatedMargin, setSimulatedMargin] = useState<number>(pertamax?.marginPerLiter || 850);
  const [simOperatorsCount, setSimOperatorsCount] = useState<number>(2); // 2 operator shift
  const [simOvertimeShifts, setSimOvertimeShifts] = useState<number>(10); // 10 shift lembur / bulan
  const [simElectricityCost, setSimElectricityCost] = useState<number>(300000); // Rp 300k listrik / bln
  const [simPdamCost, setSimPdamCost] = useState<number>(80000); // Rp 80k pdam / bln
  const [simMaintenanceCost, setSimMaintenanceCost] = useState<number>(150000); // Rp 150k maintenance / bln

  // Group sales by date for daily trend
  const salesByDate: Record<string, { liters: number; revenue: number; profit: number }> = {};
  sales.forEach((s) => {
    if (!salesByDate[s.transactionDate]) {
      salesByDate[s.transactionDate] = { liters: 0, revenue: 0, profit: 0 };
    }
    salesByDate[s.transactionDate].liters += s.literSold;
    salesByDate[s.transactionDate].revenue += s.totalRevenue;
    salesByDate[s.transactionDate].profit += s.totalProfit;
  });

  const datesList = Object.keys(salesByDate).sort().slice(-7);
  const maxDailyLiter = Math.max(...datesList.map((d) => salesByDate[d].liters), 1);

  // Total Gross Revenue & Margin from Sales
  const totalVolumeSold = sales.reduce((acc, s) => acc + s.literSold, 0);
  const totalCash = sales.reduce((acc, s) => acc + s.paymentCash, 0);
  const totalQris = sales.reduce((acc, s) => acc + s.paymentQris, 0);
  const totalEdc = sales.reduce((acc, s) => acc + s.paymentEdc, 0);
  const totalRevenue = totalCash + totalQris + totalEdc;
  const totalGrossProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);

  const cashPercent = totalRevenue > 0 ? (totalCash / totalRevenue) * 100 : 0;
  const qrisPercent = totalRevenue > 0 ? (totalQris / totalRevenue) * 100 : 0;
  const edcPercent = totalRevenue > 0 ? (totalEdc / totalRevenue) * 100 : 0;

  // Total Expenses by Category
  const totalGaji = expenses
    .filter((e) => e.category === 'GAJI_OPERATOR')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalLembur = expenses
    .filter((e) => e.category === 'LEMBURAN')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalListrik = expenses
    .filter((e) => e.category === 'TOKEN_LISTRIK')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalPdam = expenses
    .filter((e) => e.category === 'PDAM')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalMaintenance = expenses
    .filter((e) => e.category === 'MAINTENANCE_ALAT')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalLainnya = expenses
    .filter((e) => e.category === 'LAINNYA')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = totalGaji + totalLembur + totalListrik + totalPdam + totalMaintenance + totalLainnya;
  const netProfit = totalGrossProfit - totalExpenses;
  const netProfitMarginRatio = totalGrossProfit > 0 ? (netProfit / totalGrossProfit) * 100 : 0;

  // Simulation calculations (Monthly)
  const simGrossMonthlyProfit = simulatedSalesVolume * simulatedMargin * 30;
  const simMonthlyWages = simOperatorsCount * EXPENSE_RATES.GAJI_OPERATOR_PER_HARI * 30; // 2 * 40k * 30 = Rp 2.400.000
  const simMonthlyOvertime = simOvertimeShifts * EXPENSE_RATES.LEMBURAN_PER_SHIFT; // 10 * 30k = Rp 300.000
  const simMonthlyExpenses =
    simMonthlyWages +
    simMonthlyOvertime +
    simElectricityCost +
    simPdamCost +
    simMaintenanceCost;
  const simNetMonthlyProfit = simGrossMonthlyProfit - simMonthlyExpenses;
  const simNetYearlyProfit = simNetMonthlyProfit * 12;

  return (
    <div className="space-y-6">
      {/* 1. Executive P&L Financial Summary (Laba Kotor vs Beban Operasional vs Laba Bersih) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
              Ringkasan Finansial & Laba Bersih
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Laba Bersih Operasional Pertashop
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold font-mono">
              Margin Bersih: {netProfitMarginRatio.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          {/* Laba Kotor Margin BBM */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
            <span className="text-xs text-slate-400 block">Total Laba Kotor (Margin BBM)</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
              +{formatRupiah(totalGrossProfit)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Dari {formatNumber(totalVolumeSold, 1)} Liter @ {formatRupiah(pertamax.marginPerLiter)}/L
            </span>
          </div>

          {/* Total Beban Pengeluaran */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xs">
            <span className="text-xs text-slate-400 block">Total Beban & Biaya Operasional</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-400 mt-1">
              -{formatRupiah(totalExpenses)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Gaji, Lembur, Listrik, PDAM, Maintenance
            </span>
          </div>

          {/* Laba Bersih Riil */}
          <div className="bg-blue-600/30 border border-blue-400/40 rounded-xl p-4 backdrop-blur-xs">
            <span className="text-xs text-cyan-300 font-bold block">Laba Bersih Riil (Net Profit)</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-200 mt-1">
              {formatRupiah(netProfit)}
            </div>
            <span className="text-[11px] text-cyan-300/80 mt-1 block">
              Profit Dealer setelah dipotong seluruh beban
            </span>
          </div>
        </div>
      </div>

      {/* 2. Operational Expenses Breakdown Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              Komposisi Pengeluaran Operasional (Cost Breakdown)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi biaya gaji harian, lemburan, utilitas energi, dan pemeliharaan dispenser
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
            Total Beban: {formatRupiah(totalExpenses)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-5">
          {/* Gaji */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60">
            <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Gaji Operator
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-blue-950 mt-1.5">
              {formatRupiah(totalGaji)}
            </div>
            <span className="text-[10px] text-blue-700 mt-0.5 block font-medium">
              Rate Rp 40.000/hari
            </span>
          </div>

          {/* Lemburan */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <Clock className="w-4 h-4 text-amber-600" />
              Lemburan Shift
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-amber-950 mt-1.5">
              {formatRupiah(totalLembur)}
            </div>
            <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">
              Rate Rp 30.000/shift
            </span>
          </div>

          {/* Listrik */}
          <div className="p-3.5 rounded-xl border border-yellow-200 bg-yellow-50/60">
            <div className="flex items-center gap-1.5 text-yellow-900 font-bold text-xs">
              <Zap className="w-4 h-4 text-yellow-600" />
              Token Listrik
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-yellow-950 mt-1.5">
              {formatRupiah(totalListrik)}
            </div>
            <span className="text-[10px] text-yellow-800 mt-0.5 block font-medium">
              PLN Prabayar
            </span>
          </div>

          {/* PDAM */}
          <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/60">
            <div className="flex items-center gap-1.5 text-cyan-900 font-bold text-xs">
              <Droplets className="w-4 h-4 text-cyan-600" />
              PDAM Air
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-cyan-950 mt-1.5">
              {formatRupiah(totalPdam)}
            </div>
            <span className="text-[10px] text-cyan-800 mt-0.5 block font-medium">
              Air Bersih
            </span>
          </div>

          {/* Maintenance */}
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
              <Wrench className="w-4 h-4 text-indigo-600" />
              Maintenance Alat
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-950 mt-1.5">
              {formatRupiah(totalMaintenance)}
            </div>
            <span className="text-[10px] text-indigo-800 mt-0.5 block font-medium">
              Dispenser & Nozzle
            </span>
          </div>
        </div>
      </div>

      {/* 3. Daily Volume Trend Visualizer (Pure CSS bar chart) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Tren Penjualan Harian (7 Hari Terakhir)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Grafik pergerakan liter Pertamax yang terjual per hari
            </p>
          </div>
        </div>

        <div className="pt-6">
          {datesList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">Belum ada data transaksi.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pb-2 border-b border-slate-200">
                {datesList.map((dateKey) => {
                  const data = salesByDate[dateKey];
                  const heightPercent = Math.max(12, (data.liters / maxDailyLiter) * 100);

                  return (
                    <div key={dateKey} className="flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-mono font-bold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatNumber(data.liters)} L
                      </div>
                      <div
                        className="w-full max-w-[40px] bg-gradient-to-t from-blue-700 to-cyan-500 rounded-t-xl group-hover:from-blue-600 group-hover:to-cyan-400 transition-all relative cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                        title={`${formatShortDate(dateKey)}: ${formatNumber(data.liters)} L (${formatRupiah(data.revenue)})`}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-t-xl" />
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-2 whitespace-nowrap">
                        {formatShortDate(dateKey)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>0 L</span>
                <span>Maks: {formatNumber(maxDailyLiter)} L/hari</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Payment Methods Breakdown & Comprehensive Profit Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Breakdown Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-600" />
              Komposisi Metode Pembayaran
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rasio transaksi Tunai (Cash) vs Digital QRIS/MyPertamina
            </p>

            {/* Percentage Progress Bar */}
            <div className="mt-5 space-y-2">
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-600 h-full transition-all"
                  style={{ width: `${cashPercent}%` }}
                  title={`Tunai: ${cashPercent.toFixed(1)}%`}
                />
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${qrisPercent}%` }}
                  title={`QRIS: ${qrisPercent.toFixed(1)}%`}
                />
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${edcPercent}%` }}
                  title={`EDC: ${edcPercent.toFixed(1)}%`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-emerald-900 block">TUNAI (CASH)</span>
                  <span className="text-base font-black font-mono text-emerald-800 block mt-0.5">
                    {cashPercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700">
                    {formatRupiah(totalCash)}
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-blue-900 block">QRIS / MYPERTAMINA</span>
                  <span className="text-base font-black font-mono text-blue-800 block mt-0.5">
                    {qrisPercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] font-mono text-blue-700">
                    {formatRupiah(totalQris)}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold text-amber-900 block">EDC / DEBIT</span>
                  <span className="text-base font-black font-mono text-amber-800 block mt-0.5">
                    {edcPercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] font-mono text-amber-700">
                    {formatRupiah(totalEdc)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Total akumulasi omzet penjualan: <strong className="text-slate-900 font-mono">{formatRupiah(totalRevenue)}</strong>
          </div>
        </div>

        {/* Profit Simulation Calculator with Real Operational Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Kalkulator Simulasi Laba Bersih Dealer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Laba Bersih = (Target Liter × Margin) - (Gaji Rp 40k/hari + Lembur Rp 30k/shift + Listrik + PDAM + Maintenance)
            </p>

            <div className="mt-4 space-y-3">
              {/* Target Liter & Margin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Target Liter/Hari:</span>
                    <span className="font-mono font-bold text-blue-700">{formatNumber(simulatedSalesVolume)} L</span>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={4000}
                    step={100}
                    value={simulatedSalesVolume}
                    onChange={(e) => setSimulatedSalesVolume(parseInt(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Margin/Liter:</span>
                    <span className="font-mono font-bold text-emerald-700">{formatRupiah(simulatedMargin)}</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={1500}
                    step={25}
                    value={simulatedMargin}
                    onChange={(e) => setSimulatedMargin(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Expense parameters */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-600 block">Operator (Gaji 40k):</span>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {simOperatorsCount} Orang = {formatRupiah(simMonthlyWages)}/bln
                  </div>
                </div>

                <div>
                  <span className="text-slate-600 block">Lembur (30k/shift):</span>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {simOvertimeShifts} Shift = {formatRupiah(simMonthlyOvertime)}/bln
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-600 block">Listrik + PDAM + Maint:</span>
                  <div className="font-bold font-mono text-slate-800 mt-0.5">
                    {formatRupiah(simElectricityCost + simPdamCost + simMaintenanceCost)}/bln
                  </div>
                </div>
              </div>

              {/* Output Results */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-slate-900 text-white p-3 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block uppercase">Laba Kotor / Bln</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 block mt-0.5">
                    {formatRupiah(simGrossMonthlyProfit)}
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-3 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Beban / Bln</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-rose-400 block mt-0.5">
                    -{formatRupiah(simMonthlyExpenses)}
                  </span>
                </div>

                <div className="bg-blue-950 text-white p-3 rounded-xl text-center border border-blue-600/50">
                  <span className="text-[10px] text-cyan-300 font-bold block uppercase">Laba Bersih / Bln</span>
                  <span className="text-sm sm:text-base font-black font-mono text-cyan-200 block mt-0.5">
                    {formatRupiah(simNetMonthlyProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            * Estimasi laba bersih tahunan mencapai: <strong className="text-slate-700 font-mono font-bold">{formatRupiah(simNetYearlyProfit)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
