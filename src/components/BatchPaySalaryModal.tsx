import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign } from 'lucide-react';
import { PayrollRecord } from '../types';
import { formatRupiah, formatMonthYear, formatDateIndo } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Diekstrak dari AttendancePayrollView.tsx sebagai bagian dari rekomendasi di
 * docs/REKOMENDASI_ARSITEKTUR.md (tech debt #7) - modal kelima yang dipindah.
 *
 * Berbeda dari PaySalaryModal (modal pembayaran satu slip) yang punya keterkaitan lintas-modal
 * dengan slip yang sedang dicetak, modal ini berdiri sendiri - aman diekstrak dengan pola yang
 * sama seperti sebelumnya tanpa penyesuaian arsitektur tambahan.
 */

export interface BatchPaySalaryModalProps {
  isOpen: boolean;
  monthPayrolls: PayrollRecord[];
  selectedMonth: string;
  onClose: () => void;
  onConfirm: (
    unpaidDrafts: PayrollRecord[],
    source: 'REKENING_BANK' | 'KAS_HARIAN',
    endOfMonth: string,
    time: string
  ) => void;
}

export const BatchPaySalaryModal: React.FC<BatchPaySalaryModalProps> = ({
  isOpen,
  monthPayrolls,
  selectedMonth,
  onClose,
  onConfirm,
}) => {
  const { containerRef, titleId } = useModalA11y(isOpen, onClose);
  const [batchPaySource, setBatchPaySource] = useState<'REKENING_BANK' | 'KAS_HARIAN'>('REKENING_BANK');
  const [batchPayTime, setBatchPayTime] = useState<string>('20:00');

  // Reset ke default tiap kali modal dibuka - meniru perilaku asli sebelum diekstrak (tombol
  // pembuka dulu mereset kedua nilai ini secara eksplisit sebelum membuka modal).
  useEffect(() => {
    if (isOpen) {
      setBatchPaySource('REKENING_BANK');
      setBatchPayTime('20:00');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unpaidDrafts = monthPayrolls.filter((p) => p.paymentStatus !== 'DIBAYAR');
  const [yearStr, monthStr] = selectedMonth.split('-');
  const lastDay = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
  const endOfMonth = `${yearStr}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const totalBatchNet = unpaidDrafts.reduce((sum, p) => sum + p.netSalary, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unpaidDrafts.length === 0) {
      onClose();
      return;
    }
    let finalTime = batchPayTime || '20:00';
    if (finalTime > '20:00') finalTime = '20:00';
    onConfirm(unpaidDrafts, batchPaySource, endOfMonth, finalTime);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 id={titleId} className="font-bold text-sm text-white">Bayar Seluruh Gaji Akhir Bulan</h3>
              <p className="text-[11px] text-emerald-100 font-mono mt-0.5">
                Periode {formatMonthYear(selectedMonth)} • {unpaidDrafts.length} Karyawan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Summary Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-semibold">Total Slip yang Dibayarkan:</span>
              <span className="font-bold text-emerald-900 font-mono text-sm">{unpaidDrafts.length} Orang</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-semibold">Total Dana Pengeluaran Gaji:</span>
              <span className="text-base font-black font-mono text-emerald-700">{formatRupiah(totalBatchNet)}</span>
            </div>
            <div className="pt-2 border-t border-emerald-200/60 flex justify-between items-center text-[11px] text-emerald-800">
              <span>Pasti Tanggal Akhir Bulan:</span>
              <span className="font-bold font-mono">{endOfMonth} ({formatDateIndo(endOfMonth)})</span>
            </div>
          </div>

          {/* List Karyawan */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                <tr>
                  <th className="py-1.5 px-3">Nama</th>
                  <th className="py-1.5 px-3 text-center">Hadir</th>
                  <th className="py-1.5 px-3 text-right">Net Gaji</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unpaidDrafts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 px-3 font-medium text-slate-800">{p.employeeName}</td>
                    <td className="py-1.5 px-3 text-center text-slate-600">{p.totalHadir} Hari</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(p.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Source Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Pilih Sumber Dana Pengeluaran Gaji:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  batchPaySource === 'REKENING_BANK'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="batchPaySource"
                  value="REKENING_BANK"
                  checked={batchPaySource === 'REKENING_BANK'}
                  onChange={() => setBatchPaySource('REKENING_BANK')}
                  className="mt-0.5 text-emerald-600"
                />
                <span className="font-bold text-xs">Transfer Bank</span>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  batchPaySource === 'KAS_HARIAN'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="batchPaySource"
                  value="KAS_HARIAN"
                  checked={batchPaySource === 'KAS_HARIAN'}
                  onChange={() => setBatchPaySource('KAS_HARIAN')}
                  className="mt-0.5 text-emerald-600"
                />
                <span className="font-bold text-xs">Kas Harian (Tunai)</span>
              </label>
            </div>
          </div>

          {/* Jam Pembayaran Maksimal 20:00 */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Jam Pengeluaran Gaji (Maksimal 20:00 WIB):
            </label>
            <input
              type="time"
              required
              max="20:00"
              value={batchPayTime}
              onChange={(e) => {
                const val = e.target.value;
                setBatchPayTime(val > '20:00' ? '20:00' : val);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Sesuai SOP Pertashop: Pengeluaran gaji pasti dilakukan pada akhir bulan ({endOfMonth}), maksimal pukul 20:00 WIB.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lunasi {unpaidDrafts.length} Slip ({formatRupiah(totalBatchNet)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
