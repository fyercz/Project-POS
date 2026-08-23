import React from 'react';
import { AlertTriangle, AlertCircle, ShoppingCart, ArrowRight, Fuel } from 'lucide-react';
import { TankConfig, OrderVolumePecahan } from '../types';
import { formatLiter } from '../utils/formatters';

interface OrderAlertBannerProps {
  tank: TankConfig;
  onQuickOrder: (kl: OrderVolumePecahan) => void;
  avgDailySalesLiters: number;
}

export const OrderAlertBanner: React.FC<OrderAlertBannerProps> = ({
  tank,
  onQuickOrder,
  avgDailySalesLiters,
}) => {
  const current = tank.currentStockLiters;
  const isCritical = current <= tank.criticalThresholdLiters;
  const isWarning = current <= tank.warningThresholdLiters;

  if (!isWarning && !isCritical) {
    return null;
  }

  const ullageLiters = tank.totalCapacityLiters - current;
  const runwayDays = avgDailySalesLiters > 0 ? (current - tank.deadStockLiters) / avgDailySalesLiters : 0;
  const maxSafeKL = Math.floor(ullageLiters / 1000) as OrderVolumePecahan;

  return (
    <div
      id="pertashop-stock-alert-banner"
      className={`rounded-xl p-4 sm:p-5 border transition-all ${
        isCritical
          ? 'bg-red-500/10 border-red-500/30 text-slate-900'
          : 'bg-amber-500/10 border-amber-500/30 text-slate-900'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Icon & Details */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${
              isCritical ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500 text-white'
            }`}
          >
            {isCritical ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {isCritical ? '🚨 Status Stok Kritis' : '⚠️ Pengingat Pemesanan BBM'}
              </span>
              <span className="text-xs font-medium text-slate-600">
                Sisa Stok: <strong className="font-bold text-slate-900">{formatLiter(current)}</strong> (
                {Math.round((current / tank.totalCapacityLiters) * 100)}% Kapasitas Tangki)
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold mt-1 text-slate-900">
              {isCritical
                ? 'Stok Pertamax di Bawah Batas Kritis! Segera Pesan DO Pertamina'
                : 'Stok Tangki Mendekati Batas Siaga! Waktunya Pemesanan DO'}
            </h3>

            <p className="text-xs text-slate-600 mt-0.5">
              Ruang kosong tangki (<span className="italic">ullage</span>):{' '}
              <strong className="font-semibold text-slate-900">{formatLiter(ullageLiters)}</strong>.
              {runwayDays > 0 && (
                <>
                  {' '}
                  Estimasi habis dalam{' '}
                  <strong className="font-semibold text-slate-900">
                    ±{runwayDays.toFixed(1)} hari
                  </strong>{' '}
                  (laju penjualan ±{Math.round(avgDailySalesLiters)} L/hari).
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons (1 KL, 2 KL, 3 KL) */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-600 px-1 hidden sm:inline-flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5 text-blue-600" />
            Pesan Cepat:
          </span>

          {([1, 2, 3] as OrderVolumePecahan[]).map((kl) => {
            const klLiters = kl * 1000;
            const fitsInTank = klLiters <= ullageLiters;
            const isRecommended = maxSafeKL >= kl && (maxSafeKL === kl || (maxSafeKL >= 2 && kl === 2));

            return (
              <button
                key={kl}
                id={`quick-order-btn-${kl}kl`}
                type="button"
                onClick={() => onQuickOrder(kl)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isRecommended
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : fitsInTank
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
                title={
                  fitsInTank
                    ? `Pesan ${kl} KL (${formatLiter(klLiters)}) ke Pertamina`
                    : `Ruang kosong (${formatLiter(ullageLiters)}) tidak muat untuk ${kl} KL`
                }
              >
                <span>{kl} KL</span>
                <span className="text-[10px] font-normal opacity-90">({kl}.000 L)</span>
              </button>
            );
          })}

          <button
            id="open-po-modal-btn"
            type="button"
            onClick={() => onQuickOrder((maxSafeKL >= 1 ? (Math.min(maxSafeKL, 2) as OrderVolumePecahan) : 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Form PO</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
