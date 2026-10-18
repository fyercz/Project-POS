import React from 'react';
import { Receipt, X, CheckCircle2, Clock, DollarSign, Printer } from 'lucide-react';
import { PayrollRecord, PertashopProfile } from '../types';
import { formatRupiah, formatMonthYear } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Diekstrak dari AttendancePayrollView.tsx (yang sebelumnya 2.882 baris) sebagai langkah
 * pertama dari rekomendasi di docs/REKOMENDASI_ARSITEKTUR.md: tech debt #7. Modal ini dipilih
 * sebagai contoh pertama karena paling berdiri sendiri (murni tampilan slip + dua aksi
 * pembayaran) dibanding modal lain di file itu yang masih sarat validasi form.
 *
 * Mengikuti pola yang SAMA PERSIS seperti modal mandiri lain di proyek ini (ConfirmModal,
 * SalesEntryModal, dst.): memanggil useModalA11y sendiri, bukan menerima hasilnya lewat props -
 * ini justru membuat komponen ini LEBIH konsisten dengan konvensi proyek dibanding versi inline
 * sebelumnya (yang menerima printSlipA11y dari parent).
 */

export interface PrintSalarySlipModalProps {
  slip: PayrollRecord | null;
  onClose: () => void;
  profile: PertashopProfile;
  onRevertPayment: (slip: PayrollRecord) => void;
  onOpenPaySalaryModal: (slip: PayrollRecord) => void;
}

export const PrintSalarySlipModal: React.FC<PrintSalarySlipModalProps> = ({
  slip,
  onClose,
  profile,
  onRevertPayment,
  onOpenPaySalaryModal,
}) => {
  const { containerRef, titleId } = useModalA11y(!!slip, onClose);

  if (!slip) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-400" />
            <h3 id={titleId} className="font-bold text-sm">Slip Gaji Karyawan Pertashop</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-slate-500 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs font-sans" id="printable-salary-slip">
          {/* Header Info */}
          <div className="text-center border-b border-slate-200 pb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">{profile.pertashopName}</h2>
            <p className="text-[11px] text-slate-500">{profile.location}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-900 rounded-full font-bold text-[11px] border border-indigo-200">
              SLIP GAJI BULAN: {formatMonthYear(slip.month).toUpperCase()}
            </div>
          </div>

          {/* Employee Details */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block">Nama Karyawan:</span>
              <strong className="text-slate-800 text-xs">{slip.employeeName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">No. Slip Gaji:</span>
              <strong className="font-mono text-slate-800">{slip.payrollNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Jabatan:</span>
              <span className="text-slate-700">{slip.employeeRole}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Kehadiran:</span>
              <strong className="text-emerald-800">{slip.totalHadir} Hari ({slip.totalLemburShifts} Lembur)</strong>
            </div>
          </div>

          {/* Earnings Breakdown */}
          <div className="space-y-2 border-b border-slate-200 pb-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              Rincian Penghasilan:
            </span>
            <div className="flex justify-between text-slate-700">
              <span>Gaji Pokok ({slip.totalHadir} Hari × {formatRupiah(slip.dailyRate)}):</span>
              <span className="font-mono font-semibold">{formatRupiah(slip.basicSalary)}</span>
            </div>
            {slip.overtimePay > 0 && (
              <div className="flex justify-between text-indigo-700">
                <span>Upah Lembur ({slip.totalLemburShifts} Shift × {formatRupiah(slip.overtimeRate)}):</span>
                <span className="font-mono font-semibold">+{formatRupiah(slip.overtimePay)}</span>
              </div>
            )}
            {Boolean(slip.bonusAllowance && slip.bonusAllowance > 0) && (
              <div className="flex justify-between text-emerald-700">
                <span>Bonus / Tunjangan Tambahan:</span>
                <span className="font-mono font-semibold">+{formatRupiah(slip.bonusAllowance || 0)}</span>
              </div>
            )}
          </div>

          {/* Deductions */}
          {slip.totalDeductions > 0 && (
            <div className="space-y-1.5 border-b border-slate-200 pb-3 text-rose-700">
              <span className="font-bold uppercase tracking-wider text-[10px] block">
                Potongan:
              </span>
              <div className="flex justify-between">
                <span>Kasbon / Potongan Lain:</span>
                <span className="font-mono font-semibold">-{formatRupiah(slip.totalDeductions)}</span>
              </div>
            </div>
          )}

          {/* Payment Status Banner */}
          {slip.paymentStatus === 'DIBAYAR' ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 block">STATUS: LUNAS DIBAYARKAN</span>
                  <span className="text-[11px] text-emerald-700">
                    Via {slip.paymentSource === 'KAS_HARIAN' ? 'Kas Harian Tunai' : 'Transfer Bank'}
                    {slip.paymentDate && ` • ${slip.paymentDate}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRevertPayment(slip)}
                className="px-2.5 py-1 text-rose-600 hover:bg-rose-100/70 border border-rose-200 rounded-lg text-[10px] font-semibold transition-colors"
                title="Kembalikan status slip gaji ini ke Draft"
              >
                Batal Bayar
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 block">STATUS: DRAFT (BELUM DIBAYAR)</span>
                  <span className="text-[11px] text-amber-700">Gaji belum dibayarkan ke karyawan</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenPaySalaryModal(slip)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Bayar Sekarang</span>
              </button>
            </div>
          )}

          {/* Total Net Salary */}
          <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Total Diterima (Take Home Pay):
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {slip.paymentStatus === 'DIBAYAR' ? '✓ Telah Dibayarkan' : 'Menunggu Pencairan'}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-cyan-300">
              {formatRupiah(slip.netSalary)}
            </span>
          </div>

          {/* Signatures */}
          <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-600">
            <div>
              <p>Penerima,</p>
              <div className="h-12"></div>
              <p className="font-bold underline text-slate-800">{slip.employeeName}</p>
            </div>
            <div>
              <p>Pengelola Pertashop,</p>
              <div className="h-12"></div>
              <p className="font-bold underline text-slate-800">{profile.ownerName.split('/')[0]}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {slip.paymentStatus !== 'DIBAYAR' && (
              <button
                type="button"
                onClick={() => onOpenPaySalaryModal(slip)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Bayar Gaji Ini</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Slip Gaji</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
