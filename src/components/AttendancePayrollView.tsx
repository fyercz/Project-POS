import React, { useState } from 'react';
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
  Receipt,
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
} from '../utils/formatters';
import { syncSalesToAttendance, recalculateMonthlyPayrolls } from '../utils/attendanceSync';
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
    notes?: string
  ) => void;
  onUnpaySalary?: (payrollId: string) => void;
  onBatchSyncAttendance?: (records: AttendanceRecord[]) => void;
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
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  
  // Modal states
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState<boolean>(false);
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<PayrollRecord | null>(null);

  // Salary Payment Modal State
  const [payingPayrollModal, setPayingPayrollModal] = useState<PayrollRecord | null>(null);
  const [paySource, setPaySource] = useState<'REKENING_BANK' | 'KAS_HARIAN'>('REKENING_BANK');
  const [payDate, setPayDate] = useState<string>(getTodayDateString());
  const [payNotes, setPayNotes] = useState<string>('');

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
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);

  // Form states for attendance
  const [attEmployeeId, setAttEmployeeId] = useState<string>(employees[0]?.id || '');
  const [attDate, setAttDate] = useState<string>(getTodayDateString());
  const [attShift, setAttShift] = useState<string>('Shift 1 (05.30 - 13.30)');
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('HADIR');
  const [attCheckIn, setAttCheckIn] = useState<string>('05:30');
  const [attCheckOut, setAttCheckOut] = useState<string>('13:30');
  const [attOvertimeShifts, setAttOvertimeShifts] = useState<number>(0);
  const [attNotes, setAttNotes] = useState<string>('');

  // Form states for employee
  const [empName, setEmpName] = useState<string>('');
  const [empNik, setEmpNik] = useState<string>('');
  const [empRole, setEmpRole] = useState<Employee['role']>('OPERATOR_DISPENSER');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empBankName, setEmpBankName] = useState<string>('BRI');
  const [empBankAcc, setEmpBankAcc] = useState<string>('');
  const [empDailyRate, setEmpDailyRate] = useState<number>(40000);
  const [empOvertimeRate, setEmpOvertimeRate] = useState<number>(30000);
  const [empMealAllowance, setEmpMealAllowance] = useState<number>(10000);
  const [empJoinDate, setEmpJoinDate] = useState<string>(getTodayDateString());
  const [empNotes, setEmpNotes] = useState<string>('');

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

  // Handlers for Salary Payment
  const handleOpenPaySalaryModal = (payroll: PayrollRecord) => {
    setPayingPayrollModal(payroll);
    setPaySource(payroll.paymentSource || 'REKENING_BANK');
    setPayDate(getTodayDateString());
    setPayNotes(payroll.notes || '');
  };

  const handleConfirmPaySalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayrollModal) return;

    onPaySalary(payingPayrollModal, paySource, payDate, payNotes);

    // If slip preview modal is currently open for this slip, update its status live
    if (selectedSlipForPrint && selectedSlipForPrint.id === payingPayrollModal.id) {
      setSelectedSlipForPrint({
        ...selectedSlipForPrint,
        paymentStatus: 'DIBAYAR',
        paymentDate: payDate,
        paymentSource: paySource,
      });
    }

    setToastMessage({
      text: `Gaji untuk ${payingPayrollModal.employeeName} (${formatRupiah(payingPayrollModal.netSalary)}) berhasil dibayarkan via ${paySource === 'KAS_HARIAN' ? 'Kas Harian Tunai' : 'Transfer Bank'}!`,
      type: 'success',
    });

    setPayingPayrollModal(null);
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
    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const newPayrolls: PayrollRecord[] = [];

    employees.filter((e) => e.isActive).forEach((emp, index) => {
      const empAtt = monthAttendance.filter((a) => a.employeeId === emp.id);
      const totalHadir = empAtt.filter((a) => a.status === 'HADIR' || a.status === 'LEMBUR').length;
      const totalLemburShifts = empAtt.reduce((sum, a) => sum + (a.overtimeShifts || 0), 0);
      const totalIzin = empAtt.filter((a) => a.status === 'IZIN').length;
      const totalSakit = empAtt.filter((a) => a.status === 'SAKIT').length;
      const totalAlpa = empAtt.filter((a) => a.status === 'ALPA').length;

      const basicSalary = totalHadir * emp.dailyRate;
      const overtimePay = totalLemburShifts * emp.overtimeRate;
      const mealAllowance = totalHadir * (emp.mealAllowanceDaily || 0);

      const grossSalary = basicSalary + overtimePay + mealAllowance;
      const existingSlip = payrolls.find((p) => p.month === selectedMonth && p.employeeId === emp.id);

      const totalDeductions =
        (existingSlip?.kasbonDeduction || 0) +
        (existingSlip?.penaltyDeduction || 0) +
        (existingSlip?.otherDeductions || 0);

      const netSalary = grossSalary - totalDeductions;

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
      text: `Berhasil mengkalkulasi ulang slip gaji untuk ${newPayrolls.length} karyawan pada bulan ${formatMonthYear(selectedMonth)}!`,
      type: 'success',
    });
  };

  // Open Attendance modal
  const handleOpenAddAttendance = () => {
    setEditingAttendance(null);
    setAttEmployeeId(employees[0]?.id || '');
    setAttDate(getTodayDateString());
    setAttShift('Shift 1 (05.30 - 13.30)');
    setAttStatus('HADIR');
    setAttCheckIn('05:30');
    setAttCheckOut('13:30');
    setAttOvertimeShifts(0);
    setAttNotes('');
    setIsAttendanceModalOpen(true);
  };

  const handleEditAttendance = (record: AttendanceRecord) => {
    setEditingAttendance(record);
    setAttEmployeeId(record.employeeId);
    setAttDate(record.date);
    setAttShift(record.shift);
    setAttStatus(record.status);
    setAttCheckIn(record.checkInTime || '05:30');
    setAttCheckOut(record.checkOutTime || '13:30');
    setAttOvertimeShifts(record.overtimeShifts || 0);
    setAttNotes(record.notes || '');
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === attEmployeeId);
    if (!emp) return;

    // Strict rule: Overtime shifts count only when status is LEMBUR. When status is HADIR/IZIN/SAKIT/ALPA, overtime is 0.
    const finalOvertime = attStatus === 'LEMBUR' ? (attOvertimeShifts > 0 ? attOvertimeShifts : 1) : 0;

    const record: AttendanceRecord = {
      id: editingAttendance ? editingAttendance.id : `att-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: attDate,
      shift: attShift,
      status: attStatus,
      checkInTime: attCheckIn,
      checkOutTime: attCheckOut,
      overtimeShifts: finalOvertime,
      notes: attNotes.trim(),
      createdAt: editingAttendance ? editingAttendance.createdAt : `${attDate} ${attCheckIn}`,
    };

    onSaveAttendance(record);
    setIsAttendanceModalOpen(false);
  };

  // Open Employee Modal
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpNik('');
    setEmpRole('OPERATOR_DISPENSER');
    setEmpPhone('0812-');
    setEmpBankName('BRI');
    setEmpBankAcc('');
    setEmpDailyRate(40000);
    setEmpOvertimeRate(30000);
    setEmpMealAllowance(10000);
    setEmpJoinDate(getTodayDateString());
    setEmpNotes('');
    setIsEmployeeModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpNik(emp.nik || '');
    setEmpRole(emp.role);
    setEmpPhone(emp.phone);
    setEmpBankName(emp.bankName || 'BRI');
    setEmpBankAcc(emp.bankAccountNumber || '');
    setEmpDailyRate(emp.dailyRate);
    setEmpOvertimeRate(emp.overtimeRate);
    setEmpMealAllowance(emp.mealAllowanceDaily || 0);
    setEmpJoinDate(emp.joinDate);
    setEmpNotes(emp.notes || '');
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployeeSubmit = (e: React.FormEvent) => {
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
      mealAllowanceDaily: empMealAllowance,
      isActive: true,
      joinDate: empJoinDate,
      notes: empNotes.trim(),
    };

    onSaveEmployee(emp);
    setIsEmployeeModalOpen(false);
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
      onBatchSyncAttendance(updatedAttendance);
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
      'Uang Makan/Kehadiran (Rp)': p.mealAllowance,
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
              <span className="text-xs text-slate-400">• Pertashop Krajan</span>
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
              className="bg-transparent text-white text-xs font-bold font-mono focus:outline-none pr-2 cursor-pointer"
            >
              <option value="2026-08" className="bg-slate-900 text-white">Agustus 2026</option>
              <option value="2026-07" className="bg-slate-900 text-white">Juli 2026</option>
              <option value="2026-06" className="bg-slate-900 text-white">Juni 2026</option>
              <option value="2026-05" className="bg-slate-900 text-white">Mei 2026</option>
              <option value="2026-04" className="bg-slate-900 text-white">April 2026</option>
              <option value="2026-03" className="bg-slate-900 text-white">Maret 2026</option>
              <option value="2026-02" className="bg-slate-900 text-white">Februari 2026</option>
              <option value="2026-01" className="bg-slate-900 text-white">Januari 2026</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleAutoGeneratePayroll}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
            title="Hitung ulang gaji bulan terpilih berdasarkan data absensi"
          >
            <Sparkles className="w-4 h-4" />
            <span>Hitung Gaji Otomatis</span>
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
          <p className="text-[11px] text-slate-400 mt-1">Operator shift 1 & 2 dispenser</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Kehadiran Bulan Ini</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {totalHadirAll} <span className="text-xs font-normal text-slate-500">Hari Kerja</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Termasuk {totalLemburShiftsAll} shift lembur</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Beban Gaji ({formatMonthYear(selectedMonth)})</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900 font-mono">
            {formatRupiah(totalSalaryPayout)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Akumulasi gaji pokok + lemburan</p>
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
          <p className="text-[11px] text-slate-400 mt-1">
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
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-200"
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Bulan: {formatMonthYear(selectedMonth)}
              </span>
              <h3 className="text-base font-bold text-slate-800">
                Daftar Penggajian & Slip Gaji Bulanan
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              *Gaji dihitung otomatis: <span className="font-semibold text-slate-700">(Hadir × Rp 40.000) + (Lembur × Rp 30.000) + Uang Makan</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Slip & Karyawan</th>
                  <th className="py-3 px-3 text-center">Kehadiran (Hari)</th>
                  <th className="py-3 px-3 text-center">Lemburan</th>
                  <th className="py-3 px-3 text-right">Gaji Pokok</th>
                  <th className="py-3 px-3 text-right">Uang Lembur</th>
                  <th className="py-3 px-3 text-right">Uang Makan</th>
                  <th className="py-3 px-3 text-right">Potongan</th>
                  <th className="py-3 px-4 text-right">Gaji Bersih (THP)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi & Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <DollarSign className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada rekap gaji untuk bulan {formatMonthYear(selectedMonth)}.</p>
                      <button
                        type="button"
                        onClick={handleAutoGeneratePayroll}
                        className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
                      >
                        Kalkulasi Slip Gaji Bulan Ini Sekarang
                      </button>
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
                          <span className="text-[10px] text-slate-400">
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
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          <div>{formatRupiah(p.basicSalary)}</div>
                          <span className="text-[10px] text-slate-400">@{formatRupiah(p.dailyRate)}</span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-indigo-700 whitespace-nowrap">
                          {formatRupiah(p.overtimePay)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          +{formatRupiah(p.mealAllowance || 0)}
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
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                title="Bayar Gaji Karyawan Ini"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Bayar Gaji</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRevertPayment(p)}
                                className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-[10px] font-medium"
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Buku Absensi & Shift Kerja
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  Catatan Presensi Operator ({formatMonthYear(selectedMonth)})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Total: <strong className="text-slate-800">{monthAttendance.length}</strong> log kehadiran tercatat
                </span>
              </div>
            </div>

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
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada absensi tercatat pada bulan {formatMonthYear(selectedMonth)}.</p>
                    </td>
                  </tr>
                ) : (
                  monthAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="font-semibold">{formatDateIndo(rec.date)}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{rec.date}</span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {rec.employeeName}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {rec.shift}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                        {rec.checkInTime || '-'} s/d {rec.checkOutTime || '-'}
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
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {rec.notes || '-'}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
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
                            onClick={() => {
                              if (window.confirm('Hapus catatan absensi ini?')) {
                                onDeleteAttendance(rec.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Absensi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
                      <span className="text-[11px] text-slate-400 font-mono">
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
                        onClick={() => {
                          if (window.confirm(`Hapus data karyawan ${emp.name}?`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Gaji Harian / Shift</span>
                    <span className="font-bold text-slate-800 font-mono">{formatRupiah(emp.dailyRate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Tarif Lembur</span>
                    <span className="font-bold text-indigo-700 font-mono">{formatRupiah(emp.overtimeRate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Uang Makan / Hr</span>
                    <span className="font-bold text-emerald-700 font-mono">{formatRupiah(emp.mealAllowanceDaily || 0)}</span>
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

      {/* ===================== MODAL CETAK SLIP GAJI ===================== */}
      {selectedSlipForPrint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Slip Gaji Karyawan Pertashop</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlipForPrint(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
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
                  SLIP GAJI BULAN: {formatMonthYear(selectedSlipForPrint.month).toUpperCase()}
                </div>
              </div>

              {/* Employee Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Nama Karyawan:</span>
                  <strong className="text-slate-800 text-xs">{selectedSlipForPrint.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">No. Slip Gaji:</span>
                  <strong className="font-mono text-slate-800">{selectedSlipForPrint.payrollNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Jabatan:</span>
                  <span className="text-slate-700">{selectedSlipForPrint.employeeRole}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Kehadiran:</span>
                  <strong className="text-emerald-800">{selectedSlipForPrint.totalHadir} Hari ({selectedSlipForPrint.totalLemburShifts} Lembur)</strong>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="space-y-2 border-b border-slate-200 pb-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Rincian Penghasilan:
                </span>
                <div className="flex justify-between text-slate-700">
                  <span>Gaji Pokok ({selectedSlipForPrint.totalHadir} Hari × {formatRupiah(selectedSlipForPrint.dailyRate)}):</span>
                  <span className="font-mono font-semibold">{formatRupiah(selectedSlipForPrint.basicSalary)}</span>
                </div>
                {selectedSlipForPrint.overtimePay > 0 && (
                  <div className="flex justify-between text-indigo-700">
                    <span>Upah Lembur ({selectedSlipForPrint.totalLemburShifts} Shift × {formatRupiah(selectedSlipForPrint.overtimeRate)}):</span>
                    <span className="font-mono font-semibold">+{formatRupiah(selectedSlipForPrint.overtimePay)}</span>
                  </div>
                )}
                {selectedSlipForPrint.mealAllowance > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Uang Makan / Kehadiran:</span>
                    <span className="font-mono font-semibold">+{formatRupiah(selectedSlipForPrint.mealAllowance)}</span>
                  </div>
                )}
              </div>

              {/* Deductions */}
              {selectedSlipForPrint.totalDeductions > 0 && (
                <div className="space-y-1.5 border-b border-slate-200 pb-3 text-rose-700">
                  <span className="font-bold uppercase tracking-wider text-[10px] block">
                    Potongan:
                  </span>
                  <div className="flex justify-between">
                    <span>Kasbon / Potongan Lain:</span>
                    <span className="font-mono font-semibold">-{formatRupiah(selectedSlipForPrint.totalDeductions)}</span>
                  </div>
                </div>
              )}

              {/* Payment Status Banner */}
              {selectedSlipForPrint.paymentStatus === 'DIBAYAR' ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 block">STATUS: LUNAS DIBAYARKAN</span>
                      <span className="text-[11px] text-emerald-700">
                        Via {selectedSlipForPrint.paymentSource === 'KAS_HARIAN' ? 'Kas Harian Tunai' : 'Transfer Bank'}
                        {selectedSlipForPrint.paymentDate && ` • ${selectedSlipForPrint.paymentDate}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevertPayment(selectedSlipForPrint)}
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
                    onClick={() => handleOpenPaySalaryModal(selectedSlipForPrint)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Bayar Sekarang</span>
                  </button>
                </div>
              )}

              {/* Total Net Salary */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Diterima (Take Home Pay):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {selectedSlipForPrint.paymentStatus === 'DIBAYAR' ? '✓ Telah Dibayarkan' : 'Menunggu Pencairan'}
                  </span>
                </div>
                <span className="text-xl font-black font-mono text-cyan-300">
                  {formatRupiah(selectedSlipForPrint.netSalary)}
                </span>
              </div>

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-600">
                <div>
                  <p>Penerima,</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline text-slate-800">{selectedSlipForPrint.employeeName}</p>
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
                onClick={() => setSelectedSlipForPrint(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                {selectedSlipForPrint.paymentStatus !== 'DIBAYAR' && (
                  <button
                    type="button"
                    onClick={() => handleOpenPaySalaryModal(selectedSlipForPrint)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
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
      )}

      {/* ===================== MODAL CATAT ABSENSI ===================== */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingAttendance ? 'Edit Catatan Absensi' : 'Form Catat Absensi Harian'}
                  </h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    Catat kehadiran operator dispenser & lemburan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendanceSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
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
                  <label className="block font-bold text-slate-700 mb-1">Pilihan Shift</label>
                  <select
                    value={attShift}
                    onChange={(e) => {
                      const newShift = e.target.value;
                      setAttShift(newShift);
                      if (newShift.includes('Shift 1')) {
                        setAttCheckIn('05:30');
                        setAttCheckOut('13:30');
                      } else if (newShift.includes('Shift 2')) {
                        setAttCheckIn('13:30');
                        setAttCheckOut('19:30');
                      } else if (newShift.includes('Full')) {
                        setAttCheckIn('05:30');
                        setAttCheckOut('19:30');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                  >
                    <option value="Shift 1 (05.30 - 13.30)">Shift 1 (05.30 - 13.30)</option>
                    <option value="Shift 2 (13.30 - 19.30)">Shift 2 (13.30 - 19.30)</option>
                    <option value="Full Shift (05.30 - 19.30)">Full Shift (05.30 - 19.30)</option>
                    <option value="Non-Shift / Off">Non-Shift / Off</option>
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
                  onClick={() => setIsAttendanceModalOpen(false)}
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
      )}

      {/* ===================== MODAL FORM TAMBAH KARYAWAN ===================== */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pengaturan gaji harian, uang lembur, dan rekening transfer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
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
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">Tarif Harian (Rp)</label>
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
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">Lembur/Shift (Rp)</label>
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
                  <div>
                    <label className="block font-medium text-slate-600 mb-1 text-[11px]">Uang Makan/Hari</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={empMealAllowance}
                      onChange={(e) => setEmpMealAllowance(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
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
                  onClick={() => setIsEmployeeModalOpen(false)}
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
      )}

      {/* ===================== MODAL KONFIRMASI PEMBAYARAN GAJI ===================== */}
      {payingPayrollModal && (() => {
        const targetEmp = employees.find((e) => e.id === payingPayrollModal.employeeId);
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/15 rounded-xl">
                    <DollarSign className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Konfirmasi Pembayaran Gaji</h3>
                    <p className="text-[11px] text-emerald-100 font-mono mt-0.5">
                      {payingPayrollModal.payrollNumber} • {formatMonthYear(payingPayrollModal.month)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingPayrollModal(null)}
                  className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleConfirmPaySalary} className="p-5 space-y-4 text-xs font-sans">
                {/* Employee Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Penerima Gaji:</span>
                      <strong className="text-slate-900 text-sm">{payingPayrollModal.employeeName}</strong>
                      <span className="text-[11px] text-slate-500 block">
                        {payingPayrollModal.employeeRole === 'OPERATOR_DISPENSER' ? 'Operator Dispenser' : payingPayrollModal.employeeRole}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Rekap Kehadiran:</span>
                      <span className="font-bold text-emerald-800 text-xs">
                        {payingPayrollModal.totalHadir} Hari
                      </span>
                      {payingPayrollModal.totalLemburShifts > 0 && (
                        <span className="text-indigo-700 text-[11px] block">
                          +{payingPayrollModal.totalLemburShifts} Shift Lembur
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Gaji Bersih / Take Home Pay:</span>
                    <span className="text-base font-black font-mono text-emerald-700">
                      {formatRupiah(payingPayrollModal.netSalary)}
                    </span>
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

                {/* Payment Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Pembayaran:
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
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

                {/* Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[11px] text-blue-800">
                  💡 Status slip gaji akan langsung diubah menjadi <strong>LUNAS</strong> dan tercatat otomatis pada pembukuan Beban Operasional (OpEx).
                </div>

                {/* Buttons */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingPayrollModal(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Konfirmasi Bayar {formatRupiah(payingPayrollModal.netSalary)}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
