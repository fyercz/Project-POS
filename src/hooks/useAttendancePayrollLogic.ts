import type { Dispatch, SetStateAction } from 'react';
import { Employee, AttendanceRecord, PayrollRecord, ExpenseRecord } from '../types';
import { recalculateMonthlyPayrolls } from '../utils/attendanceSync';

/**
 * Diekstrak dari App.tsx (2.680 baris, 38 handler, 40 state) sebagai langkah pertama yang
 * HATI-HATI menuju rekomendasi #7 di docs/REKOMENDASI_ARSITEKTUR.md untuk file itu. Berbeda
 * dari 6 modal yang sudah diekstrak dari AttendancePayrollView.tsx (yang murni soal UI),
 * ekstraksi INI memindahkan LOGIKA BISNIS (handler), bukan JSX - App.tsx sendiri tidak punya
 * modal inline yang bisa dipindah dengan pola yang sama.
 *
 * KENAPA DOMAIN INI DIPILIH LEBIH DULU: UI untuk Karyawan/Absensi/Gaji sudah sepenuhnya
 * terpisah ke AttendancePayrollView.tsx + 6 modal turunannya - domain yang paling "siap"
 * untuk logikanya ikut dipisah juga. TETAP ADA keterkaitan lintas-domain yang nyata (bukan
 * sepenuhnya terisolasi): handlePaySalary/handleUnpaySalary menulis ke `expenses` (domain
 * Beban Operasional) saat gaji dibayar/dibatalkan - karena itu, hook ini menerima
 * `setExpenses` sebagai parameter, bukan memilikinya sendiri. State employees/attendance/
 * payrolls TETAP didefinisikan di App.tsx (dipakai banyak bagian lain di sana), hook ini
 * hanya menerima dan mengembalikan HANDLER yang beroperasi atasnya.
 */

export interface UseAttendancePayrollLogicParams {
  employees: Employee[];
  setEmployees: Dispatch<SetStateAction<Employee[]>>;
  attendance: AttendanceRecord[];
  setAttendance: Dispatch<SetStateAction<AttendanceRecord[]>>;
  payrolls: PayrollRecord[];
  setPayrolls: Dispatch<SetStateAction<PayrollRecord[]>>;
  expenses: ExpenseRecord[];
  setExpenses: Dispatch<SetStateAction<ExpenseRecord[]>>;
}

export function useAttendancePayrollLogic({
  employees,
  setEmployees,
  attendance,
  setAttendance,
  payrolls,
  setPayrolls,
  expenses,
  setExpenses,
}: UseAttendancePayrollLogicParams) {
  const handleSaveEmployee = (emp: Employee) => {
    setEmployees((prev) => (prev.some((e) => e.id === emp.id) ? prev.map((e) => (e.id === emp.id ? emp : e)) : [...prev, emp]));
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
  };

  const handleSaveAttendance = (record: AttendanceRecord) => {
    const exists = attendance.some((a) => a.id === record.id);
    const updatedAttendanceList = exists
      ? attendance.map((a) => (a.id === record.id ? record : a))
      : [record, ...attendance];
    setAttendance(updatedAttendanceList);

    const targetMonth = record.date.substring(0, 7);
    const updatedPayrolls = recalculateMonthlyPayrolls(updatedAttendanceList, employees, payrolls, targetMonth);
    setPayrolls(updatedPayrolls);
  };

  const handleDeleteAttendance = (recordId: string) => {
    const targetRec = attendance.find((a) => a.id === recordId);
    const updatedAttendanceList = attendance.filter((a) => a.id !== recordId);
    setAttendance(updatedAttendanceList);

    if (targetRec) {
      const targetMonth = targetRec.date.substring(0, 7);
      const updatedPayrolls = recalculateMonthlyPayrolls(updatedAttendanceList, employees, payrolls, targetMonth);
      setPayrolls(updatedPayrolls);
    }
  };

  const handleSavePayroll = (payroll: PayrollRecord) => {
    // Pembaruan fungsional: aman dipanggil berkali-kali dalam satu loop (sebelumnya hanya slip terakhir yang tersimpan)
    setPayrolls((prev) => (prev.some((p) => p.id === payroll.id) ? prev.map((p) => (p.id === payroll.id ? payroll : p)) : [payroll, ...prev]));
  };

  const handleDeletePayroll = (payrollId: string) => {
    setPayrolls((prev) => prev.filter((p) => p.id !== payrollId));
  };

  const handlePaySalary = (
    payroll: PayrollRecord,
    paymentSource: 'KAS_HARIAN' | 'REKENING_BANK',
    paymentDate?: string,
    notes?: string,
    paymentTime?: string
  ) => {
    // 1. Tentukan tanggal akhir bulan periode penggajian
    const [yearStr, monthStr] = payroll.month.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const endOfMonthDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Sesuai SOP Pertashop: Pengeluaran gaji pasti dilakukan pada akhir bulan, maksimal jam 20:00 WIB
    const finalDate = endOfMonthDate;
    let finalTime = paymentTime || '20:00';
    if (finalTime > '20:00') {
      finalTime = '20:00'; // Maksimal jam 20:00 WIB
    }

    const updatedPayroll: PayrollRecord = {
      ...payroll,
      paymentStatus: 'DIBAYAR',
      paymentDate: finalDate,
      paymentSource,
      notes: notes || payroll.notes,
    };
    handleSavePayroll(updatedPayroll);

    // 2. Automatically create an expense transaction in Expense Tracker (if not already existing)
    const existingSalaryExpense = expenses.find((e) => e.id.includes(`exp-salary-${payroll.id}`));
    if (!existingSalaryExpense) {
      const newExpense: ExpenseRecord = {
        id: `exp-salary-${payroll.id}-${Date.now()}`,
        date: finalDate,
        time: finalTime,
        category: 'GAJI_OPERATOR',
        title: `Pembayaran Gaji Akhir Bulan: ${payroll.employeeName} (${payroll.payrollNumber})`,
        amount: payroll.netSalary,
        quantity: payroll.totalHadir,
        unitRate: payroll.dailyRate,
        personOrVendor: payroll.employeeName,
        paymentSource,
        notes: `Pengeluaran gaji akhir bulan periode ${payroll.month} (Cut-off maks. pukul 20:00 WIB). Hadir: ${payroll.totalHadir} hari, Lembur: ${payroll.totalLemburShifts} shift. Bersih: Rp ${payroll.netSalary.toLocaleString('id-ID')}`,
        createdAt: `${finalDate} ${finalTime}`,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
  };

  const handleUnpaySalary = (payrollId: string) => {
    const target = payrolls.find((p) => p.id === payrollId);
    if (!target) return;
    const updated: PayrollRecord = {
      ...target,
      paymentStatus: 'DRAFT',
      paymentDate: undefined,
    };
    handleSavePayroll(updated);

    // Remove corresponding salary expense from expenses list
    setExpenses((prev) => prev.filter((e) => !e.id.includes(`exp-salary-${payrollId}`)));
  };

  return {
    handleSaveEmployee,
    handleDeleteEmployee,
    handleSaveAttendance,
    handleDeleteAttendance,
    handleSavePayroll,
    handleDeletePayroll,
    handlePaySalary,
    handleUnpaySalary,
  };
}
