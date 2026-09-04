import {
  Product,
  PurchaseOrder,
  SaleRecord,
  TankConfig,
  PertashopProfile,
  PriceHistory,
  SoundingRecord,
  ExpenseRecord,
  ExpenseCategoryType,
  Employee,
  AttendanceRecord,
  PayrollRecord,
} from '../types';
import { RAW_JAN_2026, RAW_FEB_2026, MonthRawData } from './realPertashopSales';
import { RAW_MAR_2026, RAW_APR_2026 } from './realPertashopSalesPart2';
import { RAW_MEI_2026, RAW_JUN_2026, RAW_JUL_2026, RAW_AGT_2026 } from './realPertashopSalesPart3';

export const ALL_RAW_MONTHS: MonthRawData[] = [
  RAW_JAN_2026,
  RAW_FEB_2026,
  RAW_MAR_2026,
  RAW_APR_2026,
  RAW_MEI_2026,
  RAW_JUN_2026,
  RAW_JUL_2026,
  RAW_AGT_2026,
];

export const INITIAL_PERTASHOP_PROFILE: PertashopProfile = {
  pertashopCode: '4P.633.08',
  pertashopName: 'Pertashop Desa Krajan - Parang',
  location: 'Desa Krajan, Kec. Parang, Kab. Magetan, Jawa Timur',
  ownerName: 'H. Bambang / Pengelola Pertashop Krajan',
  contactNumber: '0813-3567-8901',
  tbbmDepot: 'TBBM Madiun / Fuel Terminal Boyolali',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-pertamax-92',
    code: 'PTX-92',
    name: 'Pertamax 92 (BBM Non-Subsidi)',
    ron: 92,
    currentPrice: 15850,
    buyPrice: 15046,
    marginPerLiter: 804,
    color: '#00529B', // Biru Pertamax
    badgeColor: 'bg-blue-600 text-white',
    description: 'Bahan Bakar Bensin Berkualitas Tinggi dengan RON 92 Standar Euro IV',
  },
  {
    id: 'prod-dexlite-51',
    code: 'DXL-51',
    name: 'Dexlite CN 51 (Diesel Ramah Lingkungan)',
    ron: 51,
    currentPrice: 16200,
    buyPrice: 15350,
    marginPerLiter: 850,
    color: '#008542', // Hijau Dexlite
    badgeColor: 'bg-emerald-600 text-white',
    description: 'Bahan Bakar Diesel Cetane Number 51 dengan Sulfur Maksimal 1.200 ppm',
  },
];

export const INITIAL_TANK_CONFIG: TankConfig = {
  tankId: 'TANK-KRAJAN-01',
  tankName: 'Tangki Pendam Modular Pertamax Krajan',
  productId: 'prod-pertamax-92',
  totalCapacityLiters: 5000,
  currentStockLiters: 3066, // Sesuai stok berjalan 22 Agustus 2026
  deadStockLiters: 300,
  warningThresholdLiters: 1500,
  criticalThresholdLiters: 800,
  lastSoundingDate: '2026-08-22',
  lastSoundingLiters: 3066,
};

export const INITIAL_PRICE_HISTORY: PriceHistory[] = [
  {
    id: 'price-hist-004',
    productId: 'prod-pertamax-92',
    effectiveDate: '2026-08-01 00:00',
    oldPrice: 16150,
    newPrice: 15850,
    oldBuyPrice: 15347,
    newBuyPrice: 15046,
    marginPerLiter: 804,
    referenceDoc: 'SK Penyesuaian Harga Pertamina Agustus 2026',
    notes: 'Penyesuaian berkala harga Pertamax Agustus 2026',
    updatedBy: 'Pengelola Pertashop Krajan',
    updatedAt: '2026-08-01 06:00',
  },
  {
    id: 'price-hist-003',
    productId: 'prod-pertamax-92',
    effectiveDate: '2026-06-10 00:00',
    oldPrice: 12200,
    newPrice: 16150,
    oldBuyPrice: 11389,
    newBuyPrice: 15347,
    marginPerLiter: 803,
    referenceDoc: 'SK Penyesuaian Harga Pertamina Juni 2026',
    notes: 'Penyesuaian harga nasional 10 Juni 2026',
    updatedBy: 'Pengelola Pertashop Krajan',
    updatedAt: '2026-06-10 06:00',
  },
  {
    id: 'price-hist-002',
    productId: 'prod-pertamax-92',
    effectiveDate: '2026-03-01 00:00',
    oldPrice: 11700,
    newPrice: 12200,
    oldBuyPrice: 10888,
    newBuyPrice: 11389,
    marginPerLiter: 811,
    referenceDoc: 'SK Penyesuaian Harga Maret 2026',
    notes: 'Penyesuaian harga BBM Maret 2026',
    updatedBy: 'Pengelola Pertashop Krajan',
    updatedAt: '2026-03-01 06:00',
  },
  {
    id: 'price-hist-001',
    productId: 'prod-pertamax-92',
    effectiveDate: '2026-01-01 00:00',
    oldPrice: 12250,
    newPrice: 12250,
    oldBuyPrice: 11439,
    newBuyPrice: 11439,
    marginPerLiter: 811,
    referenceDoc: 'SK Pertamina Awal Tahun 2026',
    notes: 'Harga dasar awal tahun 2026',
    updatedBy: 'Pengelola Pertashop Krajan',
    updatedAt: '2026-01-01 06:00',
  },
];

// Generate exact SaleRecords from user dataset
function buildRealSales(): SaleRecord[] {
  const sales: SaleRecord[] = [];
  let cumulativeTotalizer = 15000.0;

  for (const month of ALL_RAW_MONTHS) {
    let entryIdx = 0;
    for (const item of month.entries) {
      entryIdx++;
      // Only process sales entries (where debet > 0 and volume > 0)
      if (item.debet > 0 && item.volume > 0) {
        const dateStr = `${month.monthKey}-${String(item.day).padStart(2, '0')}`;
        const isShift1 = item.uraian.toLowerCase().includes('shift 1');
        const isShift2 = item.uraian.toLowerCase().includes('shift 2');
        const isAngga = item.uraian.toLowerCase().includes('angga');
        const isDaslam = item.uraian.toLowerCase().includes('daslam');

        let operatorName = 'Daslam';
        let shiftStr = 'Shift 1 (05.30 - 13.30)';
        let timeStr = '13:30';

        if (isShift1) {
          operatorName = 'Daslam (Shift 1)';
          shiftStr = 'Shift 1 (05.30 - 13.30)';
          timeStr = '13:30';
        } else if (isShift2) {
          operatorName = 'Angga (Shift 2)';
          shiftStr = 'Shift 2 (13.30 - 19.30)';
          timeStr = '19:30';
        } else if (isAngga) {
          const isExplicitLembur = item.uraian.toLowerCase().includes('lembur');
          operatorName = isExplicitLembur ? 'Angga (Lembur)' : 'Angga (Shift 2)';
          shiftStr = isExplicitLembur ? 'Full Shift (05.30 - 19.30)' : 'Shift 2 (13.30 - 19.30)';
          timeStr = '19:30';
        } else if (isDaslam) {
          const isExplicitLembur = item.uraian.toLowerCase().includes('lembur');
          operatorName = isExplicitLembur ? 'Daslam (Lembur)' : 'Daslam (Shift 1)';
          shiftStr = isExplicitLembur ? 'Full Shift (05.30 - 19.30)' : 'Shift 1 (05.30 - 13.30)';
          timeStr = isExplicitLembur ? '19:30' : '13:30';
        }

        const unitPrice = Math.round(item.debet / item.volume);
        // Estimate buy price per liter for margin calculation
        let buyPrice = 11439;
        if (month.monthKey === '2026-02') buyPrice = 10888;
        else if (month.monthKey >= '2026-03' && month.monthKey <= '2026-05') buyPrice = 11389;
        else if (month.monthKey === '2026-06') {
          buyPrice = item.day < 10 ? 11389 : 15347;
        } else if (month.monthKey === '2026-07') buyPrice = 15347;
        else if (month.monthKey === '2026-08') buyPrice = 15046;

        const totalRevenue = item.debet;
        const totalProfit = Math.round(totalRevenue - (item.volume * buyPrice));
        const paymentCash = Math.round((totalRevenue * 0.85) / 1000) * 1000;
        const paymentQris = totalRevenue - paymentCash;

        const startTot = Math.round(cumulativeTotalizer * 10) / 10;
        cumulativeTotalizer += item.volume;
        const endTot = Math.round(cumulativeTotalizer * 10) / 10;

        sales.push({
          id: `sale-${month.monthKey}-${String(item.day).padStart(2, '0')}-${entryIdx}`,
          transactionDate: dateStr,
          time: timeStr,
          productId: 'prod-pertamax-92',
          productName: 'Pertamax 92',
          meterAwal: startTot,
          meterAkhir: endTot,
          literSold: item.volume,
          unitPrice: unitPrice,
          totalRevenue: totalRevenue,
          buyPriceSnapshot: buyPrice,
          totalProfit: totalProfit,
          paymentCash: paymentCash,
          paymentQris: paymentQris,
          paymentEdc: 0,
          actualCashInHand: paymentCash,
          cashDifference: 0,
          operatorName: operatorName,
          shift: shiftStr,
          notes: item.uraian,
          createdAt: `${dateStr} ${timeStr}`,
        });
      }
    }
  }

  // Return descending order (most recent date first)
  return sales.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id.localeCompare(a.id));
}

// Generate PurchaseOrders from DO entries in user dataset
function buildRealPurchases(): PurchaseOrder[] {
  const purchases: PurchaseOrder[] = [];
  let poCounter = 1;

  for (const month of ALL_RAW_MONTHS) {
    for (const item of month.entries) {
      if (item.uraian.toUpperCase().includes('DO PERTAMAX') && item.kredit > 0) {
        const dateStr = `${month.monthKey}-${String(item.day).padStart(2, '0')}`;
        const volumeKL = item.volume >= 3000 ? 3 : (item.volume >= 2000 ? 2 : 1);
        const buyPrice = Math.round(item.kredit / item.volume);

        purchases.push({
          id: `po-${month.monthKey}-${String(item.day).padStart(2, '0')}-${poCounter}`,
          poNumber: `DO-KRAJ-${month.monthKey.replace('-', '')}-${String(poCounter).padStart(3, '0')}`,
          orderDate: dateStr,
          estimatedDeliveryDate: dateStr,
          actualDeliveryDate: dateStr,
          productId: 'prod-pertamax-92',
          productName: 'Pertamax 92',
          volumeKL: volumeKL as 1 | 2 | 3,
          volumeLiters: item.volume,
          buyPricePerLiter: buyPrice,
          totalAmount: item.kredit,
          supplyDepot: 'TBBM Madiun / Boyolali',
          driverName: 'Pak Supardi / Sopir Tangki',
          truckPlateNumber: 'AE 8192 UT',
          status: 'SELESAI',
          actualLitersReceived: item.volume,
          density: 0.742,
          temperature: 29.5,
          notes: item.uraian,
          createdAt: `${dateStr} 08:30`,
        });
        poCounter++;
      }
    }
  }

  return purchases.sort((a, b) => b.orderDate.localeCompare(a.orderDate) || b.id.localeCompare(a.id));
}

// Generate Dividends & Operational Expenses
function buildRealExpenses(): ExpenseRecord[] {
  const expenses: ExpenseRecord[] = [];
  let expId = 1;

  // 1. Dividen Payouts directly from dataset
  const dividends = [
    { date: '2026-01-01', amount: 7000000, desc: 'Pembagian Dividen / Profit Share Bulan Januari 2026' },
    { date: '2026-02-01', amount: 7000000, desc: 'Pembagian Dividen / Profit Share Bulan Februari 2026' },
    { date: '2026-03-01', amount: 6000000, desc: 'Pembagian Dividen / Profit Share Bulan Maret 2026' },
    { date: '2026-04-01', amount: 8000000, desc: 'Pembagian Dividen / Profit Share Bulan April 2026' },
    { date: '2026-05-05', amount: 5000000, desc: 'Pembagian Dividen / Profit Share Bulan Mei 2026' },
    { date: '2026-06-09', amount: 4000000, desc: 'Pembagian Dividen / Profit Share Bulan Juni 2026' },
    { date: '2026-07-08', amount: 2200000, desc: 'Pembagian Dividen / Profit Share Bulan Juli 2026' },
  ];

  dividends.forEach((div) => {
    expenses.push({
      id: `exp-div-${expId++}`,
      date: div.date,
      time: '10:00',
      category: 'LAINNYA' as ExpenseCategoryType,
      title: 'Pembagian Dividen Pemilik / Pengelola',
      amount: div.amount,
      personOrVendor: 'Pemilik Pertashop (H. Bambang)',
      paymentSource: 'REKENING_BANK',
      notes: div.desc,
      createdAt: `${div.date} 10:00`,
    });
  });

  // 2. Standard Monthly Operational Expenses & Losses Minyak
  const months = [
    { m: '2026-01', lossL: 18.5, lossRp: 211600, pln: 450000, atk: 150000 },
    { m: '2026-02', lossL: 16.0, lossRp: 174200, pln: 450000, atk: 150000 },
    { m: '2026-03', lossL: 22.0, lossRp: 250500, pln: 450000, atk: 150000 },
    { m: '2026-04', lossL: 24.5, lossRp: 279000, pln: 450000, atk: 150000 },
    { m: '2026-05', lossL: 19.0, lossRp: 216400, pln: 450000, atk: 150000 },
    { m: '2026-06', lossL: 21.5, lossRp: 244800, pln: 450000, atk: 150000 },
    { m: '2026-07', lossL: 17.0, lossRp: 260900, pln: 450000, atk: 150000 },
    { m: '2026-08', lossL: 18.0, lossRp: 270800, pln: 450000, atk: 150000 },
  ];

  months.forEach(({ m, lossL, lossRp, pln, atk }) => {
    // Listrik PLN & Wifi
    expenses.push({
      id: `exp-pln-${expId++}`,
      date: `${m}-05`,
      time: '09:00',
      category: 'TOKEN_LISTRIK' as ExpenseCategoryType,
      title: `Tagihan Listrik PLN & Internet (${m})`,
      amount: pln,
      personOrVendor: 'PLN & Provider Internet',
      paymentSource: 'REKENING_BANK',
      notes: 'Listrik operasional dispenser, lampu canopy, dan sistem POS',
      createdAt: `${m}-05 09:00`,
    });

    // ATK & Maintenance
    expenses.push({
      id: `exp-atk-${expId++}`,
      date: `${m}-12`,
      time: '14:00',
      category: 'MAINTENANCE_ALAT' as ExpenseCategoryType,
      title: `Kertas Thermal Struk & Kebersihan (${m})`,
      amount: atk,
      personOrVendor: 'Toko ATK Parang',
      paymentSource: 'KAS_HARIAN',
      notes: 'Roll thermal printer kasir, sabun pembersih lantai, plastik',
      createdAt: `${m}-12 14:00`,
    });

    // Losses Minyak / Susut Fisik Tangki & Penguapan Bulanan
    expenses.push({
      id: `exp-loss-${expId++}`,
      date: `${m}-28`,
      time: '19:30',
      category: 'LOSSES_MINYAK' as ExpenseCategoryType,
      title: `Susut Fisik & Penguapan Minyak Bulanan (${m})`,
      amount: lossRp,
      fuelLossLiters: lossL,
      personOrVendor: 'Rekonsiliasi Stok Tangki & Dispenser',
      paymentSource: 'KAS_HARIAN',
      notes: `Susut berkala penguapan tangki pendam dan selisih tera nozzle (${lossL} Liter). Masih dalam batas toleransi Pertamina <0.5%.`,
      createdAt: `${m}-28 19:30`,
    });
  });

  return expenses.sort((a, b) => b.date.localeCompare(a.date));
}

export const INITIAL_SALES: SaleRecord[] = buildRealSales();
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = buildRealPurchases();
export const INITIAL_EXPENSES: ExpenseRecord[] = buildRealExpenses();

export const INITIAL_SOUNDING_RECORDS: SoundingRecord[] = [
  {
    id: 'snd-001',
    date: '2026-08-22',
    time: '06:00',
    operatorName: 'Daslam',
    stickDipCm: 146.0,
    calculatedLiters: 3066,
    systemStockLiters: 3066,
    varianceLiters: 0,
    waterBottomCm: 0,
    notes: 'Sounding pagi sebelum operasional dibuka. Sesuai stok berjalan fisik tangki (1 cm = 21 L).',
  },
  {
    id: 'snd-002',
    date: '2026-08-21',
    time: '06:00',
    operatorName: 'Angga',
    stickDipCm: 159.0,
    calculatedLiters: 3339,
    systemStockLiters: 3345,
    varianceLiters: -6,
    waterBottomCm: 0,
    notes: 'Sounding harian pagi, kondisi tangki normal bebas endapan air.',
  },
];

// ================= INITIAL DATA KEPEGAWAIAN, ABSENSI & GAJI =================

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    nik: '3520081204960001',
    name: 'Daslam',
    role: 'OPERATOR_DISPENSER',
    phone: '0812-3456-7890',
    bankName: 'BRI',
    bankAccountNumber: '6338-01-009281-53-4',
    dailyRate: 40000,
    overtimeRate: 30000,
    mealAllowanceDaily: 10000,
    isActive: true,
    joinDate: '2025-01-01',
    notes: 'Operator shift 1 pagi & teknisi harian dispenser',
  },
  {
    id: 'emp-002',
    nik: '3520082408980002',
    name: 'Angga',
    role: 'OPERATOR_DISPENSER',
    phone: '0857-9876-5432',
    bankName: 'BSI',
    bankAccountNumber: '7192834011',
    dailyRate: 40000,
    overtimeRate: 30000,
    mealAllowanceDaily: 10000,
    isActive: true,
    joinDate: '2025-01-01',
    notes: 'Operator shift 2 sore & penanggung jawab sounding malam',
  },
];

function buildRealAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let attId = 1;
  const sales = buildRealSales();

  // Extract from existing sales to match actual shifts worked
  const shiftLogMap = new Map<string, { daslamShift1: boolean; daslamLembur: boolean; anggaShift2: boolean; anggaLembur: boolean }>();

  sales.forEach((s) => {
    const d = s.transactionDate;
    if (!shiftLogMap.has(d)) {
      shiftLogMap.set(d, { daslamShift1: false, daslamLembur: false, anggaShift2: false, anggaLembur: false });
    }
    const cur = shiftLogMap.get(d)!;
    const op = s.operatorName.toLowerCase();
    const notes = (s.notes || '').toLowerCase();

    if (op.includes('daslam')) {
      cur.daslamShift1 = true;
      if (notes.includes('lembur') || op.includes('lembur')) {
        cur.daslamLembur = true;
      }
    }
    if (op.includes('angga')) {
      cur.anggaShift2 = true;
      if (notes.includes('lembur') || op.includes('lembur')) {
        cur.anggaLembur = true;
      }
    }
  });

  Array.from(shiftLogMap.entries()).forEach(([dateStr, log]) => {
    // Record Daslam
    if (log.daslamShift1) {
      records.push({
        id: `att-${attId++}`,
        employeeId: 'emp-001',
        employeeName: 'Daslam',
        date: dateStr,
        shift: log.daslamLembur ? 'Full Shift (05.30 - 19.30)' : 'Shift 1 (05.30 - 13.30)',
        status: log.daslamLembur ? 'LEMBUR' : 'HADIR',
        checkInTime: '05:25',
        checkOutTime: log.daslamLembur ? '19:35' : '13:35',
        overtimeShifts: log.daslamLembur ? 1 : 0,
        notes: log.daslamLembur ? 'Shift 1 + Lembur Shift 2' : 'Bertugas Shift 1 Pagi',
        createdAt: `${dateStr} 05:25`,
      });
    }

    // Record Angga
    if (log.anggaShift2) {
      records.push({
        id: `att-${attId++}`,
        employeeId: 'emp-002',
        employeeName: 'Angga',
        date: dateStr,
        shift: log.anggaLembur ? 'Full Shift (05.30 - 19.30)' : 'Shift 2 (13.30 - 19.30)',
        status: log.anggaLembur ? 'LEMBUR' : 'HADIR',
        checkInTime: log.anggaLembur ? '05:30' : '13:25',
        checkOutTime: '19:35',
        overtimeShifts: log.anggaLembur ? 1 : 0,
        notes: log.anggaLembur ? 'Shift 2 + Lembur Shift 1' : 'Bertugas Shift 2 Sore',
        createdAt: `${dateStr} 13:25`,
      });
    }
  });

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

function buildInitialPayrolls(): PayrollRecord[] {
  const payrolls: PayrollRecord[] = [];
  const attendance = buildRealAttendance();
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  let slipId = 1;

  months.forEach((m) => {
    INITIAL_EMPLOYEES.forEach((emp) => {
      const monthAtt = attendance.filter((a) => a.employeeId === emp.id && a.date.startsWith(m));
      const totalHadir = monthAtt.length;
      const totalLemburShifts = monthAtt.reduce((sum, a) => sum + (a.overtimeShifts || 0), 0);

      const basicSalary = totalHadir * emp.dailyRate;
      const overtimePay = totalLemburShifts * emp.overtimeRate;
      const mealAllowance = totalHadir * emp.mealAllowanceDaily;

      const grossSalary = basicSalary + overtimePay + mealAllowance;
      const totalDeductions = 0;
      const netSalary = grossSalary - totalDeductions;

      payrolls.push({
        id: `pay-${m}-${emp.id}`,
        payrollNumber: `SLIP-${m.replace('-', '')}-${String(slipId++).padStart(3, '0')}`,
        month: m,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        periodStartDate: `${m}-01`,
        periodEndDate: `${m}-28`,
        totalHadir,
        totalLemburShifts,
        totalIzin: 0,
        totalSakit: 0,
        totalAlpa: 0,
        dailyRate: emp.dailyRate,
        basicSalary,
        overtimeRate: emp.overtimeRate,
        overtimePay,
        mealAllowance,
        kasbonDeduction: 0,
        penaltyDeduction: 0,
        otherDeductions: 0,
        grossSalary,
        totalDeductions,
        netSalary,
        paymentStatus: m === '2026-08' ? 'DRAFT' : 'DIBAYAR',
        paymentDate: m === '2026-08' ? undefined : `${m}-28`,
        paymentSource: 'REKENING_BANK',
        notes: `Gaji bulanan ${emp.name} periode ${m}`,
        createdAt: `${m}-28 17:00`,
      });
    });
  });

  return payrolls.sort((a, b) => b.month.localeCompare(a.month) || a.employeeName.localeCompare(b.employeeName));
}

export const INITIAL_ATTENDANCE: AttendanceRecord[] = buildRealAttendance();
export const INITIAL_PAYROLLS: PayrollRecord[] = buildInitialPayrolls();

