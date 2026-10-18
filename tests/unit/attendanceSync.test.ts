import { describe, it, expect } from 'vitest';
import {
  findEmployeeByOperatorName,
  syncSalesToAttendance,
  isPayrollLocked,
  recalculateMonthlyPayrolls,
} from '../../src/utils/attendanceSync';
import type { Employee, SaleRecord, AttendanceRecord, PayrollRecord } from '../../src/types';

// --- Fixture helpers -------------------------------------------------------

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'e1',
    name: 'Daslam',
    role: 'Operator',
    isActive: true,
    dailyRate: 50000,
    overtimeRate: 30000,
    ...overrides,
  } as Employee;
}

function makeAttendance(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: 'a1',
    employeeId: 'e1',
    employeeName: 'Daslam',
    date: '2026-10-01',
    shift: 'Shift 1 (05.30 - 13.30)',
    status: 'HADIR',
    overtimeShifts: 0,
    createdAt: 'x',
    ...overrides,
  };
}

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 's1',
    transactionDate: '2026-10-01',
    time: '19:30',
    shift: 'Full Day',
    operatorName: 'Daslam',
    productId: 'prod-1',
    productName: 'Pertamax',
    literSold: 500,
    unitPrice: 15850,
    buyPriceSnapshot: 15046,
    totalRevenue: 7925000,
    totalProfit: 402000,
    paymentCash: 7925000,
    paymentQris: 0,
    paymentEdc: 0,
    actualCashInHand: 7925000,
    cashDifference: 0,
    notes: '',
    createdAt: '2026-10-01 19:30',
    ...overrides,
  } as SaleRecord;
}

// --- findEmployeeByOperatorName ---------------------------------------------
// Harus cocok persis atau cocok token-utuh, TIDAK boleh cocok sebagian kata
// (bug lama: "Anggara" tertukar dengan "Angga" karena pakai .includes() mentah).

describe('findEmployeeByOperatorName', () => {
  const employees = [
    makeEmployee({ id: 'e1', name: 'Angga' }),
    makeEmployee({ id: 'e2', name: 'Anggara' }),
    makeEmployee({ id: 'e3', name: 'Daslam' }),
  ];

  it('cocok persis (case-insensitive)', () => {
    expect(findEmployeeByOperatorName('angga', employees)?.id).toBe('e1');
  });

  it('cocok dengan embel-embel seperti "(Lembur)"', () => {
    expect(findEmployeeByOperatorName('Angga (Lembur)', employees)?.id).toBe('e1');
  });

  it('TIDAK tertukar antara nama yang mirip sebagian (Angga vs Anggara)', () => {
    expect(findEmployeeByOperatorName('Anggara', employees)?.id).toBe('e2');
    expect(findEmployeeByOperatorName('Angga', employees)?.id).toBe('e1');
  });

  it('nama tidak lengkap tidak dicocokkan ke siapa pun', () => {
    expect(findEmployeeByOperatorName('Ang', employees)).toBeUndefined();
  });

  it('nama kosong atau tidak dikenal mengembalikan undefined', () => {
    expect(findEmployeeByOperatorName('', employees)).toBeUndefined();
    expect(findEmployeeByOperatorName('Budi', employees)).toBeUndefined();
  });
});

// --- syncSalesToAttendance ---------------------------------------------------
// Bug nyata yang pernah terjadi: setiap kali fungsi ini dipanggil ulang (mis. saat
// ubah harga, impor, atau klik tombol sinkron), overtimeShifts bertambah +1 TERUS
// walau penjualan yang disinkron SAMA PERSIS. Ini test regresi yang memastikan
// bug itu tidak pernah muncul lagi.

describe('syncSalesToAttendance (idempotensi)', () => {
  const employees = [makeEmployee()];

  it('shift Full Day menghasilkan status LEMBUR dengan overtimeShifts = 1', () => {
    const sales = [makeSale({ shift: 'Full Day' })];
    const { updatedAttendance } = syncSalesToAttendance(sales, [], employees);
    expect(updatedAttendance).toHaveLength(1);
    expect(updatedAttendance[0].status).toBe('LEMBUR');
    expect(updatedAttendance[0].overtimeShifts).toBe(1);
  });

  it('memanggil ulang dengan input SAMA tidak menambah overtimeShifts (idempoten)', () => {
    const sales = [makeSale({ shift: 'Full Day' })];
    let attendance: AttendanceRecord[] = [];
    for (let i = 0; i < 5; i++) {
      attendance = syncSalesToAttendance(sales, attendance, employees).updatedAttendance;
    }
    expect(attendance).toHaveLength(1);
    expect(attendance[0].overtimeShifts).toBe(1); // bukan 5!
    expect(attendance[0].status).toBe('LEMBUR');
  });

  it('shift satu kali (bukan Full Day) menghasilkan HADIR dengan overtimeShifts = 0', () => {
    const sales = [makeSale({ shift: 'Shift 1 (05.30 - 13.30)' })];
    const { updatedAttendance } = syncSalesToAttendance(sales, [], employees);
    expect(updatedAttendance[0].status).toBe('HADIR');
    expect(updatedAttendance[0].overtimeShifts).toBe(0);
  });

  it('operator tanpa data karyawan yang cocok tidak membuat record absensi', () => {
    const sales = [makeSale({ operatorName: 'OrangTidakDikenal' })];
    const { updatedAttendance } = syncSalesToAttendance(sales, [], employees);
    expect(updatedAttendance).toHaveLength(0);
  });
});

// --- isPayrollLocked ----------------------------------------------------------

describe('isPayrollLocked', () => {
  it('slip DIBAYAR terkunci', () => {
    expect(isPayrollLocked({ paymentStatus: 'DIBAYAR' } as PayrollRecord)).toBe(true);
  });
  it('slip DRAFT tidak terkunci', () => {
    expect(isPayrollLocked({ paymentStatus: 'DRAFT' } as PayrollRecord)).toBe(false);
  });
  it('null/undefined tidak terkunci', () => {
    expect(isPayrollLocked(null)).toBe(false);
    expect(isPayrollLocked(undefined)).toBe(false);
  });
});

// --- recalculateMonthlyPayrolls (penguncian slip DIBAYAR) --------------------
// Bug nyata: slip yang sudah DIBAYAR sempat bisa dihitung ulang & nominalnya
// berubah diam-diam saat ada absensi baru ditambahkan untuk bulan yang sama.

describe('recalculateMonthlyPayrolls (kunci slip DIBAYAR)', () => {
  it('slip DIBAYAR tidak berubah meski absensi bertambah', () => {
    const employees = [makeEmployee()];
    const attendanceV1: AttendanceRecord[] = [makeAttendance()];
    let payrolls = recalculateMonthlyPayrolls(attendanceV1, employees, [], '2026-10', true);
    const originalNet = payrolls[0].netSalary;

    payrolls = payrolls.map((p) => ({ ...p, paymentStatus: 'DIBAYAR' as const }));

    const attendanceV2 = [...attendanceV1, makeAttendance({ id: 'a2', date: '2026-10-02' })];
    const after = recalculateMonthlyPayrolls(attendanceV2, employees, payrolls, '2026-10', true);

    expect(after[0].netSalary).toBe(originalNet);
    expect(after[0].paymentStatus).toBe('DIBAYAR');
  });
});
