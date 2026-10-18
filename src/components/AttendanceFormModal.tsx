import React, { useState, useEffect } from 'react';
import { Calendar, X, Clock, RefreshCw, Check } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, Employee } from '../types';
import { getShiftHoursInfo, STANDARD_SHIFTS, getTodayDateString } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * Diekstrak dari AttendancePayrollView.tsx sebagai bagian dari rekomendasi di
 * docs/REKOMENDASI_ARSITEKTUR.md (tech debt #7) - modal ketiga yang dipindah, dan yang
 * PERTAMA berisi form data-entry sungguhan (bukan sekadar tampilan).
 *
 * Pola inisialisasi form yang dipakai (useEffect mengisi field dari prop `editingAttendance`
 * saat modal dibuka) MENIRU PERSIS pola yang sudah ada di SalesEntryModal.tsx - bukan pola
 * baru. Sebelumnya, 8 state form (attEmployeeId, attDate, dst.) hidup langsung di
 * AttendancePayrollView.tsx dan diisi manual oleh DUA handler terpisah (handleOpenAddAttendance
 * untuk tambah baru, handleEditAttendance untuk edit) - sekarang keduanya cukup men-set
 * `editingAttendance` + membuka modal; pengisian form jadi tanggung jawab modal itu sendiri.
 */

export interface AttendanceFormModalProps {
  isOpen: boolean;
  editingAttendance: AttendanceRecord | null;
  employees: Employee[];
  onClose: () => void;
  onSave: (record: AttendanceRecord) => void;
}

export const AttendanceFormModal: React.FC<AttendanceFormModalProps> = ({
  isOpen,
  editingAttendance,
  employees,
  onClose,
  onSave,
}) => {
  const { containerRef, titleId } = useModalA11y(isOpen, onClose);

  const [attEmployeeId, setAttEmployeeId] = useState<string>('');
  const [attDate, setAttDate] = useState<string>(getTodayDateString());
  const [attShift, setAttShift] = useState<string>(STANDARD_SHIFTS.SHIFT_1.name);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('HADIR');
  const [attCheckIn, setAttCheckIn] = useState<string>('05:30');
  const [attCheckOut, setAttCheckOut] = useState<string>('13:30');
  const [attOvertimeShifts, setAttOvertimeShifts] = useState<number>(0);
  const [attNotes, setAttNotes] = useState<string>('');

  // Isi ulang form setiap modal dibuka - baik untuk tambah baru (editingAttendance null,
  // nilai default) maupun edit (editingAttendance terisi, salin semua field-nya).
  useEffect(() => {
    if (!isOpen) return;
    if (editingAttendance) {
      setAttEmployeeId(editingAttendance.employeeId);
      setAttDate(editingAttendance.date);
      const shiftInfo = getShiftHoursInfo(editingAttendance.shift);
      setAttShift(shiftInfo.shiftName);
      setAttStatus(editingAttendance.status);
      setAttCheckIn(editingAttendance.checkInTime || shiftInfo.checkIn);
      setAttCheckOut(editingAttendance.checkOutTime || shiftInfo.checkOut);
      setAttOvertimeShifts(editingAttendance.overtimeShifts || 0);
      setAttNotes(editingAttendance.notes || '');
    } else {
      setAttEmployeeId(employees[0]?.id || '');
      setAttDate(getTodayDateString());
      const shiftInfo = getShiftHoursInfo(STANDARD_SHIFTS.SHIFT_1.name);
      setAttShift(shiftInfo.shiftName);
      setAttStatus('HADIR');
      setAttCheckIn(shiftInfo.checkIn);
      setAttCheckOut(shiftInfo.checkOut);
      setAttOvertimeShifts(0);
      setAttNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingAttendance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === attEmployeeId);
    if (!emp) return;

    // Aturan baku: shift lembur hanya dihitung saat status LEMBUR. Untuk HADIR/IZIN/SAKIT/ALPA,
    // lembur selalu 0 - lihat ARCHITECTURE.md bagian aturan bisnis terkait lembur/absensi.
    const finalOvertime = attStatus === 'LEMBUR' ? (attOvertimeShifts > 0 ? attOvertimeShifts : 1) : 0;
    const shiftInfo = getShiftHoursInfo(attShift);
    const finalCheckIn = attCheckIn || shiftInfo.checkIn;
    const finalCheckOut = attCheckOut || shiftInfo.checkOut;

    const record: AttendanceRecord = {
      id: editingAttendance ? editingAttendance.id : `att-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: attDate,
      shift: shiftInfo.shiftName,
      status: attStatus,
      checkInTime: finalCheckIn,
      checkOutTime: finalCheckOut,
      overtimeShifts: finalOvertime,
      notes: attNotes.trim(),
      createdAt: editingAttendance ? editingAttendance.createdAt : `${attDate} ${finalCheckIn}`,
    };

    onSave(record);
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
        <div className="bg-gradient-to-r from-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 id={titleId} className="text-base font-bold">
                {editingAttendance ? 'Edit Catatan Absensi' : 'Form Catat Absensi Harian'}
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                Catat kehadiran operator dispenser & lemburan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-indigo-200 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Operator</label>
              <select
                value={attEmployeeId}
                onChange={(e) => setAttEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Tugas</label>
              <input
                type="date"
                required
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilihan Shift Tugas</label>
              <select
                value={attShift}
                onChange={(e) => {
                  const newShift = e.target.value;
                  const info = getShiftHoursInfo(newShift);
                  setAttShift(info.shiftName);
                  setAttCheckIn(info.checkIn);
                  setAttCheckOut(info.checkOut);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
              >
                <option value={STANDARD_SHIFTS.SHIFT_1.name}>{STANDARD_SHIFTS.SHIFT_1.name}</option>
                <option value={STANDARD_SHIFTS.SHIFT_2.name}>{STANDARD_SHIFTS.SHIFT_2.name}</option>
                <option value={STANDARD_SHIFTS.FULL_SHIFT.name}>{STANDARD_SHIFTS.FULL_SHIFT.name}</option>
                <option value={STANDARD_SHIFTS.OFF.name}>{STANDARD_SHIFTS.OFF.name}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status Kehadiran</label>
              <select
                value={attStatus}
                onChange={(e) => {
                  const st = e.target.value as AttendanceStatus;
                  setAttStatus(st);
                  if (st === 'LEMBUR') {
                    setAttOvertimeShifts(attOvertimeShifts > 0 ? attOvertimeShifts : 1);
                  } else {
                    setAttOvertimeShifts(0);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                <option value="HADIR">HADIR (Masuk Normal / 1 Hari Kerja)</option>
                <option value="LEMBUR">LEMBUR (Shift Tambahan +Rp 30.000)</option>
                <option value="IZIN">IZIN (Izin Tidak Masuk)</option>
                <option value="SAKIT">SAKIT</option>
                <option value="ALPA">ALPA (Tanpa Keterangan)</option>
              </select>
            </div>
          </div>

          {/* Policy note inside modal */}
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 text-[11px] text-amber-900 leading-snug">
            <span className="font-bold block">💡 Perhatian:</span>
            Jika rekan operator tidak masuk, operator yang berjaga <u>TIDAK otomatis</u> dihitung lembur/full shift berbayar. Pilih status <strong>HADIR</strong> jika hanya menjalankan jam kerja biasa. Pilih <strong>LEMBUR</strong> hanya jika operator resmi lembur shift tambahan.
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Jam Datang</label>
              <input
                type="time"
                value={attCheckIn}
                onChange={(e) => setAttCheckIn(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Jam Pulang</label>
              <input
                type="time"
                value={attCheckOut}
                onChange={(e) => setAttCheckOut(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Shift Lembur</label>
              <input
                type="number"
                min={0}
                max={2}
                value={attOvertimeShifts}
                onChange={(e) => setAttOvertimeShifts(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-indigo-700"
              />
            </div>
          </div>

          {/* Standard Hours Info & Auto Sync Button */}
          {(() => {
            const info = getShiftHoursInfo(attShift);
            const isHoursDifferent = (attCheckIn && attCheckIn !== info.checkIn) || (attCheckOut && attCheckOut !== info.checkOut);
            return (
              <div className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
                isHoursDifferent
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    Jam Standar {info.shiftName}: <strong className="font-mono text-slate-900">{info.displayHours}</strong>
                  </span>
                </div>
                {isHoursDifferent && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttCheckIn(info.checkIn);
                      setAttCheckOut(info.checkOut);
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Terapkan Jam Standar</span>
                  </button>
                )}
              </div>
            );
          })()}

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Keterangan / Catatan</label>
            <input
              type="text"
              value={attNotes}
              onChange={(e) => setAttNotes(e.target.value)}
              placeholder="Misal: Menggantikan shift sore karena rekan izin"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
            />
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
              <span>Simpan Absensi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
