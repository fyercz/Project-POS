import { AttendanceRecord, Employee, PayrollRecord, SaleRecord } from '../types';
import { getShiftHoursInfo, STANDARD_SHIFTS } from './formatters';


/**
 * Cocokkan nama operator ke data karyawan secara aman.
 * 1) Nama persis sama (tanpa beda huruf besar/kecil & spasi ganda).
 * 2) Kata-per-kata: semua kata nama karyawan ada sebagai kata utuh di nama operator
 *    (mis. "Angga (Lembur)" -> "Angga"), TIDAK cocok sebagian kata ("Anggara" != "Angga").
 * Jika hasil langkah 2 lebih dari satu karyawan (ambigu), tidak ada yang dipilih.
 */
export function findEmployeeByOperatorName(operatorName: string, employees: Employee[]): Employee | undefined {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const op = norm(operatorName || '');
  if (!op) return undefined;

  const exact = employees.filter((e) => norm(e.name) === op);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact.find((e) => e.isActive) || exact[0];

  const opWords = new Set(op.split(' '));
  const tokenMatches = employees.filter((e) => {
    const words = norm(e.name).split(' ').filter(Boolean);
    return words.length > 0 && words.every((w) => opWords.has(w));
  });
  return tokenMatches.length === 1 ? tokenMatches[0] : undefined;
}

/**
 * Synchronize sales shift entries into employee attendance records.
 * Keeps manual edits intact while ensuring every recorded sale shift has a corresponding
 * presence / overtime attendance entry for the assigned operator with synchronized working hours.
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

  // Kelompokkan penjualan per karyawan + tanggal, agar hasil akhirnya DIHITUNG ULANG DARI NOL
  // setiap kali fungsi ini dipanggil (idempoten). Versi lama menambah +1 lembur pada data yang
  // sudah ada setiap kali disinkron ulang (mis. saat ubah harga, impor, atau klik tombol sinkron),
  // sehingga lembur terus membengkak walau penjualan yang disinkron sama persis.
  const groups = new Map<string, { emp: Employee; date: string; sales: SaleRecord[] }>();
  relevantSales.forEach((sale) => {
    const opName = sale.operatorName.trim();
    if (!opName) return;
    const matchedEmp = findEmployeeByOperatorName(opName, employees);
    if (!matchedEmp) return;
    const key = `${matchedEmp.id}_${sale.transactionDate}`;
    const g = groups.get(key);
    if (g) g.sales.push(sale);
    else groups.set(key, { emp: matchedEmp, date: sale.transactionDate, sales: [sale] });
  });

  const attendanceMap = new Map<string, AttendanceRecord>();
  currentAttendance.forEach((att) => {
    attendanceMap.set(`${att.employeeId}_${att.date}`, { ...att });
  });

  groups.forEach(({ emp, date, sales: daySales }, key) => {
    const shiftInfos = daySales.map((s) => ({ sale: s, info: getShiftHoursInfo(s.shift) }));
    const isExplicitLembur = daySales.some(
      (s) =>
        s.shift.toLowerCase().includes('lembur') ||
        s.operatorName.toLowerCase().includes('lembur') ||
        (s.notes || '').toLowerCase().includes('lembur')
    );
    const hasFull = shiftInfos.some((x) => x.info.isFull);
    const hasShift1 = shiftInfos.some((x) => x.info.isShift1);
    const hasShift2 = shiftInfos.some((x) => x.info.isShift2);
    // Lembur HANYA terjadi bila operator menutupi lebih dari satu shift / shift penuh / ditandai eksplisit.
    // Dihitung dari jumlah shift DISTINCT pada hari itu (maks. 1 nilai lembur per hari), bukan akumulasi.
    const isMultiShift = isExplicitLembur || hasFull || (hasShift1 && hasShift2);

    const totalLiters = daySales.reduce((acc, s) => acc + (s.literSold || 0), 0);
    const shiftLabels = Array.from(new Set(daySales.map((s) => s.shift))).join(', ');

    const finalShiftName = isMultiShift ? STANDARD_SHIFTS.FULL_SHIFT.name : shiftInfos[0].info.shiftName;
    const finalCheckIn = isMultiShift ? '05:30' : shiftInfos[0].info.checkIn;
    const finalCheckOut = isMultiShift ? '19:30' : shiftInfos[0].info.checkOut;
    const finalStatus = isMultiShift ? 'LEMBUR' : 'HADIR';
    const finalOvertime = isMultiShift ? 1 : 0;
    // Tanda penanda agar catatan ini bisa dibedakan dari catatan manual dan diregenerasi bersih
    // (tanpa menumpuk teks "Multi-Shift: ... | Multi-Shift: ..." setiap sinkron ulang)
    const autoNotePrefix = '[Auto-Sinkron Penjualan]';
    const autoNote = `${autoNotePrefix} ${totalLiters} L total (${shiftLabels})`;

    const existing = attendanceMap.get(key);
    if (existing) {
      // Pertahankan catatan manual yang ditulis operator/admin; hanya ganti bagian auto-note.
      const manualNotes = (existing.notes || '')
        .split('|')
        .map((x) => x.trim())
        .filter((x) => x && !x.startsWith(autoNotePrefix))
        .join(' | ');
      const mergedNotes = manualNotes ? `${manualNotes} | ${autoNote}` : autoNote;

      const changed =
        existing.status !== finalStatus ||
        existing.overtimeShifts !== finalOvertime ||
        existing.shift !== finalShiftName ||
        existing.checkInTime !== finalCheckIn ||
        existing.checkOutTime !== finalCheckOut ||
        existing.notes !== mergedNotes;

      if (changed) {
        attendanceMap.set(key, {
          ...existing,
          status: finalStatus,
          overtimeShifts: finalOvertime,
          shift: finalShiftName,
          checkInTime: finalCheckIn,
          checkOutTime: finalCheckOut,
          notes: mergedNotes,
        });
        updatedCount++;
      }
    } else {
      const newRec: AttendanceRecord = {
        id: `att-sale-${emp.id}-${date}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        shift: finalShiftName,
        status: finalStatus,
        checkInTime: finalCheckIn,
        checkOutTime: finalCheckOut,
        overtimeShifts: finalOvertime,
        notes: autoNote,
        createdAt: `${date} ${shiftInfos[0].sale.time || finalCheckIn}`,
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
 * Checks whether an attendance record has mismatched working hours (checkIn/checkOut) vs shift assignment
 */
export function isAttendanceHoursMismatch(rec: AttendanceRecord): boolean {
  if (rec.status === 'IZIN' || rec.status === 'SAKIT' || rec.status === 'ALPA' || rec.status === 'LIBUR') {
    return false;
  }
  const info = getShiftHoursInfo(rec.shift);
  if (info.isOff) return false;

  const currentCheckIn = rec.checkInTime || '';
  const currentCheckOut = rec.checkOutTime || '';

  return currentCheckIn !== info.checkIn || currentCheckOut !== info.checkOut || rec.shift !== info.shiftName;
}

/**
 * Automatically audits and synchronizes working hours (checkInTime & checkOutTime)
 * with duty shift (shift) for all attendance records.
 */
export function synchronizeAllAttendanceHours(
  attendance: AttendanceRecord[]
): { updatedAttendance: AttendanceRecord[]; fixedCount: number } {
  let fixedCount = 0;

  const updatedAttendance = attendance.map((rec) => {
    if (rec.status === 'IZIN' || rec.status === 'SAKIT' || rec.status === 'ALPA' || rec.status === 'LIBUR') {
      return rec;
    }

    const info = getShiftHoursInfo(rec.shift);
    if (info.isOff) return rec;

    let needsFix = false;
    let newShift = rec.shift;
    let newCheckIn = rec.checkInTime;
    let newCheckOut = rec.checkOutTime;

    if (rec.shift !== info.shiftName) {
      newShift = info.shiftName;
      needsFix = true;
    }

    if (rec.checkInTime !== info.checkIn) {
      newCheckIn = info.checkIn;
      needsFix = true;
    }

    if (rec.checkOutTime !== info.checkOut) {
      newCheckOut = info.checkOut;
      needsFix = true;
    }

    if (needsFix) {
      fixedCount++;
      return {
        ...rec,
        shift: newShift,
        checkInTime: newCheckIn,
        checkOutTime: newCheckOut,
      };
    }

    return rec;
  });

  return { updatedAttendance, fixedCount };
}

/**
 * Memeriksa apakah perhitungan gaji otomatis diperbolehkan untuk bulan tertentu.
 * Aturan: Hanya dapat dilakukan pada 2 hari terakhir bulan tersebut (atau bulan-bulan yang telah lalu).
 */
export interface PayrollEligibility {
  allowed: boolean;
  daysInMonth: number;
  startEligibilityDay: number;
  endEligibilityDay: number;
  status: 'PAST_MONTH' | 'ACTIVE_WINDOW' | 'TOO_EARLY' | 'FUTURE_MONTH';
  message: string;
}


// Apakah targetMonth (YYYY-MM) adalah bulan berjalan atau di masa depan relatif terhadap tanggal sekarang
function isCurrentOrFutureMonth(targetMonth: string, referenceDate: Date = new Date()): boolean {
  const [y, m] = targetMonth.split('-').map(Number);
  const targetVal = y * 12 + m;
  const currentVal = referenceDate.getFullYear() * 12 + (referenceDate.getMonth() + 1);
  return targetVal >= currentVal;
}

export function isPayrollCalculationAllowed(
  targetMonth: string,
  referenceDate: Date = new Date()
): PayrollEligibility {
  const [yearStr, monthStr] = targetMonth.split('-');
  const targetYear = parseInt(yearStr, 10);
  const targetMonthNum = parseInt(monthStr, 10);

  // Jumlah hari dalam targetMonth (misal 30 hari untuk Sep, 31 hari untuk Agu, 28/29 untuk Feb)
  const daysInMonth = new Date(targetYear, targetMonthNum, 0).getDate();
  const startEligibilityDay = Math.max(1, daysInMonth - 1); // 2 hari terakhir (misal tgl 29 & 30 untuk bulan 30 hari)

  const currentYear = referenceDate.getFullYear();
  const currentMonthNum = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  const targetPeriodVal = targetYear * 12 + targetMonthNum;
  const currentPeriodVal = currentYear * 12 + currentMonthNum;

  // Kasus 1: Bulan di masa lalu (sebelum bulan berjalan saat ini) -> Diizinkan karena sudah lewat
  if (targetPeriodVal < currentPeriodVal) {
    return {
      allowed: true,
      daysInMonth,
      startEligibilityDay,
      endEligibilityDay: daysInMonth,
      status: 'PAST_MONTH',
      message: 'Periode bulan telah selesai. Perhitungan gaji otomatis diizinkan.',
    };
  }

  // Kasus 2: Bulan di masa mendatang -> Belum diizinkan
  if (targetPeriodVal > currentPeriodVal) {
    return {
      allowed: false,
      daysInMonth,
      startEligibilityDay,
      endEligibilityDay: daysInMonth,
      status: 'FUTURE_MONTH',
      message: `Bulan belum berjalan. Hitung gaji otomatis baru dapat dilakukan pada 2 hari terakhir bulan tersebut (mulai tanggal ${startEligibilityDay}).`,
    };
  }

  // Kasus 3: Bulan berjalan saat ini (targetPeriodVal === currentPeriodVal)
  if (currentDay >= startEligibilityDay) {
    return {
      allowed: true,
      daysInMonth,
      startEligibilityDay,
      endEligibilityDay: daysInMonth,
      status: 'ACTIVE_WINDOW',
      message: `Saat ini berada pada 2 hari terakhir bulan ini (tanggal ${startEligibilityDay} - ${daysInMonth}). Hitung gaji otomatis siap dijalankan.`,
    };
  } else {
    const daysRemaining = startEligibilityDay - currentDay;
    return {
      allowed: false,
      daysInMonth,
      startEligibilityDay,
      endEligibilityDay: daysInMonth,
      status: 'TOO_EARLY',
      message: `Hitung gaji otomatis baru dapat dilakukan pada 2 hari terakhir bulan ini (mulai tanggal ${startEligibilityDay} - ${daysRemaining} hari lagi), agar data seluruh shift kerja dan absensi telah lengkap.`,
    };
  }
}

/**
 * Recalculate monthly payroll slips based on updated attendance records.
 * Hanya membuat slip gaji baru jika diizinkan (2 hari terakhir bulan tersebut) atau jika dipaksa (forceCreate=true).
 */
export function recalculateMonthlyPayrolls(
  attendance: AttendanceRecord[],
  employees: Employee[],
  currentPayrolls: PayrollRecord[],
  targetMonth: string,
  forceCreate: boolean = false
): PayrollRecord[] {
  const updatedPayrolls = [...currentPayrolls];
  const year = parseInt(targetMonth.split('-')[0], 10);
  const month = parseInt(targetMonth.split('-')[1], 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const eligibility = isPayrollCalculationAllowed(targetMonth);

  employees.forEach((emp) => {
    const empMonthAtt = attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(targetMonth)
    );

    const totalHadir = empMonthAtt.filter((a) => a.status === 'HADIR' || a.status === 'LEMBUR').length;
    const totalLemburShifts = empMonthAtt.reduce((sum, a) => sum + (a.overtimeShifts || 0), 0);
    const totalIzin = empMonthAtt.filter((a) => a.status === 'IZIN').length;
    const totalSakit = empMonthAtt.filter((a) => a.status === 'SAKIT').length;
    const totalAlpa = empMonthAtt.filter((a) => a.status === 'ALPA').length;

    const existingIndex = updatedPayrolls.findIndex(
      (p) => p.month === targetMonth && p.employeeId === emp.id
    );

    const existingSlip = existingIndex >= 0 ? updatedPayrolls[existingIndex] : null;

    // KUNCI: slip yang sudah berstatus DIBAYAR tidak lagi dihitung ulang otomatis. Nominal yang
    // sudah dibayarkan ke karyawan adalah fakta final; absensi yang berubah belakangan (koreksi,
    // impor ulang, dsb.) tidak boleh diam-diam mengubah nominal slip yang sudah lunas. Untuk
    // mengoreksi slip yang sudah dibayar, batalkan status bayar (Unpay) terlebih dahulu.
    if (existingSlip && existingSlip.paymentStatus === 'DIBAYAR') {
      return;
    }

    // Jika belum ada slip gaji dan belum memasuki 2 hari terakhir bulan tersebut (dan tidak di-force), jangan buat slip prematur
    if (!existingSlip && !eligibility.allowed && !forceCreate) {
      return;
    }

    // Hitung gaji pokok & lembur (pertahankan nominal manual jika jumlah hari/shift sama)
    const basicSalary =
      existingSlip && existingSlip.totalHadir === totalHadir
        ? existingSlip.basicSalary
        : totalHadir * emp.dailyRate;

    const overtimePay =
      existingSlip && existingSlip.totalLemburShifts === totalLemburShifts
        ? existingSlip.overtimePay
        : totalLemburShifts * emp.overtimeRate;

    const mealAllowance = 0; // Fitur uang makan dihapus sesuai instruksi
    const bonusAllowance = existingSlip?.bonusAllowance || 0;

    const totalDeductions =
      (existingSlip?.kasbonDeduction || 0) +
      (existingSlip?.penaltyDeduction || 0) +
      (existingSlip?.otherDeductions || 0);

    const grossSalary = basicSalary + overtimePay + bonusAllowance;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

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
      bonusAllowance,
      kasbonDeduction: existingSlip?.kasbonDeduction || 0,
      penaltyDeduction: existingSlip?.penaltyDeduction || 0,
      otherDeductions: existingSlip?.otherDeductions || 0,
      grossSalary,
      totalDeductions,
      netSalary,
      // Bulan BERJALAN/masa depan: slip baru default DRAFT (belum dibayar, menunggu aksi "Bayar Gaji").
      // Bulan yang SUDAH LEWAT (mis. input rekap historis): default DIBAYAR, karena secara riil
      // gaji bulan lalu pasti sudah dibayarkan. Catatan: status ini TIDAK membuat beban pengeluaran
      // otomatis — beban "GAJI_OPERATOR" hanya tercatat saat tombol Bayar Gaji ditekan (lihat
      // handlePaySalary di App.tsx), supaya pembukuan tidak kehilangan jejak transaksi gaji.
      paymentStatus: existingSlip?.paymentStatus || (isCurrentOrFutureMonth(targetMonth) ? 'DRAFT' : 'DIBAYAR'),
      paymentDate: existingSlip?.paymentDate || (isCurrentOrFutureMonth(targetMonth) ? undefined : `${targetMonth}-${String(daysInMonth).padStart(2, '0')}`),
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
