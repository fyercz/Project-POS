import React, { useState } from 'react';
import { X, Gauge, Check, AlertCircle, Droplet, History } from 'lucide-react';
import { TankConfig, SoundingRecord } from '../types';
import { formatLiter, formatShortDate, getTodayDateString, getCurrentTimeString } from '../utils/formatters';

interface SoundingLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tank: TankConfig;
  soundings: SoundingRecord[];
  onSaveSounding: (record: Omit<SoundingRecord, 'id'>, newStockLiters: number) => void;
}

export const SoundingLogModal: React.FC<SoundingLogModalProps> = ({
  isOpen,
  onClose,
  tank,
  soundings,
  onSaveSounding,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [operatorName, setOperatorName] = useState<string>('Daslam');
  
  // Standard modular calibration approximation: 1 cm height ≈ 20 Liters (for 3000L tank height ~150cm)
  const initialStickCm = Math.round((tank.currentStockLiters / 20) * 10) / 10;
  const [stickDipCm, setStickDipCm] = useState<number>(initialStickCm);
  const [calculatedLiters, setCalculatedLiters] = useState<number>(tank.currentStockLiters);
  const [waterBottomCm, setWaterBottomCm] = useState<number>(0);
  const [syncToTankStock, setSyncToTankStock] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('Sounding stick ukur harian.');

  if (!isOpen) return null;

  const handleStickChange = (cm: number) => {
    setStickDipCm(cm);
    // Auto-calculate liters from stick cm
    const liters = Math.min(tank.totalCapacityLiters, Math.round(cm * 20));
    setCalculatedLiters(liters);
  };

  const variance = calculatedLiters - tank.currentStockLiters;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSaveSounding(
      {
        date,
        time,
        operatorName: operatorName.trim(),
        stickDipCm,
        calculatedLiters,
        systemStockLiters: tank.currentStockLiters,
        varianceLiters: variance,
        waterBottomCm,
        notes: notes.trim(),
      },
      syncToTankStock ? calculatedLiters : tank.currentStockLiters
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="sounding-modal-container"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Gauge className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Tera Sounding Tangki Modular</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Pengukuran Fisik Stick Ukur & Uji Bebas Air Tangki Pendam
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Form Sounding Harian</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Sounding ({soundings.length})</span>
          </button>
        </div>

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Tanggal, Jam, Operator */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jam</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
                  <span>Operator</span>
                  <span className="flex gap-1">
                    {['Daslam', 'Angga'].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOperatorName(op)}
                        className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                          operatorName === op
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Stick Dip & Liters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Tinggi Celup Stick Sounding (cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={200}
                    required
                    value={stickDipCm}
                    onChange={(e) => handleStickChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-base font-mono font-bold text-slate-900"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">cm</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Tabel tera: 1 cm ≈ 20 L
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  Hasil Volume Sounding (Liter)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={tank.totalCapacityLiters}
                    required
                    value={calculatedLiters}
                    onChange={(e) => setCalculatedLiters(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-base font-mono font-bold text-blue-700"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Liter</span>
                </div>
              </div>
            </div>

            {/* Variance & Water Bottom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-slate-500 font-medium block">Stok Buku Sistem vs Sounding:</span>
                <div className="flex items-center justify-between font-mono">
                  <span>Sistem: {formatLiter(tank.currentStockLiters)}</span>
                  <span
                    className={`font-bold ${
                      variance === 0
                        ? 'text-emerald-600'
                        : variance > 0
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}
                  >
                    Selisih: {variance > 0 ? `+${variance}` : variance} L
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uji Pasta Air Dasar Tangki (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={waterBottomCm}
                  onChange={(e) => setWaterBottomCm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
                <span className="text-[10px] text-slate-400">Harus 0 cm (Bebas Air)</span>
              </div>
            </div>

            {/* Sync checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-700 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToTankStock}
                onChange={(e) => setSyncToTankStock(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>
                Perbarui stok aktif tangki di dashboard menjadi{' '}
                <strong className="font-mono">{formatLiter(calculatedLiters)}</strong> sesuai hasil sounding ini.
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Catatan Sounding</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
            {soundings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada riwayat sounding.
              </div>
            ) : (
              soundings.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {formatShortDate(s.date)} • {s.time}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Operator: {s.operatorName} • Stick: {s.stickDipCm} cm
                    </div>
                    {s.notes && <div className="text-[11px] text-slate-400 italic mt-0.5">{s.notes}</div>}
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-blue-700 text-sm">{formatLiter(s.calculatedLiters)}</div>
                    <div className="text-[11px] text-slate-500">
                      Selisih: {s.varianceLiters > 0 ? `+${s.varianceLiters}` : s.varianceLiters} L
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
