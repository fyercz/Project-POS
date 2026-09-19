import React, { useState, useEffect } from 'react';
import { X, Gauge, Check, AlertCircle, Droplet, History, Pencil, Trash2, Zap } from 'lucide-react';
import { TankConfig, SoundingRecord } from '../types';
import { formatLiter, formatShortDate, getTodayDateString, getCurrentTimeString, addDays } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface SoundingLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tank: TankConfig;
  soundings: SoundingRecord[];
  editingSounding?: SoundingRecord | null;
  buyPrice?: number;
  onSaveSounding: (record: Omit<SoundingRecord, 'id'>, newStockLiters: number, editingId?: string) => void;
  onDeleteSounding?: (id: string) => void;
  onDeleteAugustSoundings?: () => void;
}

export const SoundingLogModal: React.FC<SoundingLogModalProps> = ({
  isOpen,
  onClose,
  tank,
  soundings,
  editingSounding,
  buyPrice = 12100,
  onSaveSounding,
  onDeleteSounding,
  onDeleteAugustSoundings,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SoundingRecord | null>(null);
  const [showAugustConfirm, setShowAugustConfirm] = useState<boolean>(false);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [time, setTime] = useState<string>(getCurrentTimeString());
  const [operatorName, setOperatorName] = useState<string>('Daslam');
  
  // Tera sounding calibration: 1 cm height = 21 Liters
  const LITERS_PER_CM = 21;
  const initialStickCm = Math.round((tank.currentStockLiters / LITERS_PER_CM) * 10) / 10;
  const [stickDipCm, setStickDipCm] = useState<number>(initialStickCm);
  const [calculatedLiters, setCalculatedLiters] = useState<number>(tank.currentStockLiters);
  const [waterBottomCm, setWaterBottomCm] = useState<number>(0);
  const [syncToTankStock, setSyncToTankStock] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('Sounding stick ukur harian.');

  useEffect(() => {
    if (editingSounding) {
      setCurrentEditId(editingSounding.id);
      setDate(editingSounding.date);
      setTime(editingSounding.time);
      setOperatorName(editingSounding.operatorName || 'Daslam');
      setStickDipCm(editingSounding.stickDipCm);
      setCalculatedLiters(editingSounding.calculatedLiters);
      setWaterBottomCm(editingSounding.waterBottomCm || 0);
      setNotes(editingSounding.notes || '');
      setSyncToTankStock(false);
      setActiveTab('form');
    } else if (isOpen) {
      setCurrentEditId(null);
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setOperatorName('Daslam');
      const scm = Math.round((tank.currentStockLiters / LITERS_PER_CM) * 10) / 10;
      setStickDipCm(scm);
      setCalculatedLiters(tank.currentStockLiters);
      setWaterBottomCm(0);
      setSyncToTankStock(true);
      setNotes('Sounding stick ukur harian.');
    }
  }, [editingSounding, isOpen, tank.currentStockLiters]);

  if (!isOpen) return null;

  const handleStickChange = (cm: number) => {
    setStickDipCm(cm);
    // Auto-calculate liters from stick cm (1 cm = 21 L)
    const liters = Math.min(tank.totalCapacityLiters, Math.round(cm * LITERS_PER_CM));
    setCalculatedLiters(liters);
  };

  const variance = calculatedLiters - tank.currentStockLiters;

  const handleStartEditFromHistory = (s: SoundingRecord) => {
    setCurrentEditId(s.id);
    setDate(s.date);
    setTime(s.time);
    setOperatorName(s.operatorName || 'Daslam');
    setStickDipCm(s.stickDipCm);
    setCalculatedLiters(s.calculatedLiters);
    setWaterBottomCm(s.waterBottomCm || 0);
    setNotes(s.notes || '');
    setSyncToTankStock(false);
    setActiveTab('form');
  };

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
      syncToTankStock ? calculatedLiters : tank.currentStockLiters,
      currentEditId || undefined
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
          <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Tanggal, Jam, Operator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">Tanggal</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDate(addDays(date, -1))}
                      className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                      title="Mundur 1 hari"
                    >
                      -1H
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(addDays(date, 1))}
                      className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                      title="Maju 1 hari"
                    >
                      +1H
                    </button>
                    <button
                      type="button"
                      onClick={() => setDate(getTodayDateString())}
                      className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                      title="Hari Ini"
                    >
                      Kini
                    </button>
                  </div>
                </div>
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
                <span className="text-[10px] text-blue-600 font-semibold mt-1 block">
                  Tabel tera tangki: 1 cm = 21 Liter
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
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCalculatedLiters(val);
                      setStickDipCm(Math.round((val / LITERS_PER_CM) * 10) / 10);
                    }}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-base font-mono font-bold text-blue-700"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Liter</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Volume fisik cairan Pertamax
                </span>
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

            {/* Indikator Rekonsiliasi Fisik vs Buku */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                variance < 0
                  ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                  : variance > 0
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {variance < 0
                      ? '⚡ Status Rekonsiliasi: Susut / Losses Fisik'
                      : variance > 0
                      ? '⚡ Status Rekonsiliasi: Surplus / Lebih Stok Fisik'
                      : '⚡ Status Rekonsiliasi: Stok Fisik & Sistem Sesuai Presisi (0 L)'}
                  </span>
                  {variance !== 0 && (
                    <span className="font-mono font-black text-xs">
                      {variance > 0 ? `+${formatLiter(variance)}` : formatLiter(variance)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {variance < 0
                    ? `Hasil stik ukur menunjukkan volume fisik ${Math.abs(variance)} Liter lebih rendah dari stok buku sistem.`
                    : variance > 0
                    ? `Hasil stik ukur menunjukkan volume fisik ${variance} Liter lebih tinggi dari stok buku sistem.`
                    : 'Tidak ada deviasi antara stok fisik stik ukur dan stok sistem buku.'}
                </p>
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
                <span>{currentEditId ? 'Simpan Perubahan Sounding' : 'Simpan Catatan Sounding'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
            {onDeleteAugustSoundings && soundings.some((s) => s.date.includes('-08-')) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs mb-2">
                <span className="text-rose-800 font-medium">
                  Terdapat {soundings.filter((s) => s.date.includes('-08-')).length} catatan sounding pada bulan Agustus.
                </span>
                <button
                  type="button"
                  onClick={() => setShowAugustConfirm(true)}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Sounding Agustus</span>
                </button>
              </div>
            )}

            {soundings.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <Gauge className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                <div className="font-semibold text-slate-600 text-sm">Belum Ada Riwayat Sounding</div>
                <p className="mt-1 text-slate-400">Semua catatan sounding pada bulan Agustus telah dihapus.</p>
              </div>
            ) : (
              soundings.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center gap-2"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">
                      {formatShortDate(s.date)} • {s.time}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Operator: {s.operatorName} • Stick: {s.stickDipCm} cm
                    </div>
                    {s.notes && <div className="text-[11px] text-slate-400 italic mt-0.5">{s.notes}</div>}
                  </div>
                  <div className="text-right font-mono flex-shrink-0">
                    <div className="font-bold text-blue-700 text-sm">{formatLiter(s.calculatedLiters)}</div>
                    <div className="text-[11px] text-slate-500">
                      Selisih: {s.varianceLiters > 0 ? `+${s.varianceLiters}` : s.varianceLiters} L
                    </div>
                    {s.varianceLiters !== 0 && (
                      <div className="text-[10px] font-sans font-bold flex items-center justify-end gap-1 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded ${s.varianceLiters < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {s.varianceLiters < 0 ? `Loss ${Math.abs(s.varianceLiters)} L` : `Surplus +${s.varianceLiters} L`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleStartEditFromHistory(s)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Edit Sounding"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteSounding && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Hapus Sounding"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus Baris Sounding */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Hapus Catatan Sounding"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus catatan sounding tanggal ${formatShortDate(deleteTarget.date)} pukul ${deleteTarget.time} (Stick: ${deleteTarget.stickDipCm} cm / ${formatLiter(deleteTarget.calculatedLiters)})?`
            : ''
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (deleteTarget && onDeleteSounding) {
            onDeleteSounding(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Modal Konfirmasi Hapus Semua Sounding Bulan Agustus */}
      <ConfirmModal
        isOpen={showAugustConfirm}
        title="Hapus Semua Sounding Bulan Agustus"
        message="Apakah Anda yakin ingin menghapus seluruh catatan hasil sounding pada bulan Agustus? Tindakan ini akan menghapus permanen data sounding fisik tangki bulan Agustus."
        confirmLabel="Hapus Semua Sounding Agustus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          setShowAugustConfirm(false);
          if (onDeleteAugustSoundings) {
            onDeleteAugustSoundings();
          }
        }}
        onClose={() => setShowAugustConfirm(false)}
      />
    </div>
  );
};
