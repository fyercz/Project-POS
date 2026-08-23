import React from 'react';
import { Fuel, AlertTriangle, AlertCircle, CheckCircle2, ArrowUpRight, Gauge, Droplet } from 'lucide-react';
import { TankConfig, OrderVolumePecahan } from '../types';
import { formatLiter, formatNumber } from '../utils/formatters';

interface StockTankGaugeProps {
  tank: TankConfig;
  productName: string;
  onOpenSoundingModal: () => void;
  onOpenOrderModal: (defaultKL?: OrderVolumePecahan) => void;
}

export const StockTankGauge: React.FC<StockTankGaugeProps> = ({
  tank,
  productName,
  onOpenSoundingModal,
  onOpenOrderModal,
}) => {
  const current = tank.currentStockLiters;
  const capacity = tank.totalCapacityLiters;
  const percentage = Math.min(100, Math.max(0, (current / capacity) * 100));
  const usableStock = Math.max(0, current - tank.deadStockLiters);
  const ullageLiters = Math.max(0, capacity - current);
  const ullageKL = (ullageLiters / 1000).toFixed(1);

  // Thresholds
  const isCritical = current <= tank.criticalThresholdLiters;
  const isWarning = current <= tank.warningThresholdLiters && !isCritical;
  const isSafe = !isCritical && !isWarning;

  return (
    <div
      id="pertashop-tank-gauge-card"
      className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden text-white flex flex-col justify-between border border-slate-800"
    >
      {/* Background Decorative Accent Circle */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Monitoring Tangki Pendam Modular
            </span>
            <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
              Stok {productName} Terkini
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="gauge-open-sounding-btn"
              type="button"
              onClick={onOpenSoundingModal}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Input Sounding Stick Celup Tangki"
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sounding</span>
            </button>

            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isCritical ? (
                <AlertCircle className="w-3 h-3 text-rose-400" />
              ) : isWarning ? (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              )}
              <span>{isCritical ? 'KRITIS' : isWarning ? 'SIAGA ORDER' : 'STOK AMAN'}</span>
            </span>
          </div>
        </div>

        {/* Stock Liter Large Counter */}
        <div className="mt-5 flex items-baseline justify-between">
          <div className="flex items-baseline">
            <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              {formatNumber(current)}
            </span>
            <span className="text-slate-400 ml-1.5 text-sm font-semibold">Liter</span>
          </div>

          <div className="text-right">
            <span className="text-sm font-bold text-cyan-400 font-mono">
              {percentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 block font-normal">
              dari {formatNumber(capacity)} L ({capacity / 1000} KL)
            </span>
          </div>
        </div>

        {/* High-End Progress Bar */}
        <div className="w-full bg-slate-800 h-3 rounded-full my-4 overflow-hidden relative border border-slate-700/60">
          <div
            className={`h-full transition-all duration-700 ${
              isCritical
                ? 'bg-rose-500'
                : isWarning
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Ullage & Dead Stock Details */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ruang Kosong (Ullage)
            </span>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {formatNumber(ullageLiters)} <span className="text-xs font-normal text-slate-400">L</span>
            </div>
            <span className="text-[11px] text-cyan-300 block mt-0.5">
              Muat s.d. <strong>{ullageKL} KL</strong>
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Stok Siap Jual Efektif
            </span>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {formatNumber(usableStock)} <span className="text-xs font-normal text-slate-400">L</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Dead stock {tank.deadStockLiters} L
            </span>
          </div>
        </div>
      </div>

      {/* Quick Order Kiloliter Buttons (1 KL, 2 KL, 3 KL) */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Droplet className="w-3.5 h-3.5 text-blue-400" />
            Pecahan Order DO Pertamina:
          </span>
          <span className="text-[11px] text-slate-400">Pilih volume kompartemen</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as OrderVolumePecahan[]).map((kl) => {
            const fits = kl * 1000 <= ullageLiters;
            return (
              <button
                key={kl}
                id={`gauge-quick-order-${kl}kl`}
                type="button"
                onClick={() => onOpenOrderModal(kl)}
                className={`py-2.5 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                  fits
                    ? 'bg-slate-800 hover:bg-blue-600 hover:border-blue-500 text-white border-slate-700 shadow-sm'
                    : 'bg-slate-900/50 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                }`}
                title={
                  fits
                    ? `Pesan ${kl} KL (${kl * 1000} Liter) ke Pertamina`
                    : `Volume ${kl} KL melebihi ruang kosong saat ini`
                }
              >
                <span className="text-sm font-extrabold font-mono leading-none">
                  {kl} KL
                </span>
                <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                  ({kl}.000 L)
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
