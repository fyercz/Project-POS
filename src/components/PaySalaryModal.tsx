import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { PayrollRecord, Employee } from '../types';
import { formatRupiah, formatMonthYear, formatDateIndo } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Diekstrak dari AttendancePayrollView.tsx sebagai bagian dari rekomendasi di
 * docs/REKOMENDASI_ARSITEKTUR.md (tech debt #7) - modal keenam yang dipindah, dan yang paling
 * rumit dari semua modal yang diekstrak dari file ini.
 *
 * BERBEDA dari modal lain yang sudah diekstrak: logika PENYIMPANAN (memanggil onPaySalary,
 * menyinkronkan status LIVE ke selectedSlipForPrint kalau slip yang sama sedang dicetak, dan
 * menampilkan toast) TETAP di AttendancePayrollView.tsx, bukan dipindah ke sini. Modal ini
 * HANYA menangani UI form (sumber dana, tanggal, jam, catatan) dan memanggil `onConfirm` dengan
 * nilai-nilai itu sebagai parameter. Alasan: logika penyimpanan itu punya efek samping lintas
 * modal (mengubah state modal LAIN yang mungkin sedang terbuka) yang terlalu berisiko
 * direplikasi di komponen terpisah tanpa akses langsung ke state tersebut.
 */

export interface PaySalaryModalProps {
  payroll: PayrollRecord | null;
  employees: Employee[];
  onClose: () => void;
  onConfirm: (
    payroll: PayrollRecord,
    source: 'REKENING_BANK' | 'KAS_HARIAN',
    date: string,
    notes: string,
    time: string
  ) => void;
  onEditNominal: (payroll: PayrollRecord) => void;
}

export const PaySalaryModal: React.FC<PaySalaryModalProps> = ({
  payroll,
  employees,
  onClose,
  onConfirm,
  onEditNominal,
}) => {
  const { containerRef, titleId } = useModalA11y(!!payroll, onClose);

  const [paySource, setPaySource] = useState<'REKENING_BANK' | 'KAS_HARIAN'>('REKENING_BANK');
  const [payDate, setPayDate] = useState<string>('');
  const [payTime, setPayTime] = useState<string>('20:00');
  const [payNotes, setPayNotes] = useState<string>('');

  // Isi ulang form setiap modal dibuka untuk slip BARU - meniru persis perhitungan
  // "akhir bulan" yang sebelumnya ada di handleOpenPaySalaryModal.
  useEffect(() => {
    if (!payroll) return;
    const [yearStr, monthStr] = payroll.month.split('-');
    const lastDay = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
    const endOfMonth = `${yearStr}-${monthStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    setPaySource(payroll.paymentSource || 'REKENING_BANK');
    setPayDate(endOfMonth);
    setPayTime('20:00');
    setPayNotes(payroll.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payroll?.id]);

  if (!payroll) return null;

  const targetEmp = employees.find((e) => e.id === payroll.employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalTime = payTime || '20:00';
    if (finalTime > '20:00') finalTime = '20:00';
    onConfirm(payroll, paySource, payDate, payNotes, finalTime);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 id={titleId} className="font-bold text-sm text-white">Konfirmasi Pembayaran Gaji</h3>
              <p className="text-[11px] text-emerald-100 font-mono mt-0.5">
                {payroll.payrollNumber} • {formatMonthYear(payroll.month)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {/* Employee Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Penerima Gaji:</span>
                <strong className="text-slate-900 text-sm">{payroll.employeeName}</strong>
                <span className="text-[11px] text-slate-500 block">
                  {payroll.employeeRole === 'OPERATOR_DISPENSER' ? 'Operator Dispenser' : payroll.employeeRole}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Rekap Kehadiran:</span>
                <span className="font-bold text-emerald-800 text-xs">
                  {payroll.totalHadir} Hari
                </span>
                {payroll.totalLemburShifts > 0 && (
                  <span className="text-indigo-700 text-[11px] block">
                    +{payroll.totalLemburShifts} Shift Lembur
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Gaji Bersih / Take Home Pay:</span>
              <div className="text-right">
                <span className="text-base font-black font-mono text-emerald-700 block">
                  {formatRupiah(payroll.netSalary)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditNominal(payroll);
                  }}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
                >
                  Edit Rincian Nominal
                </button>
              </div>
            </div>
          </div>

          {/* Payment Source Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Pilih Sumber Dana / Metode Pembayaran:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Bank Transfer */}
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  paySource === 'REKENING_BANK'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="paySource"
                  value="REKENING_BANK"
                  checked={paySource === 'REKENING_BANK'}
                  onChange={() => setPaySource('REKENING_BANK')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="font-bold block text-xs">Transfer Bank</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Rek. {targetEmp?.bankName || 'Bank'}: {targetEmp?.bankAccountNumber || 'Belum diisi'}
                  </span>
                </div>
              </label>

              {/* Kas Harian */}
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  paySource === 'KAS_HARIAN'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="paySource"
                  value="KAS_HARIAN"
                  checked={paySource === 'KAS_HARIAN'}
                  onChange={() => setPaySource('KAS_HARIAN')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="font-bold block text-xs">Kas Harian (Tunai)</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Diambil dari laci uang kasir shift
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Payment Date & Time (Sesuai Aturan SOP: Pasti Akhir Bulan, Maksimal Jam 20:00 WIB) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tanggal Pengeluaran Gaji:
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold">{payDate}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded ml-auto">
                  Pasti Akhir Bulan
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {formatDateIndo(payDate)}
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jam Pembayaran (Maks. 20:00 WIB):
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  max="20:00"
                  value={payTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPayTime(val > '20:00' ? '20:00' : val);
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:outline-none ${
                    payTime > '20:00'
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Cut-off SOP operasional maks. pukul 20:00 WIB
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan / Nomor Referensi (Opsional):
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Contoh: Transfer via BRI Mobile Ref #893021"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Notice SOP */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ketentuan SOP Pengeluaran Gaji Pertashop</span>
            </div>
            <p className="text-[10px] text-emerald-800 leading-relaxed">
              Pengeluaran untuk gaji pasti dilakukan pada <strong>akhir bulan ({formatDateIndo(payDate)})</strong>, dengan batas waktu <strong>maksimal pukul 20:00 WIB</strong>. Slip gaji akan diubah statusnya menjadi LUNAS dan dicatat otomatis ke pembukuan Beban Operasional (OpEx).
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Konfirmasi Bayar {formatRupiah(payroll.netSalary)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
