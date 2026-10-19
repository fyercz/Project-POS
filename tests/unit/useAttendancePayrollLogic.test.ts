import { describe, it, expect, vi } from 'vitest';
import { useAttendancePayrollLogic } from '../../src/hooks/useAttendancePayrollLogic';
import type { PayrollRecord, ExpenseRecord, Employee } from '../../src/types';

function makePayroll(overrides: Partial<PayrollRecord> = {}): PayrollRecord {
  return {
    id: 'pay1',
    payrollNumber: 'SLIP-001',
    employeeId: 'e1',
    employeeName: 'Daslam',
    employeeRole: 'OPERATOR_DISPENSER',
    month: '2026-10',
    dailyRate: 50000,
    overtimeRate: 30000,
    totalHadir: 20,
    totalLemburShifts: 5,
    basicSalary: 1000000,
    overtimePay: 150000,
    bonusAllowance: 0,
    totalDeductions: 0,
    netSalary: 1150000,
    paymentStatus: 'DRAFT',
    paymentSource: 'KAS_HARIAN',
    ...overrides,
  } as PayrollRecord;
}

function setup(overrides: Partial<Parameters<typeof useAttendancePayrollLogic>[0]> = {}) {
  const setEmployees = vi.fn();
  const setAttendance = vi.fn();
  const setPayrolls = vi.fn();
  const setExpenses = vi.fn();
  const hook = useAttendancePayrollLogic({
    employees: [] as Employee[],
    setEmployees,
    attendance: [],
    setAttendance,
    payrolls: [],
    setPayrolls,
    expenses: [] as ExpenseRecord[],
    setExpenses,
    ...overrides,
  });
  return { hook, setEmployees, setAttendance, setPayrolls, setExpenses };
}

describe('useAttendancePayrollLogic', () => {
  describe('handlePaySalary', () => {
    it('membayar gaji mengubah status jadi DIBAYAR DAN otomatis membuat entri beban GAJI_OPERATOR', () => {
      const payroll = makePayroll();
      const { hook, setPayrolls, setExpenses } = setup({ payrolls: [payroll] });
      hook.handlePaySalary(payroll, 'KAS_HARIAN');

      // handlePaySalary memanggil handleSavePayroll yang memakai functional updater
      const payrollsResult: PayrollRecord[] = setPayrolls.mock.calls[0][0]([payroll]);
      expect(payrollsResult[0].paymentStatus).toBe('DIBAYAR');

      const expensesUpdater = setExpenses.mock.calls[0][0];
      const expenses: ExpenseRecord[] = expensesUpdater([]);
      expect(expenses).toHaveLength(1);
      expect(expenses[0].category).toBe('GAJI_OPERATOR');
      expect(expenses[0].amount).toBe(1150000);
    });

    it('membayar gaji yang SUDAH punya entri beban tidak membuat entri DUPLIKAT', () => {
      const payroll = makePayroll();
      const existingExpense: ExpenseRecord = {
        id: 'exp-salary-pay1-999',
        date: 'x', time: 'x', category: 'GAJI_OPERATOR', title: 'x', amount: 1150000,
        paymentSource: 'KAS_HARIAN', createdAt: 'x',
      };
      const { hook, setExpenses } = setup({ payrolls: [payroll], expenses: [existingExpense] });
      hook.handlePaySalary(payroll, 'KAS_HARIAN');
      // Tidak ada pemanggilan setExpenses sama sekali karena entri sudah ada
      expect(setExpenses).not.toHaveBeenCalled();
    });

    it('jam bayar di atas 20:00 dibatasi otomatis ke 20:00 (SOP Pertashop)', () => {
      const payroll = makePayroll();
      const { hook, setExpenses } = setup({ payrolls: [payroll] });
      hook.handlePaySalary(payroll, 'KAS_HARIAN', undefined, undefined, '23:30');
      const expenses: ExpenseRecord[] = setExpenses.mock.calls[0][0]([]);
      expect(expenses[0].time).toBe('20:00');
    });

    it('tanggal bayar SELALU akhir bulan periode penggajian, bukan tanggal sekarang', () => {
      const payroll = makePayroll({ month: '2026-02' }); // Februari 2026 (bukan kabisat) = 28 hari
      const { hook, setPayrolls } = setup({ payrolls: [payroll] });
      hook.handlePaySalary(payroll, 'KAS_HARIAN');
      const result: PayrollRecord[] = setPayrolls.mock.calls[0][0]([payroll]);
      expect(result[0].paymentDate).toBe('2026-02-28');
    });
  });

  describe('handleUnpaySalary', () => {
    it('membatalkan bayar mengembalikan status DRAFT DAN menghapus entri beban terkait', () => {
      const paidPayroll = makePayroll({ paymentStatus: 'DIBAYAR', paymentDate: '2026-10-31' });
      const relatedExpense: ExpenseRecord = {
        id: 'exp-salary-pay1-123', date: 'x', time: 'x', category: 'GAJI_OPERATOR', title: 'x',
        amount: 1150000, paymentSource: 'KAS_HARIAN', createdAt: 'x',
      };
      const { hook, setPayrolls, setExpenses } = setup({ payrolls: [paidPayroll] });
      hook.handleUnpaySalary('pay1');

      const payrollsResult: PayrollRecord[] = setPayrolls.mock.calls[0][0]([paidPayroll]);
      expect(payrollsResult[0].paymentStatus).toBe('DRAFT');
      expect(payrollsResult[0].paymentDate).toBeUndefined();

      const expensesUpdater = setExpenses.mock.calls[0][0];
      const remaining = expensesUpdater([relatedExpense]);
      expect(remaining).toHaveLength(0);
    });

    it('membatalkan bayar untuk payroll yang tidak ditemukan tidak melakukan apa pun', () => {
      const { hook, setPayrolls, setExpenses } = setup({ payrolls: [] });
      hook.handleUnpaySalary('tidak-ada');
      expect(setPayrolls).not.toHaveBeenCalled();
      expect(setExpenses).not.toHaveBeenCalled();
    });
  });

  describe('handleSavePayroll - idempotensi', () => {
    it('dipanggil berkali-kali dengan id yang sama memperbarui, bukan menduplikasi', () => {
      const { hook, setPayrolls } = setup({ payrolls: [] });
      const p1 = makePayroll({ id: 'pay1', netSalary: 1000000 });
      hook.handleSavePayroll(p1);
      // handleSavePayroll memakai functional updater setPayrolls((prev) => ...) - invoke
      // updater-nya dengan state SEBELUMNYA untuk mensimulasikan siklus render React.
      const afterFirstSave: PayrollRecord[] = setPayrolls.mock.calls[0][0]([]);
      expect(afterFirstSave).toHaveLength(1);

      const p1Updated = makePayroll({ id: 'pay1', netSalary: 2000000 });
      hook.handleSavePayroll(p1Updated);
      const afterSecondSave: PayrollRecord[] = setPayrolls.mock.calls[1][0](afterFirstSave);
      expect(afterSecondSave).toHaveLength(1); // bukan 2 - diperbarui, bukan ditambah
      expect(afterSecondSave[0].netSalary).toBe(2000000);
    });
  });
});
