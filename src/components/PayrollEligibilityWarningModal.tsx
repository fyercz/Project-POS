import React from 'react';
import { Clock } from 'lucide-react';
import { PayrollEligibility } from '../utils/attendanceSync';
import { formatMonthYear } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Diekstrak dari AttendancePayrollView.tsx sebagai bagian dari rekomendasi di
 * docs/REKOMENDASI_ARSITEKTUR.md (tech debt #7) - modal kedua yang dipindah setelah
 * PrintSalarySlipModal.tsx, dipilih karena paling kecil dan sederhana (murni peringatan,
 * tanpa form/validasi) di antara modal yang tersisa.
 */

export interface PayrollEligibilityWarningModalProps {
  eligibility: PayrollEligibility | null;
  onClose: () => void;
  selectedMonth: string;
}

export const PayrollEligibilityWarningModal: React.FC<PayrollEligibilityWarningModalProps> = ({
  eligibility,
  onClose,
  selectedMonth,
}) => {
  const { containerRef, titleId } = useModalA11y(!!eligibility, onClose);

  if (!eligibility) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h3 id={titleId} className="text-lg font-bold text-slate-900 mb-1">
          Jadwal Hitung Gaji Belum Dibuka
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Sesuai ketentuan sistem Pertashop, perhitungan gaji otomatis hanya dapat dilakukan pada <strong>2 hari terakhir bulan tersebut</strong>.
        </p>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 mb-5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500">Bulan Penggajian:</span>
            <span className="font-bold font-mono">{formatMonthYear(selectedMonth)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500">Jadwal Dibuka:</span>
            <span className="font-bold text-amber-900">
              Tanggal {eligibility.startEligibilityDay} s/d {eligibility.daysInMonth} {formatMonthYear(selectedMonth)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500">Ketentuan Periode:</span>
            <span className="font-semibold text-emerald-800 text-right">
              2 Hari Terakhir Bulan
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mb-5 leading-normal">
          💡 <em>Tujuan:</em> Mencegah slip gaji tercetak tidak lengkap karena shift harian dan absensi operator masih berjalan hingga akhir bulan.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};
