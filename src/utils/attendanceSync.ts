import { AttendanceRecord, Employee, PayrollRecord, SaleRecord } from '../types';

/**
 * Synchronize sales shift entries into employee attendance records.
 * Keeps manual edits intact while ensuring every recorded sale shift has a corresponding
 * presence / overtime attendance entry for the assigned operator.
 */
export function syncSalesToAttendance(
  sales: SaleRecord[],
  currentAttendance: AttendanceRecord[],
  employees: Employee[],
  targetMonth?: string
): { updatedAttendance: AttendanceRecord[]; addedCount: number; updatedCount: number } {
  let addedCount = 0;
  let updatedCount = 0;

  // Filter by target month if specified, otherwise sync all sales
  const relevantSales = targetMonth
    ? sales.filter((s) => s.transactionDate.startsWith(targetMonth))
    : sales;

  // Sort chronologically ascending so day progression and overtime accumulation works properly
  const sortedSales = [...relevantSales].sort((a, b) =>
    a.transactionDate.localeCompare(b.transactionDate) || (a.time || '').localeCompare(b.time || '')
  );

  const attendanceMap = new Map<string, AttendanceRecord>();

  // Populate map with existing attendance records
  currentAttendance.forEach((att) => {
    const key = `${att.employeeId}_${att.date}`;
    attendanceMap.set(key, { ...att });
  });

  // Process sales
  sortedSales.forEach((sale) => {
    const opName = sale.operatorName.trim();
    if (!opName) return;

    // Match employee
    const matchedEmp = employees.find(
      (e) =>
        e.name.toLowerCase() === opName.toLowerCase() ||
        opName.toLowerCase().includes(e.name.toLowerCase()) ||
        e.name.toLowerCase().includes(opName.toLowerCase())
    );

    if (!matchedEmp) return;

    const key = `${matchedEmp.id}_${sale.transactionDate}`;
    const existing = attendanceMap.get(key);

    const shiftLower = sale.shift.toLowerCase();
    const notesLower = (sale.notes || '').toLowerCase();
    const opLower = opName.toLowerCase();

    const isExplicitLembur =
      shiftLower.includes('lembur') ||
      opLower.includes('lembur') ||
      notesLower.includes('lembur');

    let defaultCheckIn = '05:30';
    let defaultCheckOut = '13:30';

    if (shiftLower.includes('shift 2') || shiftLower.includes('13.30')) {
      defaultCheckIn = '13:30';
      defaultCheckOut = '19:30';
    } else if (isExplicitLembur || shiftLower.includes('full')) {
      defaultCheckIn = '05:30';
      defaultCheckOut = '19:30';
    }

    if (existing) {
      // Check if this is a secondary distinct shift on the same day (Operator worked Shift 1 and also Shift 2)
      const isDifferentShift =
        (existing.shift.includes('Shift 1') && shiftLower.includes('shift 2')) ||
        (existing.shift.includes('Shift 2') && shiftLower.includes('shift 1')) ||
        isExplicitLembur;

      if (isDifferentShift) {
        existing.status = 'LEMBUR';
        existing.overtimeShifts = Math.max(1, (existing.overtimeShifts || 0) + 1);
        existing.shift = 'Full Shift (05.30 - 19.30)';
        existing.checkInTime = '05:30';
        existing.checkOutTime = '19:30';
        if (!existing.notes?.includes(`${sale.literSold} L`)) {
          existing.notes = `${existing.notes || ''} | Multi-Shift: ${sale.literSold} L (${sale.shift})`.trim();
        }
        updatedCount++;
      } else {
        // Just refresh notes / liter info if needed
        if (!existing.notes?.includes(`${sale.literSold} L`)) {
          existing.notes = `${existing.notes || ''} | Penjualan: ${sale.literSold} L`.trim();
          updatedCount++;
        }
      }
    } else {
      // Create new attendance entry (single shift default is HADIR, 0 lembur)
      const newRec: AttendanceRecord = {
        id: `att-sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: matchedEmp.id,
        employeeName: matchedEmp.name,
        date: sale.transactionDate,
        shift: isExplicitLembur ? 'Full Shift (05.30 - 19.30)' : sale.shift,
        status: isExplicitLembur ? 'LEMBUR' : 'HADIR',
        checkInTime: defaultCheckIn,
        checkOutTime: defaultCheckOut,
        overtimeShifts: isExplicitLembur ? 1 : 0,
        notes: `Sinkron penjualan shift (${sale.literSold} L - ${sale.shift}). ${sale.notes || ''}`.trim(),
        createdAt: `${sale.transactionDate} ${sale.time || defaultCheckIn}`,
      };

      attendanceMap.set(key, newRec);
      addedCount++;
    }
  });

  const updatedAttendance = Array.from(attendanceMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName)
  );

  return { updatedAttendance, addedCount, updatedCount };
}

/**
 * Recalculate monthly payroll slips based on updated attendance records.
 */
export function recalculateMonthlyPayrolls(
  attendance: AttendanceRecord[],
  employees: Employee[],
  currentPayrolls: PayrollRecord[],
  targetMonth: string
): PayrollRecord[] {
  const updatedPayrolls = [...currentPayrolls];
  const year = parseInt(targetMonth.split('-')[0], 10);
  const month = parseInt(targetMonth.split('-')[1], 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  employees.forEach((emp) => {
    const empMonthAtt = attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(targetMonth)
    );

    const totalHadir = empMonthAtt.filter((a) => a.status === 'HADIR' || a.status === 'LEMBUR').length;
    const totalLemburShifts = empMonthAtt.reduce((sum, a) => sum + (a.overtimeShifts || 0), 0);
    const totalIzin = empMonthAtt.filter((a) => a.status === 'IZIN').length;
    const totalSakit = empMonthAtt.filter((a) => a.status === 'SAKIT').length;
    const totalAlpa = empMonthAtt.filter((a) => a.status === 'ALPA').length;

    const basicSalary = totalHadir * emp.dailyRate;
    const overtimePay = totalLemburShifts * emp.overtimeRate;
    const mealAllowance = totalHadir * (emp.mealAllowanceDaily || 0);

    const existingIndex = updatedPayrolls.findIndex(
      (p) => p.month === targetMonth && p.employeeId === emp.id
    );

    const existingSlip = existingIndex >= 0 ? updatedPayrolls[existingIndex] : null;

    const totalDeductions =
      (existingSlip?.kasbonDeduction || 0) +
      (existingSlip?.penaltyDeduction || 0) +
      (existingSlip?.otherDeductions || 0);

    const grossSalary = basicSalary + overtimePay + mealAllowance;
    const netSalary = grossSalary - totalDeductions;

    const payrollItem: PayrollRecord = {
      id: existingSlip ? existingSlip.id : `pay-${targetMonth}-${emp.id}`,
      payrollNumber: existingSlip
        ? existingSlip.payrollNumber
        : `SLIP-${targetMonth.replace('-', '')}-${emp.id.replace(/\D/g, '').padStart(3, '0')}`,
      month: targetMonth,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.role,
      periodStartDate: `${targetMonth}-01`,
      periodEndDate: `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`,
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
      paymentStatus: existingSlip?.paymentStatus || (targetMonth === '2026-08' ? 'DRAFT' : 'DIBAYAR'),
      paymentDate: existingSlip?.paymentDate || (targetMonth === '2026-08' ? undefined : `${targetMonth}-28`),
      paymentSource: existingSlip?.paymentSource || 'REKENING_BANK',
      notes:
        existingSlip?.notes ||
        `Gaji periode ${targetMonth} (${totalHadir} kehadiran, ${totalLemburShifts} shift lembur).`,
      createdAt:
        existingSlip?.createdAt ||
        `${targetMonth}-${String(daysInMonth).padStart(2, '0')} 17:00`,
    };

    if (existingIndex >= 0) {
      updatedPayrolls[existingIndex] = payrollItem;
    } else {
      updatedPayrolls.push(payrollItem);
    }
  });

  return updatedPayrolls.sort(
    (a, b) => b.month.localeCompare(a.month) || a.employeeName.localeCompare(b.employeeName)
  );
}
