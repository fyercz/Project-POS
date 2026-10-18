import React, { useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { PrintSalarySlipModal } from './PrintSalarySlipModal';
import { PayrollEligibilityWarningModal } from './PayrollEligibilityWarningModal';
import { AttendanceFormModal } from './AttendanceFormModal';
import { EmployeeFormModal } from './EmployeeFormModal';
import { BatchPaySalaryModal } from './BatchPaySalaryModal';
import { PaySalaryModal } from './PaySalaryModal';
import {
  Users,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  CreditCard,
  Building,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Lock,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  PayrollRecord,
  AttendanceStatus,
  ExpenseRecord,
  PertashopProfile,
  SaleRecord,
} from '../types';
import {
  formatRupiah,
  formatNumber,
  formatDateIndo,
  formatShortDate,
  formatMonthYear,
  MONTH_NAMES_INDO,
  getTodayDateString,
  getCurrentTimeString,
  getShiftHoursInfo,
} from '../utils/formatters';
import {
  syncSalesToAttendance,
  recalculateMonthlyPayrolls,
  isAttendanceHoursMismatch,
  synchronizeAllAttendanceHours,
  isPayrollCalculationAllowed,
  isPayrollLocked,
  PayrollEligibility,
} from '../utils/attendanceSync';
import { ConfirmModal } from './ConfirmModal';
import * as XLSX from 'xlsx';

interface AttendancePayrollViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  payrolls: PayrollRecord[];
  profile: PertashopProfile;
  sales?: SaleRecord[];
  onSaveEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onSaveAttendance: (record: AttendanceRecord) => void;
  onDeleteAttendance: (recordId: string) => void;
  onSavePayroll: (payroll: PayrollRecord) => void;
  onDeletePayroll: (payrollId: string) => void;
  onPaySalary: (
    payroll: PayrollRecord,
    paymentSource: 'KAS_HARIAN' | 'REKENING_BANK',
    paymentDate?: string,
    notes?: string,
    paymentTime?: string
  ) => void;
  onUnpaySalary?: (payrollId: string) => void;
  onBatchSyncAttendance?: (records: AttendanceRecord[], targetMonth?: string) => void;
}

export const AttendancePayrollView: React.FC<AttendancePayrollViewProps> = ({
  employees,
  attendance,
  payrolls,
  profile,
  sales = [],
  onSaveEmployee,
  onDeleteEmployee,
  onSaveAttendance,
  onDeleteAttendance,
  onSavePayroll,
  onDeletePayroll,
  onPaySalary,
  onUnpaySalary,
  onBatchSyncAttendance,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'payroll' | 'employees'>('payroll');
  
  // Selected Filter Month (YYYY-MM)
  // Pilihan bulan dinamis: 24 bulan terakhir + 1 bulan ke depan + bulan yang ada di data absensi/gaji
  const monthOptions = React.useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    for (let i = -1; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    attendance.forEach((a) => a.date && set.add(a.date.substring(0, 7)));
    payrolls.forEach((p) => p.month && set.add(p.month));
    return Array.from(set).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort().reverse();
  }, [attendance, payrolls]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal penjelasan aturan jadwal hitung gaji (2 hari terakhir bulan)
  const [eligibilityWarningModal, setEligibilityWarningModal] = useState<PayrollEligibility | null>(null);

  // Status kelayakan hitung gaji otomatis untuk bulan yang dipilih
  const payrollEligibility = React.useMemo(() => {
    return isPayrollCalculationAllowed(selectedMonth);
  }, [selectedMonth]);
  
  // Modal states
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState<boolean>(false);

  const [attendanceToDelete, setAttendanceToDelete] = useState<AttendanceRecord | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<PayrollRecord | null>(null);

  // Salary Payment Modal State
  const [payingPayrollModal, setPayingPayrollModal] = useState<PayrollRecord | null>(null);


  // Batch Pay Modal State (Bayar Semua Gaji Akhir Bulan Maks. 20:00)
  const [isBatchPayModalOpen, setIsBatchPayModalOpen] = useState<boolean>(false);


  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto clear toast after 4s
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Editing items
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form states for attendance

  // Form states for employee

  // Modal Edit Nominal Gaji states
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
  const [editOvertimePay, setEditOvertimePay] = useState<number>(0);
  const [editBonusAllowance, setEditBonusAllowance] = useState<number>(0);
  const [editKasbonDeduction, setEditKasbonDeduction] = useState<number>(0);
  const [editPenaltyDeduction, setEditPenaltyDeduction] = useState<number>(0);
  const [editOtherDeductions, setEditOtherDeductions] = useState<number>(0);
  const [editTotalHadir, setEditTotalHadir] = useState<number>(0);
  const [editTotalLemburShifts, setEditTotalLemburShifts] = useState<number>(0);
  const [editDailyRate, setEditDailyRate] = useState<number>(40000);
  const [editOvertimeRate, setEditOvertimeRate] = useState<number>(30000);
  const [editNotes, setEditNotes] = useState<string>('');

  // Filtered data for selected month
  const monthAttendance = attendance.filter((a) => a.date.startsWith(selectedMonth));
  const monthPayrolls = payrolls.filter((p) => p.month === selectedMonth);

  // Stats calculation
  const totalEmployees = employees.filter((e) => e.isActive).length;
  const totalDaysInMonth = monthAttendance.length;
  const totalHadirAll = monthAttendance.filter((a) => a.status === 'HADIR' || a.status === 'LEMBUR').length;
  const totalLemburShiftsAll = monthAttendance.reduce((sum, a) => sum + (a.overtimeShifts || 0), 0);
  const totalSalaryPayout = monthPayrolls.reduce((sum, p) => sum + p.netSalary, 0);
  const totalPaidSalary = monthPayrolls.filter((p) => p.paymentStatus === 'DIBAYAR').reduce((sum, p) => sum + p.netSalary, 0);
  const totalUnpaidSalary = monthPayrolls.filter((p) => p.paymentStatus !== 'DIBAYAR').reduce((sum, p) => sum + p.netSalary, 0);

  // Mismatched working hours vs shift assignment
  const mismatchedMonthAttendance = monthAttendance.filter(isAttendanceHoursMismatch);
  const totalMismatchedAttendance = attendance.filter(isAttendanceHoursMismatch);

  // Handlers for Salary Payment - logika perhitungan "akhir bulan" dan penyimpanan sekarang
  // ada di PaySalaryModal/BatchPaySalaryModal (lihat pemanggilan onConfirm di JSX bawah);
  // fungsi ini cukup membuka modalnya saja.
  const handleOpenPaySalaryModal = (payroll: PayrollRecord) => {
    setPayingPayrollModal(payroll);
  };

  const handleRevertPayment = (payroll: PayrollRecord) => {
    if (onUnpaySalary) {
      onUnpaySalary(payroll.id);
    } else {
      const reverted: PayrollRecord = {
        ...payroll,
        paymentStatus: 'DRAFT',
        paymentDate: undefined,
      };
      onSavePayroll(reverted);
    }

    if (selectedSlipForPrint && selectedSlipForPrint.id === payroll.id) {
      setSelectedSlipForPrint({
        ...selectedSlipForPrint,
        paymentStatus: 'DRAFT',
        paymentDate: undefined,
      });
    }

    setToastMessage({
      text: `Status gaji ${payroll.employeeName} berhasil dikembalikan ke Draft (Belum Dibayar).`,
      type: 'info',
    });
  };

  // Generate / Recalculate Payroll for all employees in selected month
  const handleAutoGeneratePayroll = () => {
    // Validasi aturan: hitung gaji otomatis hanya dapat dilakukan pada 2 hari terakhir bulan tersebut
    if (!payrollEligibility.allowed) {
      setEligibilityWarningModal(payrollEligibility);
      setToastMessage({
        text: `⚠️ Tidak dapat menghitung gaji sekarang: ${payrollEligibility.message}`,
        type: 'error',
      });
      return;
    }

    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const newPayrolls: PayrollRecord[] = [];
    let skippedPaidCount = 0;

    employees.filter((e) => e.isActive).forEach((emp, index) => {
      const empAtt = monthAttendance.filter((a) => a.employeeId === emp.id);
      const totalHadir = empAtt.filter((a) => a.status === 'HADIR' || a.status === 'LEMBUR').length;
      const totalLemburShifts = empAtt.reduce((sum, a) => sum + (a.overtimeShifts || 0), 0);
      const totalIzin = empAtt.filter((a) => a.status === 'IZIN').length;
      const totalSakit = empAtt.filter((a) => a.status === 'SAKIT').length;
      const totalAlpa = empAtt.filter((a) => a.status === 'ALPA').length;

      const existingSlip = payrolls.find((p) => p.month === selectedMonth && p.employeeId === emp.id);

      if (isPayrollLocked(existingSlip)) {
        skippedPaidCount++;
        return;
      }

      // Pertahankan nominal manual jika jumlah hari hadir/shift sama
      const basicSalary =
        existingSlip && existingSlip.totalHadir === totalHadir
          ? existingSlip.basicSalary
          : totalHadir * emp.dailyRate;

      const overtimePay =
        existingSlip && existingSlip.totalLemburShifts === totalLemburShifts
          ? existingSlip.overtimePay
          : totalLemburShifts * emp.overtimeRate;

      const mealAllowance = 0; // Uang makan dihapus
      const bonusAllowance = existingSlip?.bonusAllowance || 0;

      const totalDeductions =
        (existingSlip?.kasbonDeduction || 0) +
        (existingSlip?.penaltyDeduction || 0) +
        (existingSlip?.otherDeductions || 0);

      const grossSalary = basicSalary + overtimePay + bonusAllowance;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      const payrollItem: PayrollRecord = {
        id: existingSlip ? existingSlip.id : `pay-${selectedMonth}-${emp.id}`,
        payrollNumber: existingSlip
          ? existingSlip.payrollNumber
          : `SLIP-${selectedMonth.replace('-', '')}-${String(index + 1).padStart(3, '0')}`,
        month: selectedMonth,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        periodStartDate: `${selectedMonth}-01`,
        periodEndDate: `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`,
        totalHadir,
        totalLemburShifts,
        totalIzin,
        totalSakit,
        totalAlpa,
        dailyRate: emp.dailyRate,
        basicSalary,
        overtimeRate: emp.overtimeRate,
        overtimePay,
        mealAllowance,
        bonusAllowance,
        kasbonDeduction: existingSlip?.kasbonDeduction || 0,
        penaltyDeduction: existingSlip?.penaltyDeduction || 0,
        otherDeductions: existingSlip?.otherDeductions || 0,
        grossSalary,
        totalDeductions,
        netSalary,
        paymentStatus: existingSlip?.paymentStatus || 'DRAFT',
        paymentDate: existingSlip?.paymentDate,
        paymentSource: existingSlip?.paymentSource || 'REKENING_BANK',
        notes: existingSlip?.notes || `Gaji bulanan berdasarkan rekap ${totalHadir} hari kerja & ${totalLemburShifts} shift lembur.`,
        createdAt: existingSlip?.createdAt || `${selectedMonth}-${String(daysInMonth).padStart(2, '0')} 17:00`,
      };

      onSavePayroll(payrollItem);
      newPayrolls.push(payrollItem);
    });

    setToastMessage({
      text: `Berhasil mengkalkulasi ulang slip gaji untuk ${newPayrolls.length} karyawan pada bulan ${formatMonthYear(selectedMonth)}!${
        skippedPaidCount > 0
          ? ` (${skippedPaidCount} slip yang sudah DIBAYAR dilewati/tidak diubah - batalkan status bayar dulu bila ingin mengoreksinya.)`
          : ''
      }`,
      type: 'success',
    });
  };

  // Handlers for Edit Nominal Gaji
  const handleOpenEditPayroll = (payroll: PayrollRecord) => {
    setEditingPayroll(payroll);
    setEditTotalHadir(payroll.totalHadir);
    setEditTotalLemburShifts(payroll.totalLemburShifts);
    setEditDailyRate(payroll.dailyRate || 40000);
    setEditOvertimeRate(payroll.overtimeRate || 30000);
    setEditBasicSalary(payroll.basicSalary);
    setEditOvertimePay(payroll.overtimePay);
    setEditBonusAllowance(payroll.bonusAllowance || 0);
    setEditKasbonDeduction(payroll.kasbonDeduction || 0);
    setEditPenaltyDeduction(payroll.penaltyDeduction || 0);
    setEditOtherDeductions(payroll.otherDeductions || 0);
    setEditNotes(payroll.notes || '');
  };

  const handleResetToFormula = () => {
    if (!editingPayroll) return;
    setEditBasicSalary(editTotalHadir * editDailyRate);
    setEditOvertimePay(editTotalLemburShifts * editOvertimeRate);
    setEditBonusAllowance(0);
    setToastMessage({
      text: `Nominal dihitung ulang berdasarkan tarif master (Hadir × Rp ${editDailyRate.toLocaleString()} + Lembur × Rp ${editOvertimeRate.toLocaleString()})`,
      type: 'info',
    });
  };

  const handleSaveEditPayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;

    const grossSalary = editBasicSalary + editOvertimePay + editBonusAllowance;
    const totalDeductions = editKasbonDeduction + editPenaltyDeduction + editOtherDeductions;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    const updated: PayrollRecord = {
      ...editingPayroll,
      totalHadir: editTotalHadir,
      totalLemburShifts: editTotalLemburShifts,
      dailyRate: editDailyRate,
      overtimeRate: editOvertimeRate,
      basicSalary: editBasicSalary,
      overtimePay: editOvertimePay,
      mealAllowance: 0,
      bonusAllowance: editBonusAllowance,
      kasbonDeduction: editKasbonDeduction,
      penaltyDeduction: editPenaltyDeduction,
      otherDeductions: editOtherDeductions,
      grossSalary,
      totalDeductions,
      netSalary,
      notes: editNotes.trim(),
    };

    onSavePayroll(updated);
    setEditingPayroll(null);
    setToastMessage({
      text: `Nominal gaji ${updated.employeeName} berhasil diperbarui (Gaji Bersih: ${formatRupiah(netSalary)})`,
      type: 'success',
    });
  };

  // Buka modal Catat Absensi - pengisian form (tambah baru vs edit) sekarang jadi tanggung
  // jawab AttendanceFormModal sendiri (useEffect di dalamnya, dipicu oleh editingAttendance).
  const handleOpenAddAttendance = () => {
    setEditingAttendance(null);
    setIsAttendanceModalOpen(true);
  };

  const handleEditAttendance = (record: AttendanceRecord) => {
    setEditingAttendance(record);
    setIsAttendanceModalOpen(true);
  };

  // Open Employee Modal
  // Pengisian form (tambah baru vs edit) sekarang jadi tanggung jawab EmployeeFormModal
  // sendiri (useEffect di dalamnya, dipicu oleh editingEmployee) - lihat catatan serupa di
  // handleOpenAddAttendance/handleEditAttendance.
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  // Sync all attendance from shift sales
  const handleSyncFromShiftSales = () => {
    if (!sales || sales.length === 0) {
      setToastMessage({
        text: 'Tidak ada data catatan shift penjualan yang ditemukan.',
        type: 'error',
      });
      return;
    }

    const targetSales = sales.filter((s) => s.transactionDate.startsWith(selectedMonth));
    if (targetSales.length === 0) {
      setToastMessage({
        text: `Tidak ada catatan shift penjualan pada bulan ${formatMonthYear(selectedMonth)}.`,
        type: 'info',
      });
      return;
    }

    const { updatedAttendance, addedCount, updatedCount } = syncSalesToAttendance(
      sales,
      attendance,
      employees,
      selectedMonth
    );

    if (onBatchSyncAttendance) {
      onBatchSyncAttendance(updatedAttendance, selectedMonth);
    } else {
      updatedAttendance.forEach((rec) => onSaveAttendance(rec));
    }

    // Auto update payrolls for this month
    const updatedPayrolls = recalculateMonthlyPayrolls(updatedAttendance, employees, payrolls, selectedMonth);
    updatedPayrolls.forEach((p) => {
      if (p.month === selectedMonth) {
        onSavePayroll(p);
      }
    });

    setToastMessage({
      text: `Sinkronisasi Absensi Selesai (${formatMonthYear(selectedMonth)}): ${addedCount} baru, ${updatedCount} diperbarui. Slip gaji otomatis tersinkron.`,
      type: 'success',
    });
  };

  // Synchronize all attendance records with standard shift working hours
  const handleSynchronizeAllHours = () => {
    const { updatedAttendance, fixedCount } = synchronizeAllAttendanceHours(attendance);
    if (fixedCount === 0) {
      setToastMessage({
        text: 'Semua jam kerja sudah sinkron sempurna dengan shift tugas!',
        type: 'info',
      });
      return;
    }

    if (onBatchSyncAttendance) {
      onBatchSyncAttendance(updatedAttendance);
    } else {
      updatedAttendance.forEach((rec) => onSaveAttendance(rec));
    }

    // Auto update payrolls for selected month
    const updatedPayrolls = recalculateMonthlyPayrolls(updatedAttendance, employees, payrolls, selectedMonth);
    updatedPayrolls.forEach((p) => {
      if (p.month === selectedMonth) {
        onSavePayroll(p);
      }
    });

    setToastMessage({
      text: `Berhasil menyinkronkan jam kerja & shift tugas untuk ${fixedCount} data absensi! Jam kerja kini presisi sesuai shift tugas.`,
      type: 'success',
    });
  };

  // Synchronize a single record's hours to its standard shift
  const handleFixSingleRecordHours = (rec: AttendanceRecord) => {
    const info = getShiftHoursInfo(rec.shift);
    const updated: AttendanceRecord = {
      ...rec,
      shift: info.shiftName,
      checkInTime: info.checkIn,
      checkOutTime: info.checkOut,
    };
    onSaveAttendance(updated);
    setToastMessage({
      text: `Jam kerja ${rec.employeeName} (${rec.date}) telah disinkronkan ke jam standar ${info.displayHours}.`,
      type: 'success',
    });
  };

  // Export Monthly Payroll to Excel
  const handleExportPayrollExcel = () => {
    const data = monthPayrolls.map((p, idx) => ({
      No: idx + 1,
      'No. Slip': p.payrollNumber,
      Bulan: formatMonthYear(p.month),
      'Nama Karyawan': p.employeeName,
      Jabatan: p.employeeRole === 'OPERATOR_DISPENSER' ? 'Operator Dispenser' : p.employeeRole,
      'Total Hadir (Hari)': p.totalHadir,
      'Tarif Harian (Rp)': p.dailyRate,
      'Gaji Pokok Hadir (Rp)': p.basicSalary,
      'Shift Lembur': p.totalLemburShifts,
      'Upah Lembur (Rp)': p.overtimePay,
      'Tunjangan/Bonus (Rp)': p.bonusAllowance || 0,
      'Gaji Kotor (Rp)': p.grossSalary,
      'Potongan Kasbon (Rp)': p.kasbonDeduction,
      'Total Potongan (Rp)': p.totalDeductions,
      'Gaji Bersih / THP (Rp)': p.netSalary,
      Status: p.paymentStatus === 'DIBAYAR' ? 'LUNAS DIBAYAR' : 'DRAFT / BELUM DIBAYAR',
      'Metode Bayar': p.paymentSource,
      'Tgl Bayar': p.paymentDate || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Payroll ${selectedMonth}`);
    XLSX.writeFile(wb, `Rekap_Gaji_Pertashop_${selectedMonth}.xlsx`);
  };

  // Audit aksesibilitas: 7 modal inline di bawah ini tidak punya Escape/focus-trap/ARIA dialog
  // sama sekali. Setiap modal dapat satu pemanggilan hook sendiri (wajib di level atas komponen,
  // bukan di dalam blok kondisional render-nya) - lihat src/hooks/useModalA11y.ts.

  const editingPayrollA11y = useModalA11y(!!editingPayroll, () => setEditingPayroll(null));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Month Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/30">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                SDM & Payroll Operator
              </span>
              <span className="text-xs text-slate-500">• Pertashop Krajan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
              Absensi Bulanan & Penggajian Karyawan
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Kalkulasi otomatis gaji pokok, uang shift lembur, dan slip gaji bulanan berdasarkan catatan absensi harian.
            </p>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white/10 p-1.5 rounded-xl border border-white/20 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-300 ml-1.5" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Pilih bulan absensi & gaji"
              className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none pr-2 cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {formatMonthYear(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Bayar Semua Gaji Akhir Bulan (Maks. 20:00) */}
          {monthPayrolls.some((p) => p.paymentStatus !== 'DIBAYAR') && (
            <button
              type="button"
              onClick={() => setIsBatchPayModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 ring-1 ring-white/20 flex items-center gap-1.5 cursor-pointer transition-all"
              title={`Bayar seluruh slip gaji yang belum lunas pada akhir bulan (${formatMonthYear(selectedMonth)}) maksimal pukul 20:00 WIB`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Bayar Gaji Akhir Bulan (Maks. 20:00)</span>
              <span className="hidden sm:inline px-1.5 py-0.5 text-[9px] bg-white/20 rounded font-normal font-mono">
                {monthPayrolls.filter((p) => p.paymentStatus !== 'DIBAYAR').length} Draft
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAutoGeneratePayroll}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer ${
              payrollEligibility.allowed
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 ring-1 ring-white/20'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40'
            }`}
            title={
              payrollEligibility.allowed
                ? `Hitung gaji otomatis bulan ${formatMonthYear(selectedMonth)} (Aktif pada 2 hari terakhir bulan)`
                : `Hitung gaji otomatis baru dapat dilakukan pada 2 hari terakhir bulan (${payrollEligibility.startEligibilityDay} - ${payrollEligibility.daysInMonth} ${formatMonthYear(selectedMonth)})`
            }
          >
            {payrollEligibility.allowed ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Hitung Gaji Otomatis</span>
                <span className="hidden sm:inline px-1.5 py-0.5 text-[9px] bg-white/20 rounded font-normal font-mono">
                  Buka Tgl {payrollEligibility.startEligibilityDay}-{payrollEligibility.daysInMonth}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Hitung Gaji (Buka Tgl {payrollEligibility.startEligibilityDay})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Karyawan Aktif</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalEmployees} <span className="text-xs font-normal text-slate-500">Orang</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Operator shift 1 & 2 dispenser</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Kehadiran Bulan Ini</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {totalHadirAll} <span className="text-xs font-normal text-slate-500">Hari Kerja</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Termasuk {totalLemburShiftsAll} shift lembur</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Beban Gaji ({formatMonthYear(selectedMonth)})</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900 font-mono">
            {formatRupiah(totalSalaryPayout)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Akumulasi gaji pokok + lemburan</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Status Pembayaran Gaji</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono">
            {totalUnpaidSalary === 0 ? (
              <span className="text-emerald-600 font-bold">Lunas Terbayar</span>
            ) : (
              <span className="text-amber-700 font-bold">{formatRupiah(totalUnpaidSalary)} <span className="text-xs font-normal text-slate-500">(Draft)</span></span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Terbayar: {formatRupiah(totalPaidSalary)}
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeSubTab === 'payroll'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Penggajian & Slip Gaji ({monthPayrolls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeSubTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Buku Absensi Harian ({monthAttendance.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('employees')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
              activeSubTab === 'employees'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master Data Karyawan ({employees.length})</span>
          </button>
        </div>

        {/* Action button based on sub tab */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'payroll' && (
            <button
              type="button"
              onClick={handleExportPayrollExcel}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-200"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel Gaji</span>
            </button>
          )}

          {activeSubTab === 'attendance' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFromShiftSales}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Sinkronkan seluruh catatan kehadiran dan lembur dari data penjualan shift"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sinkron Dari Penjualan</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddAttendance}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Manual</span>
              </button>
            </div>
          )}

          {activeSubTab === 'employees' && (
            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Karyawan</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== TAB 1: PENGGAJIAN BULANAN ===================== */}
      {activeSubTab === 'payroll' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Bulan: {formatMonthYear(selectedMonth)}
              </span>
              <h3 className="text-base font-bold text-slate-800">
                Daftar Penggajian & Slip Gaji Bulanan
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              *Gaji otomatis: <span className="font-semibold text-slate-700">(Hadir × Rp 40.000) + (Lembur × Rp 30.000)</span> • Klik <strong className="text-amber-700 font-semibold">Edit Nominal</strong> untuk penyesuaian gaji fleksibel
            </p>
          </div>

          {/* Banner Informasi Jadwal 2 Hari Terakhir Penggajian */}
          {payrollEligibility.status === 'ACTIVE_WINDOW' ? (
            <div className="mx-4 sm:mx-5 my-3.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950">Periode Hitung Gaji Aktif (2 Hari Terakhir Bulan): </span>
                  Saat ini berada pada tanggal {payrollEligibility.startEligibilityDay} - {payrollEligibility.daysInMonth} {formatMonthYear(selectedMonth)}. Seluruh catatan kehadiran dan shift operator siap dikalkulasi menjadi slip gaji bulanan.
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg font-bold text-[10px] whitespace-nowrap uppercase tracking-wider">
                Siap Hitung
              </span>
            </div>
          ) : payrollEligibility.status === 'TOO_EARLY' ? (
            <div className="mx-4 sm:mx-5 my-3.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-amber-800">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-950">Jadwal Hitung Gaji Belum Dibuka: </span>
                  Perhitungan gaji otomatis baru dapat dilakukan pada <strong>2 hari terakhir bulan ini</strong> (mulai tanggal {payrollEligibility.startEligibilityDay} {formatMonthYear(selectedMonth)}) agar seluruh data kehadiran dan shift kerja tercatat lengkap.
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg font-bold text-[10px] whitespace-nowrap">
                Buka Tgl {payrollEligibility.startEligibilityDay}
              </span>
            </div>
          ) : payrollEligibility.status === 'FUTURE_MONTH' ? (
            <div className="mx-4 sm:mx-5 my-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <div className="p-1.5 bg-slate-400 text-white rounded-lg shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900">Periode Belum Berjalan: </span>
                  Hitung gaji otomatis untuk bulan {formatMonthYear(selectedMonth)} akan dibuka pada 2 hari terakhir bulan tersebut (mulai tanggal {payrollEligibility.startEligibilityDay} {formatMonthYear(selectedMonth)}).
                </div>
              </div>
              <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] whitespace-nowrap">
                Mendatang
              </span>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Slip & Karyawan</th>
                  <th className="py-3 px-3 text-center">Kehadiran (Hari)</th>
                  <th className="py-3 px-3 text-center">Lemburan</th>
                  <th className="py-3 px-3 text-right">Gaji Pokok</th>
                  <th className="py-3 px-3 text-right">Uang Lembur</th>
                  <th className="py-3 px-3 text-right">Bonus/Tunjangan</th>
                  <th className="py-3 px-3 text-right">Potongan</th>
                  <th className="py-3 px-4 text-right">Gaji Bersih (THP)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi & Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada rekap gaji untuk bulan {formatMonthYear(selectedMonth)}.</p>
                      {payrollEligibility.allowed ? (
                        <button
                          type="button"
                          onClick={handleAutoGeneratePayroll}
                          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Kalkulasi Slip Gaji Bulan Ini Sekarang</span>
                        </button>
                      ) : (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Kalkulasi gaji otomatis dapat dilakukan pada 2 hari terakhir bulan (mulai tanggal {payrollEligibility.startEligibilityDay} {formatMonthYear(selectedMonth)})</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  monthPayrolls.map((p) => {
                    const isPaid = p.paymentStatus === 'DIBAYAR';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">{p.employeeName}</div>
                          <div className="text-[11px] text-indigo-600 font-mono mt-0.5">{p.payrollNumber}</div>
                          <span className="text-[10px] text-slate-500">
                            {p.employeeRole === 'OPERATOR_DISPENSER' ? 'Operator Dispenser' : p.employeeRole}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold font-mono rounded-lg border border-emerald-200">
                            {p.totalHadir} Hari
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {p.totalLemburShifts > 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold font-mono rounded-lg border border-indigo-200">
                              {p.totalLemburShifts} Shift
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          <div>{formatRupiah(p.basicSalary)}</div>
                          <span className="text-[10px] text-slate-500">@{formatRupiah(p.dailyRate)}</span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-indigo-700 whitespace-nowrap">
                          {formatRupiah(p.overtimePay)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {p.bonusAllowance && p.bonusAllowance > 0 ? (
                            `+${formatRupiah(p.bonusAllowance)}`
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                          {p.totalDeductions > 0 ? `-${formatRupiah(p.totalDeductions)}` : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                          <span className="text-base font-black text-slate-900 block">
                            {formatRupiah(p.netSalary)}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Lunas ({p.paymentSource === 'KAS_HARIAN' ? 'Kas' : 'Bank'})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenPaySalaryModal(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                              title="Klik untuk bayar sekarang"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Draft (Belum Bayar)</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayroll(p)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Edit Nominal Rincian Gaji"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Edit Nominal</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedSlipForPrint(p)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Lihat & Cetak Slip Gaji"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPaySalaryModal(p)}
                                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Bayar Gaji Karyawan Ini"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Bayar Gaji</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevertPayment(p)}
                                className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-[10px] font-medium"
                                title="Kembalikan status ke Draft (Belum Bayar)"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: BUKU ABSENSI HARIAN ===================== */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          {/* Policy Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 text-xs flex items-start gap-3 shadow-2xs">
            <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-slate-700">
              <strong className="text-slate-900 block font-bold text-xs">
                Ketentuan Absensi & Lembur Operator Pertashop:
              </strong>
              <p className="leading-relaxed text-[11px] text-slate-600">
                Ketika salah satu operator tidak masuk atau berhalangan, operator yang hadir <span className="font-bold text-blue-900">TIDAK otomatis dianggap melakukan full shift atau lembur</span>. Jika operator hanya menjalankan jam kerja shift normalnya (misal Pertashop hanya buka 1 shift atau jam normal), status tetap <span className="font-bold text-emerald-700">HADIR</span> (1 hari kerja biasa, tanpa tambahan uang lembur).
              </p>
              <p className="text-[11px] text-indigo-700 font-medium">
                Status <span className="font-bold text-indigo-900">LEMBUR</span> (+Rp 30.000/shift) hanya diberikan bila operator secara resmi ditugaskan melayani shift tambahan / 2 shift penuh.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Buku Absensi & Shift Kerja
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  Catatan Presensi Operator ({formatMonthYear(selectedMonth)})
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSynchronizeAllHours}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    mismatchedMonthAttendance.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                      : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  title="Sinkronkan jam datang & pulang agar presisi sesuai shift tugas"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan Jam & Shift</span>
                  {mismatchedMonthAttendance.length > 0 && (
                    <span className="bg-white text-amber-800 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold">
                      {mismatchedMonthAttendance.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSyncFromShiftSales}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Tarik data shift penjualan untuk otomatis mengisi absensi & lembur"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tarik Data Penjualan</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddAttendance}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Presensi</span>
                </button>
              </div>
            </div>

            {/* Mismatch Warning Alert Banner */}
            {mismatchedMonthAttendance.length > 0 && (
              <div className="mx-4 sm:mx-5 my-3 p-3.5 bg-amber-50 border border-amber-300/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="text-xs">
                    <strong className="block sm:inline font-bold">Jam Kerja Tidak Sinkron: </strong>
                    <span>Ditemukan <strong>{mismatchedMonthAttendance.length}</strong> catatan absensi di bulan {formatMonthYear(selectedMonth)} dengan jam kerja tidak sesuai standar shift tugas.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSynchronizeAllHours}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan Sekarang</span>
                </button>
              </div>
            )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nama Operator</th>
                  <th className="py-3 px-4">Shift Tugas</th>
                  <th className="py-3 px-3 text-center">Jam Kerja</th>
                  <th className="py-3 px-3 text-center">Status Presensi</th>
                  <th className="py-3 px-3 text-center">Lemburan</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada absensi tercatat pada bulan {formatMonthYear(selectedMonth)}.</p>
                    </td>
                  </tr>
                ) : (
                  monthAttendance.map((rec) => {
                    const isMismatched = isAttendanceHoursMismatch(rec);
                    const shiftInfo = getShiftHoursInfo(rec.shift);

                    return (
                      <tr key={rec.id} className={`transition-colors ${isMismatched ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/70'}`}>
                        <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="font-semibold">{formatDateIndo(rec.date)}</div>
                          <span className="text-[10px] text-slate-500 font-mono">{rec.date}</span>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {rec.employeeName}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                          <span className="font-medium">{rec.shift}</span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-slate-800">
                              {rec.checkInTime || '-'} s/d {rec.checkOutTime || '-'}
                            </span>
                            {isMismatched && (
                              <button
                                type="button"
                                onClick={() => handleFixSingleRecordHours(rec)}
                                title={`Jam kerja tidak sinkron dengan ${rec.shift}. Klik untuk sesuaikan ke ${shiftInfo.displayHours}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>Sinkronkan ({shiftInfo.displayHours})</span>
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              rec.status === 'HADIR'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : rec.status === 'LEMBUR'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : rec.status === 'IZIN'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {rec.overtimeShifts > 0 ? (
                            <span className="font-bold text-indigo-700 font-mono">
                              +{rec.overtimeShifts} Shift
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {rec.notes || '-'}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {isMismatched && (
                              <button
                                type="button"
                                onClick={() => handleFixSingleRecordHours(rec)}
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                                title={`Sinkronkan jam kerja ke ${shiftInfo.displayHours}`}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditAttendance(rec)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Catatan Absensi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendanceToDelete(rec)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Absensi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* ===================== TAB 3: MASTER KARYAWAN ===================== */}
      {activeSubTab === 'employees' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Data Kepegawaian
              </span>
              <h3 className="text-base font-bold text-slate-800">
                Daftar Operator & Staf Pertashop
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Tarif harian standar: <strong className="text-slate-800">Rp 40.000/hari</strong> • Lemburan: <strong className="text-slate-800">Rp 30.000/shift</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-200">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{emp.name}</h4>
                      <span className="text-xs text-indigo-700 font-semibold block">
                        {emp.role === 'OPERATOR_DISPENSER' ? 'Operator Dispenser BBM' : emp.role}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        NIK: {emp.nik || '-'} • HP: {emp.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditEmployee(emp)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                      title="Edit Data Karyawan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {employees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEmployeeToDelete(emp)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Gaji Harian / Shift</span>
                    <span className="font-bold text-slate-800 font-mono">{formatRupiah(emp.dailyRate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Tarif Lembur per Shift</span>
                    <span className="font-bold text-indigo-700 font-mono">{formatRupiah(emp.overtimeRate)}</span>
                  </div>
                </div>

                <div className="mt-3 bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600 font-medium">
                      Rekening {emp.bankName || 'Bank'}: <strong className="font-mono text-slate-900">{emp.bankAccountNumber || '-'}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                    Aktif
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PrintSalarySlipModal
        slip={selectedSlipForPrint}
        onClose={() => setSelectedSlipForPrint(null)}
        profile={profile}
        onRevertPayment={handleRevertPayment}
        onOpenPaySalaryModal={handleOpenPaySalaryModal}
      />

      <AttendanceFormModal
        isOpen={isAttendanceModalOpen}
        editingAttendance={editingAttendance}
        employees={employees}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSave={(record) => {
          onSaveAttendance(record);
          setIsAttendanceModalOpen(false);
        }}
      />

      <EmployeeFormModal
        isOpen={isEmployeeModalOpen}
        editingEmployee={editingEmployee}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={(emp) => {
          onSaveEmployee(emp);
          setIsEmployeeModalOpen(false);
        }}
      />

      <BatchPaySalaryModal
        isOpen={isBatchPayModalOpen}
        monthPayrolls={monthPayrolls}
        selectedMonth={selectedMonth}
        onClose={() => setIsBatchPayModalOpen(false)}
        onConfirm={(unpaidDrafts, source, endOfMonth, time) => {
          unpaidDrafts.forEach((p) => {
            onPaySalary(
              p,
              source,
              endOfMonth,
              `Pembayaran serentak gaji akhir bulan ${formatMonthYear(selectedMonth)} (Cut-off maks. ${time} WIB)`,
              time
            );
          });
          setToastMessage({
            text: `Berhasil membayarkan seluruh gaji (${unpaidDrafts.length} karyawan) pada akhir bulan (${formatDateIndo(endOfMonth)} pukul ${time} WIB) via ${source === 'KAS_HARIAN' ? 'Kas Harian' : 'Transfer Bank'}!`,
            type: 'success',
          });
          setIsBatchPayModalOpen(false);
        }}
      />

      <PaySalaryModal
        payroll={payingPayrollModal}
        employees={employees}
        onClose={() => setPayingPayrollModal(null)}
        onEditNominal={handleOpenEditPayroll}
        onConfirm={(payroll, source, date, notes, time) => {
          onPaySalary(payroll, source, date, notes, time);

          if (selectedSlipForPrint && selectedSlipForPrint.id === payroll.id) {
            setSelectedSlipForPrint({
              ...selectedSlipForPrint,
              paymentStatus: 'DIBAYAR',
              paymentDate: date,
              paymentSource: source,
            });
          }

          setToastMessage({
            text: `Gaji untuk ${payroll.employeeName} (${formatRupiah(payroll.netSalary)}) berhasil dibayarkan pada akhir bulan (${formatDateIndo(date)} pukul ${time} WIB) via ${source === 'KAS_HARIAN' ? 'Kas Harian Tunai' : 'Transfer Bank'}!`,
            type: 'success',
          });

          setPayingPayrollModal(null);
        }}
      />

      {/* ===================== MODAL: EDIT NOMINAL GAJI ===================== */}
      {(() => {
        if (!editingPayroll) return null;

        const calculatedGross = editBasicSalary + editOvertimePay + editBonusAllowance;
        const calculatedDeductions = editKasbonDeduction + editPenaltyDeduction + editOtherDeductions;
        const calculatedNet = Math.max(0, calculatedGross - calculatedDeductions);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div
              ref={editingPayrollA11y.containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={editingPayrollA11y.titleId}
              tabIndex={-1}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-amber-50/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id={editingPayrollA11y.titleId} className="font-bold text-slate-800 text-base">
                      Edit Rincian & Nominal Gaji
                    </h3>
                    <p className="text-xs text-slate-600">
                      {editingPayroll.employeeName} • <span className="font-mono font-semibold text-amber-800">{editingPayroll.payrollNumber}</span> ({formatMonthYear(editingPayroll.month)})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPayroll(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-600 hover:bg-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEditPayrollSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                {editingPayroll.paymentStatus === 'DIBAYAR' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-amber-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Perhatian: Slip Gaji Ini Sudah Berstatus Lunas</strong>
                      <span>Perubahan nominal di sini akan langsung memperbarui nilai rekap slip gaji dan laporan.</span>
                    </div>
                  </div>
                )}

                {/* Kehadiran & Rekap Dasar */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rekap Kehadiran Bulan Ini</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-bold text-slate-800 font-mono text-xs">
                        {editTotalHadir} Hari Kerja
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="font-bold text-indigo-700 font-mono text-xs">
                        {editTotalLemburShifts} Shift Lembur
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToFormula}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    title="Hitung ulang otomatis berdasarkan tarif harian dan tarif lembur master"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Reset Hitungan Tarif</span>
                  </button>
                </div>

                {/* Komponen Penghasilan */}
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                    1. Komponen Pendapatan:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Gaji Pokok Kehadiran (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">Rp</span>
                        <input
                          type="number"
                          required
                          min={0}
                          step={1000}
                          value={editBasicSalary}
                          onChange={(e) => setEditBasicSalary(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Tarif: {editTotalHadir} hari × {formatRupiah(editDailyRate)}
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Upah Lembur (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">Rp</span>
                        <input
                          type="number"
                          required
                          min={0}
                          step={1000}
                          value={editOvertimePay}
                          onChange={(e) => setEditOvertimePay(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Tarif: {editTotalLemburShifts} shift × {formatRupiah(editOvertimeRate)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bonus / Insentif / Tunjangan Tambahan (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={editBonusAllowance}
                        onChange={(e) => setEditBonusAllowance(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Tambahan nominal di luar gaji pokok & lembur (misal: reward omset, insentif kehadiran)
                    </span>
                  </div>
                </div>

                {/* Komponen Potongan */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <span className="font-bold text-rose-800 uppercase tracking-wider text-[10px] block">
                    2. Komponen Potongan:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Potongan Kasbon (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">Rp</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={editKasbonDeduction}
                          onChange={(e) => setEditKasbonDeduction(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-700 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Denda / Terlambat (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">Rp</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={editPenaltyDeduction}
                          onChange={(e) => setEditPenaltyDeduction(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-700 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Potongan Lain (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">Rp</span>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={editOtherDeductions}
                          onChange={(e) => setEditOtherDeductions(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-rose-700 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ringkasan Kalkulasi Live */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 pb-1.5 border-b border-slate-700/60">
                    <span>Total Pendapatan Kotor (Gross):</span>
                    <span className="font-mono font-bold text-white">{formatRupiah(calculatedGross)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-rose-300 pb-1.5 border-b border-slate-700/60">
                    <span>Total Potongan:</span>
                    <span className="font-mono font-bold">-{formatRupiah(calculatedDeductions)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Gaji Bersih Diterima (THP):</span>
                      <span className="text-[10px] text-slate-500">Nominal yang akan dibayarkan ke karyawan</span>
                    </div>
                    <span className="text-xl font-black font-mono text-emerald-400">
                      {formatRupiah(calculatedNet)}
                    </span>
                  </div>
                </div>

                {/* Catatan Slip */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catatan / Keterangan Penyesuaian:
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Contoh: Penyesuaian shift lembur tanggal 15 & bonus operasional"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayroll(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan Nominal</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      <PayrollEligibilityWarningModal
        eligibility={eligibilityWarningModal}
        onClose={() => setEligibilityWarningModal(null)}
        selectedMonth={selectedMonth}
      />

      {/* ===================== IN-APP TOAST NOTIFICATION ===================== */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            {toastMessage.type === 'info' && (
              <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
            )}
            {toastMessage.type === 'error' && (
              <X className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <p className="text-xs font-medium text-slate-100 leading-snug">{toastMessage.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={attendanceToDelete !== null}
        title="Hapus Catatan Absensi"
        message={
          attendanceToDelete
            ? `Apakah Anda yakin ingin menghapus catatan absensi ${attendanceToDelete.employeeName} tanggal ${formatShortDate(attendanceToDelete.date)}?`
            : ''
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (attendanceToDelete) {
            onDeleteAttendance(attendanceToDelete.id);
            setAttendanceToDelete(null);
          }
        }}
        onClose={() => setAttendanceToDelete(null)}
      />

      <ConfirmModal
        isOpen={employeeToDelete !== null}
        title="Hapus Data Karyawan"
        message={
          employeeToDelete
            ? `Apakah Anda yakin ingin menghapus data karyawan ${employeeToDelete.name} (${employeeToDelete.role})? Data karyawan yang dihapus tidak dapat dipulihkan.`
            : ''
        }
        confirmLabel="Hapus Karyawan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (employeeToDelete) {
            onDeleteEmployee(employeeToDelete.id);
            setEmployeeToDelete(null);
          }
        }}
        onClose={() => setEmployeeToDelete(null)}
      />
    </div>
  );
};
