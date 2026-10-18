import React, { useState, useEffect } from 'react';
import { Users, X, Check } from 'lucide-react';
import { Employee } from '../types';
import { getTodayDateString } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Diekstrak dari AttendancePayrollView.tsx sebagai bagian dari rekomendasi di
 * docs/REKOMENDASI_ARSITEKTUR.md (tech debt #7) - modal keempat yang dipindah, mengikuti
 * pola inisialisasi form yang sama persis seperti AttendanceFormModal.tsx & SalesEntryModal.tsx.
 *
 * CATATAN: field `joinDate` dan `notes` pada Employee diisi otomatis (tanggal hari ini untuk
 * karyawan baru, nilai existing untuk edit) tapi TIDAK PERNAH punya input form sendiri di UI -
 * ini perilaku ASLI dari sebelum ekstraksi, sengaja DIPERTAHANKAN PERSIS (bukan ditambahkan
 * atau dihapus) karena mengubahnya di luar cakupan "pindahkan modal ini apa adanya".
 */

export interface EmployeeFormModalProps {
  isOpen: boolean;
  editingEmployee: Employee | null;
  onClose: () => void;
  onSave: (employee: Employee) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  editingEmployee,
  onClose,
  onSave,
}) => {
  const { containerRef, titleId } = useModalA11y(isOpen, onClose);

  const [empName, setEmpName] = useState<string>('');
  const [empNik, setEmpNik] = useState<string>('');
  const [empRole, setEmpRole] = useState<Employee['role']>('OPERATOR_DISPENSER');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empBankName, setEmpBankName] = useState<string>('BRI');
  const [empBankAcc, setEmpBankAcc] = useState<string>('');
  const [empDailyRate, setEmpDailyRate] = useState<number>(40000);
  const [empOvertimeRate, setEmpOvertimeRate] = useState<number>(30000);
  const [empJoinDate, setEmpJoinDate] = useState<string>(getTodayDateString());
  const [empNotes, setEmpNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingEmployee) {
      setEmpName(editingEmployee.name);
      setEmpNik(editingEmployee.nik || '');
      setEmpRole(editingEmployee.role);
      setEmpPhone(editingEmployee.phone);
      setEmpBankName(editingEmployee.bankName || 'BRI');
      setEmpBankAcc(editingEmployee.bankAccountNumber || '');
      setEmpDailyRate(editingEmployee.dailyRate);
      setEmpOvertimeRate(editingEmployee.overtimeRate);
      setEmpJoinDate(editingEmployee.joinDate);
      setEmpNotes(editingEmployee.notes || '');
    } else {
      setEmpName('');
      setEmpNik('');
      setEmpRole('OPERATOR_DISPENSER');
      setEmpPhone('0812-');
      setEmpBankName('BRI');
      setEmpBankAcc('');
      setEmpDailyRate(40000);
      setEmpOvertimeRate(30000);
      setEmpJoinDate(getTodayDateString());
      setEmpNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingEmployee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    const emp: Employee = {
      id: editingEmployee ? editingEmployee.id : `emp-${Date.now()}`,
      nik: empNik.trim(),
      name: empName.trim(),
      role: empRole,
      phone: empPhone.trim(),
      bankName: empBankName.trim(),
      bankAccountNumber: empBankAcc.trim(),
      dailyRate: empDailyRate,
      overtimeRate: empOvertimeRate,
      mealAllowanceDaily: 0,
      isActive: true,
      joinDate: empJoinDate,
      notes: empNotes.trim(),
    };

    onSave(emp);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 id={titleId} className="text-base font-bold">
                {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengaturan gaji harian, uang lembur, dan rekening transfer
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="Contoh: Daslam"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Jabatan / Role</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value as Employee['role'])}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
              >
                <option value="OPERATOR_DISPENSER">Operator Dispenser</option>
                <option value="KEPALA_REGU">Kepala Regu / Shift</option>
                <option value="ADMINISTRASI">Admin Kasir / Pembukuan</option>
                <option value="TEKNISI_KEBERSIHAN">Teknisi & Kebersihan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">NIK KTP (Opsional)</label>
              <input
                type="text"
                value={empNik}
                onChange={(e) => setEmpNik(e.target.value)}
                placeholder="352008..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono"
              />
            </div>
          </div>

          {/* Rates */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              Komponen Upah / Gaji:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 mb-1 text-[11px]">Tarif Gaji Harian (Rp)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={empDailyRate}
                  onChange={(e) => setEmpDailyRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1 text-[11px]">Tarif Lembur per Shift (Rp)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={empOvertimeRate}
                  onChange={(e) => setEmpOvertimeRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-indigo-700"
                />
              </div>
            </div>
          </div>

          {/* Bank Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nama Bank</label>
              <input
                type="text"
                value={empBankName}
                onChange={(e) => setEmpBankName(e.target.value)}
                placeholder="BRI / Mandiri / BSI"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nomor Rekening</label>
              <input
                type="text"
                value={empBankAcc}
                onChange={(e) => setEmpBankAcc(e.target.value)}
                placeholder="6338-01-..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Data Karyawan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
