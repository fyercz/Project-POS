import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, Fuel, Gauge, AlertTriangle, ArrowRight, Zap, RefreshCw, AlertCircle, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PurchaseOrder, TankConfig } from '../types';
import { formatLiter, formatRupiah, formatNumber, getTodayDateString } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

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
  onRevertReceiving?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const ReceiveFuelModal: React.FC<ReceiveFuelModalProps> = ({
  isOpen,
  onClose,
  order,
  tank,
  onCompleteReceiving,
  onRevertReceiving,
  onDeleteOrder,
}) => {
  if (!isOpen || !order) return null;

  const LITERS_PER_CM = 21;
  const isEditingCompleted = order.status === 'SELESAI';

  // Base stock calculation
  const defaultBeforeLiters = isEditingCompleted
    ? (order.soundingBeforeLiters ?? Math.max(0, Math.min(tank.totalCapacityLiters, tank.currentStockLiters - (order.effectiveStockAdded || order.actualLitersReceived || order.volumeLiters))))
    : Math.min(tank.totalCapacityLiters, tank.currentStockLiters);

  const [actualDeliveryDate, setActualDeliveryDate] = useState<string>(
    order.actualDeliveryDate || getTodayDateString()
  );

  const [soundingBeforeLiters, setSoundingBeforeLiters] = useState<number>(defaultBeforeLiters);
  const [soundingBeforeCm, setSoundingBeforeCm] = useState<number>(
    order.soundingBeforeCm ?? Math.round((defaultBeforeLiters / LITERS_PER_CM) * 10) / 10
  );

  const defaultReceived = order.actualLitersReceived ?? order.volumeLiters;
  const [actualLitersReceived, setActualLitersReceived] = useState<number>(defaultReceived);

  const defaultAfterLiters = isEditingCompleted
    ? (order.soundingAfterLiters ?? (defaultBeforeLiters + defaultReceived))
    : (defaultBeforeLiters + order.volumeLiters);

  const [soundingAfterLiters, setSoundingAfterLiters] = useState<number>(defaultAfterLiters);
  const [soundingAfterCm, setSoundingAfterCm] = useState<number>(
    order.soundingAfterCm ?? Math.round((defaultAfterLiters / LITERS_PER_CM) * 10) / 10
  );

  const [density, setDensity] = useState<number>(order.density ?? 0.745);
  const [temperature, setTemperature] = useState<number>(order.temperature ?? 29.5);
  const [notes, setNotes] = useState<string>(
    order.notes ?? (isEditingCompleted ? 'Koreksi Berita Acara Penerimaan BBM.' : 'Penerimaan BBM dan bongkar tangki modular lancar.')
  );

  const [showOverflowConfirm, setShowOverflowConfirm] = useState<boolean>(false);

  // Sync state whenever order opens
  useEffect(() => {
    if (isOpen && order) {
      const isCompleted = order.status === 'SELESAI';
      const initialBeforeLtr = isCompleted
        ? (order.soundingBeforeLiters ?? Math.max(0, tank.currentStockLiters - (order.actualLitersReceived || order.volumeLiters)))
        : tank.currentStockLiters;

      const initialReceived = order.actualLitersReceived ?? order.volumeLiters;
      const initialAfterLtr = isCompleted
        ? (order.soundingAfterLiters ?? (initialBeforeLtr + initialReceived))
        : (initialBeforeLtr + order.volumeLiters);

      setActualDeliveryDate(order.actualDeliveryDate || getTodayDateString());
      setSoundingBeforeLiters(initialBeforeLtr);
      setSoundingBeforeCm(order.soundingBeforeCm ?? Math.round((initialBeforeLtr / LITERS_PER_CM) * 10) / 10);
      setActualLitersReceived(initialReceived);
      setSoundingAfterLiters(initialAfterLtr);
      setSoundingAfterCm(order.soundingAfterCm ?? Math.round((initialAfterLtr / LITERS_PER_CM) * 10) / 10);
      setDensity(order.density ?? 0.745);
      setTemperature(order.temperature ?? 29.5);
      setNotes(
        order.notes ??
          (isCompleted ? 'Koreksi Berita Acara Penerimaan BBM.' : 'Penerimaan BBM dan bongkar tangki modular lancar.')
      );
    }
  }, [isOpen, order?.id]);

  const handleSoundingBeforeCmChange = (cm: number) => {
    setSoundingBeforeCm(cm);
    const ltr = Math.round(cm * LITERS_PER_CM);
    setSoundingBeforeLiters(ltr);
    const recv = Math.max(0, soundingAfterLiters - ltr);
    if (recv > 0) setActualLitersReceived(recv);
  };

  const handleSoundingBeforeLitersChange = (ltr: number) => {
    setSoundingBeforeLiters(ltr);
    setSoundingBeforeCm(Math.round((ltr / LITERS_PER_CM) * 10) / 10);
    const recv = Math.max(0, soundingAfterLiters - ltr);
    if (recv > 0) setActualLitersReceived(recv);
  };

  const handleSoundingAfterCmChange = (cm: number) => {
    setSoundingAfterCm(cm);
    const ltr = Math.round(cm * LITERS_PER_CM);
    setSoundingAfterLiters(ltr);
    const recv = Math.max(0, ltr - soundingBeforeLiters);
    if (recv > 0) setActualLitersReceived(recv);
  };

  const handleSoundingAfterLitersChange = (ltr: number) => {
    setSoundingAfterLiters(ltr);
    setSoundingAfterCm(Math.round((ltr / LITERS_PER_CM) * 10) / 10);
    const recv = Math.max(0, ltr - soundingBeforeLiters);
    if (recv > 0) setActualLitersReceived(recv);
  };

  const handleActualLitersChange = (ltr: number) => {
    setActualLitersReceived(ltr);
    const newAfter = soundingBeforeLiters + ltr;
    setSoundingAfterLiters(newAfter);
    setSoundingAfterCm(Math.round((newAfter / LITERS_PER_CM) * 10) / 10);
  };

  // Capacity & Overflow Calculations
  const availableSpace = Math.max(0, tank.totalCapacityLiters - soundingBeforeLiters);
  const resultingStock = soundingBeforeLiters + actualLitersReceived;
  const isOverflow = resultingStock > tank.totalCapacityLiters;
  const overflowAmount = Math.max(0, resultingStock - tank.totalCapacityLiters);
  const capacityPercent = Math.round((resultingStock / tank.totalCapacityLiters) * 100);

  const varianceLiters = actualLitersReceived - order.volumeLiters;

  const handleAutoAdjustToMaxCapacity = () => {
    const safeVolume = availableSpace;
    setActualLitersReceived(safeVolume);
    const newAfter = soundingBeforeLiters + safeVolume;
    setSoundingAfterLiters(newAfter);
    setSoundingAfterCm(Math.round((newAfter / LITERS_PER_CM) * 10) / 10);
  };

  const executeCompleteReceiving = (overrideReceived?: number) => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    const finalReceived = overrideReceived !== undefined ? overrideReceived : actualLitersReceived;
    const finalAfter = Math.min(tank.totalCapacityLiters, soundingBeforeLiters + finalReceived);
    const finalVariance = finalReceived - order.volumeLiters;

    onCompleteReceiving(order.id, {
      actualDeliveryDate,
      soundingBeforeCm,
      soundingBeforeLiters,
      soundingAfterCm: Math.round((finalAfter / LITERS_PER_CM) * 10) / 10,
      soundingAfterLiters: finalAfter,
      actualLitersReceived: finalReceived,
      varianceLiters: finalVariance,
      density,
      temperature,
      notes: notes.trim(),
    });

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isOverflow) {
      setShowOverflowConfirm(true);
      return;
    }

    executeCompleteReceiving();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div
          id="receive-fuel-modal-container"
          className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div
            className={`text-white p-5 flex items-center justify-between ${
              isEditingCompleted
                ? 'bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900'
                : 'bg-gradient-to-r from-emerald-700 to-teal-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {isEditingCompleted ? 'Koreksi Berita Acara Bongkar DO' : 'Penerimaan & Bongkar BBM DO'}
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                    {order.volumeKL} KL ({formatNumber(order.volumeLiters)} L)
                  </span>
                </h2>
                <p className="text-xs text-white/80 mt-0.5">
                  {isEditingCompleted
                    ? 'Edit data volume fisik & otomatis kalibrasi stok tangki pendam'
                    : 'Verifikasi Sounding Stick Tangki & Tambah Sisa Stok Otomatis'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Order Snapshot */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nomor PO & DO:</span>
                <span className="font-mono font-bold text-slate-800">
                  {order.poNumber} • {order.doPertaminaNumber || 'DO Pertamina'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mobil Tangki & Supir:</span>
                <span className="font-medium text-slate-800">
                  {order.truckPlateNumber || '-'} ({order.driverName || 'Supir Pertamina'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Kapasitas Tangki Pendam:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatLiter(tank.totalCapacityLiters)} ({tank.totalCapacityLiters / 1000} KL)
                </span>
              </div>
            </div>

            {/* Tanggal Penerimaan Fisik */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Penerimaan / Pembongkaran Fisik
              </label>
              <input
                type="date"
                required
                value={actualDeliveryDate}
                onChange={(e) => setActualDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Capacity Status Card & Warning */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isOverflow
                  ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm shadow-rose-100'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  {isOverflow ? (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <Fuel className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {isOverflow ? 'PERINGATAN: Volume Melebihi Kapasitas Tangki!' : 'Kalkulasi Ruang Muat Tangki'}
                    </h3>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {isOverflow
                        ? `Tangki hanya muat sisa ${formatLiter(availableSpace)}, kelebihan ${formatLiter(overflowAmount)} berisiko meluber/stuck!`
                        : `Sisa ruang kosong tangki tersedia: ${formatLiter(availableSpace)}`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md inline-block ${
                      isOverflow ? 'bg-rose-200 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {capacityPercent}% Kapasitas
                  </span>
                </div>
              </div>

              {/* Progress bar visual */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isOverflow ? 'bg-rose-600' : capacityPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, capacityPercent)}%` }}
                />
              </div>

              {/* Overflow action button */}
              {isOverflow && (
                <div className="mt-3 pt-2.5 border-t border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-700 font-medium">
                    Ingin menyesuaikan agar pas dengan batas tangki?
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoAdjustToMaxCapacity}
                    className="w-full sm:w-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Sesuaikan Pas Kapasitas ({formatLiter(availableSpace)})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sounding Tangki: Sebelum vs Sesudah Bongkar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  Tera Sounding Tangki Modular (Sebelum & Sesudah)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono">
                  1 cm = 21 Liter
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Sebelum Bongkar */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-bold text-blue-900 block">1. Sounding Sebelum Bongkar</span>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Tinggi Stick Sounding (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={soundingBeforeCm}
                      onChange={(e) => handleSoundingBeforeCmChange(parseFloat(e.target.value) || 0)}
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
                      onChange={(e) => handleSoundingBeforeLitersChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Sesudah Bongkar */}
                <div
                  className={`border rounded-xl p-3.5 space-y-2 ${
                    isOverflow
                      ? 'bg-rose-50/60 border-rose-300 text-rose-900'
                      : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <span className="text-xs font-bold block flex items-center justify-between">
                    <span>2. Sounding Sesudah Bongkar</span>
                    {isOverflow && (
                      <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                        OVERFLOW
                      </span>
                    )}
                  </span>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Tinggi Stick Sounding (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={soundingAfterCm}
                      onChange={(e) => handleSoundingAfterCmChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Total Volume Akhir Tangki (Liter)
                    </label>
                    <input
                      type="number"
                      value={soundingAfterLiters}
                      onChange={(e) => handleSoundingAfterLitersChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actual Received Volume & Variance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Volume Bersih Diterima (Liter)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={actualLitersReceived}
                  onChange={(e) => handleActualLitersChange(parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-mono font-bold text-slate-900 ${
                    isOverflow ? 'border-rose-400 focus:border-rose-600' : 'border-slate-300 focus:border-emerald-500'
                  }`}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Pesanan DO: {formatNumber(order.volumeLiters)} L
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Selisih DO vs Diterima
                </label>
                <div className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold flex items-center justify-between">
                  <span className={varianceLiters < 0 ? 'text-rose-600' : varianceLiters > 0 ? 'text-emerald-600' : 'text-slate-800'}>
                    {varianceLiters > 0 ? `+${varianceLiters} L` : `${varianceLiters} L`}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      varianceLiters === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : Math.abs(varianceLiters) <= 15
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {varianceLiters === 0 ? 'Pass (0 Loss)' : 'Toleransi Wajar'}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner Otomatis Masuk Pembukuan Keuangan */}
            {varianceLiters !== 0 && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  varianceLiters < 0
                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>
                      {varianceLiters < 0
                        ? '⚡ Otomatis Masuk Pembukuan: Beban Susut Bongkar DO'
                        : '⚡ Otomatis Masuk Pembukuan: Surplus Penerimaan DO'}
                    </span>
                    <span className="font-mono font-black text-xs">
                      {varianceLiters > 0 ? '+' : '-'}Rp{' '}
                      {formatRupiah(Math.round(Math.abs(varianceLiters) * order.buyPricePerLiter))}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Selisih volume {varianceLiters > 0 ? `+${varianceLiters}` : varianceLiters} Liter @ Rp{' '}
                    {formatRupiah(order.buyPricePerLiter)}/L otomatis disinkronkan ke pembukuan keuangan saat disimpan.
                  </p>
                </div>
              </div>
            )}

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
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isEditingCompleted && onRevertReceiving && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Batalkan penerimaan DO #${order.poNumber} dan kembalikan stok tangki ke kondisi sebelum dibongkar?`)) {
                        onRevertReceiving(order.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5"
                    title="Batalkan penerimaan dan pulihkan stok tangki ke kondisi sebelum dibongkar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Batal Bongkar (Rollback)</span>
                  </button>
                )}

                {isEditingCompleted && onDeleteOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Hapus data DO #${order.poNumber} dan pulihkan stok tangki?`)) {
                        onDeleteOrder(order.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                    title="Hapus riwayat DO ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus DO</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>

                <button
                  id="confirm-receive-fuel-btn"
                  type="submit"
                  className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-colors flex items-center gap-2 ${
                    isOverflow
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                      : isEditingCompleted
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {isEditingCompleted ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>
                    {isEditingCompleted
                      ? `Simpan Perubahan & Kalibrasi Tangki (${formatNumber(actualLitersReceived)} L)`
                      : `Konfirmasi & Masukkan ke Stok Tangki (+${formatNumber(actualLitersReceived)} L)`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Overflow Warning Dialog */}
      <ConfirmModal
        isOpen={showOverflowConfirm}
        title="Peringatan Kapasitas Tangki Melebihi Batas"
        message={
          <div className="space-y-2.5 text-xs text-slate-600">
            <p className="font-bold text-rose-700">
              Total volume BBM yang Anda masukkan ({formatNumber(resultingStock)} L) melebihi kapasitas tangki pendam ({formatNumber(tank.totalCapacityLiters)} L) sebesar {formatNumber(overflowAmount)} Liter.
            </p>
            <p>
              Jika Anda memilih Simpan & Sesuaikan, sistem akan otomatis menyesuaikan penerimaan pas dengan sisa ruang muat <strong>{formatLiter(availableSpace)}</strong> sehingga stok tangki aman terisi maksimal <strong>{formatLiter(tank.totalCapacityLiters)}</strong> dan tidak stuck.
            </p>
          </div>
        }
        confirmLabel="Simpan & Sesuaikan Pas Batas Tangki"
        cancelLabel="Batal & Ubah Manual"
        isDestructive={false}
        onConfirm={() => {
          setShowOverflowConfirm(false);
          const safeVolume = availableSpace;
          setActualLitersReceived(safeVolume);
          const newAfter = Math.min(tank.totalCapacityLiters, soundingBeforeLiters + safeVolume);
          setSoundingAfterLiters(newAfter);
          setSoundingAfterCm(Math.round((newAfter / LITERS_PER_CM) * 10) / 10);
          executeCompleteReceiving(safeVolume);
        }}
        onClose={() => setShowOverflowConfirm(false)}
      />
    </>
  );
};
