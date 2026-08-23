import React, { useState } from 'react';
import { X, Truck, CheckCircle2, Fuel, Gauge, AlertTriangle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PurchaseOrder, TankConfig } from '../types';
import { formatLiter, formatRupiah, formatNumber, getTodayDateString } from '../utils/formatters';

interface ReceiveFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  tank: TankConfig;
  onCompleteReceiving: (
    orderId: string,
    receivingData: {
      actualDeliveryDate: string;
      soundingBeforeCm: number;
      soundingBeforeLiters: number;
      soundingAfterCm: number;
      soundingAfterLiters: number;
      actualLitersReceived: number;
      varianceLiters: number;
      density: number;
      temperature: number;
      notes?: string;
    }
  ) => void;
}

export const ReceiveFuelModal: React.FC<ReceiveFuelModalProps> = ({
  isOpen,
  onClose,
  order,
  tank,
  onCompleteReceiving,
}) => {
  if (!isOpen || !order) return null;

  const [actualDeliveryDate, setActualDeliveryDate] = useState<string>(getTodayDateString());
  
  // Sounding before unloading
  const [soundingBeforeCm, setSoundingBeforeCm] = useState<number>(Math.round((tank.currentStockLiters / 20) * 10) / 10);
  const [soundingBeforeLiters, setSoundingBeforeLiters] = useState<number>(tank.currentStockLiters);

  // Sounding after unloading
  const expectedAfterLiters = tank.currentStockLiters + order.volumeLiters;
  const [soundingAfterCm, setSoundingAfterCm] = useState<number>(Math.round((expectedAfterLiters / 20) * 10) / 10);
  const [soundingAfterLiters, setSoundingAfterLiters] = useState<number>(expectedAfterLiters);
  
  const [actualLitersReceived, setActualLitersReceived] = useState<number>(order.volumeLiters);
  const [density, setDensity] = useState<number>(0.745);
  const [temperature, setTemperature] = useState<number>(29.5);
  const [notes, setNotes] = useState<string>('Penerimaan BBM dan bongkar tangki modular lancar.');

  const varianceLiters = actualLitersReceived - order.volumeLiters;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    onCompleteReceiving(order.id, {
      actualDeliveryDate,
      soundingBeforeCm,
      soundingBeforeLiters,
      soundingAfterCm,
      soundingAfterLiters,
      actualLitersReceived,
      varianceLiters,
      density,
      temperature,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="receive-fuel-modal-container"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Penerimaan & Bongkar BBM
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                  {order.volumeKL} KL ({formatNumber(order.volumeLiters)} L)
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Verifikasi Sounding Stick Tangki & Tambah Sisa Stok Otomatis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Order Snapshot */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Nomor PO & DO:</span>
              <span className="font-mono font-bold text-slate-800">
                {order.poNumber} • {order.doPertaminaNumber || 'DO Pertamina'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Mobil Tangki & AMT:</span>
              <span className="font-medium text-slate-800">
                {order.truckPlateNumber || '-'} ({order.driverName || 'Supir Pertamina'})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total Volume Pesanan:</span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                {order.volumeKL} KL ({formatNumber(order.volumeLiters)} Liter)
              </span>
            </div>
          </div>

          {/* Sounding Tangki: Sebelum vs Sesudah Bongkar */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              Tera Sounding Tangki Modular (Sebelum & Sesudah Bongkar)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Sebelum Bongkar */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-blue-900 block">1. Sebelum Bongkar</span>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Tinggi Stick Sounding (cm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={soundingBeforeCm}
                    onChange={(e) => setSoundingBeforeCm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Volume Sisa Tangki (Liter)
                  </label>
                  <input
                    type="number"
                    value={soundingBeforeLiters}
                    onChange={(e) => setSoundingBeforeLiters(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Sesudah Bongkar */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <span className="text-xs font-bold text-emerald-900 block">2. Sesudah Bongkar</span>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Tinggi Stick Sounding (cm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={soundingAfterCm}
                    onChange={(e) => setSoundingAfterCm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Total Volume Akhir Tangki (Liter)
                  </label>
                  <input
                    type="number"
                    value={soundingAfterLiters}
                    onChange={(e) => setSoundingAfterLiters(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actual Received Volume & Variance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Volume BBM Bersih Diterima (Liter)
              </label>
              <input
                type="number"
                required
                min={100}
                value={actualLitersReceived}
                onChange={(e) => setActualLitersReceived(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Selisih Volume (DO vs Diterima)
              </label>
              <div className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold flex items-center justify-between">
                <span>{varianceLiters > 0 ? `+${varianceLiters} L` : `${varianceLiters} L`}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    varianceLiters === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : Math.abs(varianceLiters) <= 10
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {varianceLiters === 0 ? 'Pass (0 Loss)' : 'Toleransi Wajar'}
                </span>
              </div>
            </div>
          </div>

          {/* QC Parameter: Density & Temperature */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Densitas BBM (g/ml)
              </label>
              <input
                type="number"
                step="0.001"
                value={density}
                onChange={(e) => setDensity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
              />
              <span className="text-[10px] text-slate-400">Standar Pertamax: 0.715 - 0.770</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Suhu BBM (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Catatan Berita Acara Penerimaan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              id="confirm-receive-fuel-btn"
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfirmasi & Tambah ke Stok Tangki (+{formatNumber(actualLitersReceived)} L)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
