import React, { useState, useRef } from 'react';
import {
  X,
  Calendar,
  CalendarDays,
  FileSpreadsheet,
  UploadCloud,
  Download,
  Check,
  AlertCircle,
  Sparkles,
  Info,
  DollarSign,
  Fuel,
  Truck,
  Receipt,
  Layers,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Zap,
  Droplet,
  Wrench,
  Landmark,
  Clock,
  ChevronRight,
  Database,
  Sliders,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Employee, SaleRecord, PurchaseOrder, ExpenseRecord, OrderVolumePecahan } from '../types';
import {
  formatRupiah,
  formatNumber,
  formatLiter,
  formatDateIndo,
  formatMonthYear,
  MONTH_NAMES_INDO,
  getTodayDateString,
} from '../utils/formatters';

export interface MonthlyBatchPayload {
  targetMonth: string; // YYYY-MM
  totalLitersSold: number;
  meterAwal?: number;
  meterAkhir?: number;
  unitPrice: number;
  buyPrice: number;
  cashPayment: number;
  nonCashPayment: number;
  distributionMode: 'AUTO_DISTRIBUTE' | 'SINGLE_RECORD';
  totalDOLiters: number;
  doAmount?: number;
  tbbmDepot?: string;
  expenses: {
    gajiOperator: number;
    tokenListrik: number;
    pdam: number;
    maintenance: number;
    lossesMinyak: number;
    lossesLiters: number;
    dividenOwner: number;
    lainnya: number;
    notes?: string;
  };
  syncTankStock: boolean;
  replaceExistingMonthData: boolean;
}

interface HistoricalMonthlyBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  employees: Employee[];
  existingSales: SaleRecord[];
  onSaveMonthlyBatch: (batchData: MonthlyBatchPayload) => void;
  onSaveMultiMonthBatches: (batches: MonthlyBatchPayload[]) => void;
}

export const HistoricalMonthlyBatchModal: React.FC<HistoricalMonthlyBatchModalProps> = ({
  isOpen,
  onClose,
  products,
  employees,
  existingSales,
  onSaveMonthlyBatch,
  onSaveMultiMonthBatches,
}) => {
  const [activeTab, setActiveTab] = useState<'FORM' | 'EXCEL'>('FORM');

  // FORM TAB STATES
  // Default to previous month
  const today = new Date();
  const defaultYear = today.getFullYear();
  const defaultMonthNum = today.getMonth() === 0 ? 12 : today.getMonth(); // 1-12
  const defaultTargetYear = today.getMonth() === 0 ? defaultYear - 1 : defaultYear;

  const [selectedYear, setSelectedYear] = useState<number>(defaultTargetYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonthNum);

  const primaryProduct = products.find((p) => p.id === 'prod-pertamax-92') || products[0];

  // Sales Form States
  const [useMeter, setUseMeter] = useState<boolean>(true);
  const [meterAwal, setMeterAwal] = useState<number>(100000);
  const [meterAkhir, setMeterAkhir] = useState<number>(118500);
  const [totalLitersSold, setTotalLitersSold] = useState<number>(18500);
  const [unitPrice, setUnitPrice] = useState<number>(primaryProduct?.currentPrice || 12950);
  const [buyPrice, setBuyPrice] = useState<number>(primaryProduct?.buyPrice || 12100);
  const [cashRatio, setCashRatio] = useState<number>(85); // 85% Tunai, 15% QRIS/EDC

  // DO Pertamina Form States
  const [hasDO, setHasDO] = useState<boolean>(true);
  const [totalDOLiters, setTotalDOLiters] = useState<number>(18000); // 18 KL
  const [tbbmDepot, setTbbmDepot] = useState<string>('TBBM Rewulu / Boyolali');

  // OpEx Form States
  const [gajiOperator, setGajiOperator] = useState<number>(2400000); // default 2 operator @ 1.2jt
  const [tokenListrik, setTokenListrik] = useState<number>(350000);
  const [pdam, setPdam] = useState<number>(100000);
  const [maintenance, setMaintenance] = useState<number>(150000);
  const [lossesMinyak, setLossesMinyak] = useState<number>(0);
  const [dividenOwner, setDividenOwner] = useState<number>(6000000);
  const [lainnya, setLainnya] = useState<number>(100000);

  // Strategy & Sync Options
  const [distributionMode, setDistributionMode] = useState<'AUTO_DISTRIBUTE' | 'SINGLE_RECORD'>('AUTO_DISTRIBUTE');
  const [syncTankStock, setSyncTankStock] = useState<boolean>(true);
  const [replaceExistingMonthData, setReplaceExistingMonthData] = useState<boolean>(true);

  // EXCEL IMPORT TAB STATES
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [parsedMultiMonthRows, setParsedMultiMonthRows] = useState<any[]>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const targetMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const endOfMonthDate = `${targetMonthStr}-${String(daysInMonth).padStart(2, '0')}`;

  // Handle Meter change
  const handleMeterAwalChange = (val: number) => {
    setMeterAwal(val);
    if (useMeter) {
      const calculated = Math.max(0, meterAkhir - val);
      setTotalLitersSold(calculated);
    }
  };

  const handleMeterAkhirChange = (val: number) => {
    setMeterAkhir(val);
    if (useMeter) {
      const calculated = Math.max(0, val - meterAwal);
      setTotalLitersSold(calculated);
    }
  };

  const handleLitersChange = (val: number) => {
    setTotalLitersSold(val);
    if (useMeter) {
      setMeterAkhir(meterAwal + val);
    }
  };

  // Financial calculations
  const totalOmzet = totalLitersSold * unitPrice;
  const totalHPP = totalLitersSold * buyPrice;
  const totalGrossProfit = totalOmzet - totalHPP;
  const cashAmount = Math.round((totalOmzet * cashRatio) / 100);
  const nonCashAmount = totalOmzet - cashAmount;

  const totalDOAmount = totalDOLiters * buyPrice;
  const totalOpEx = gajiOperator + tokenListrik + pdam + maintenance + lossesMinyak + lainnya;
  const estimatedNetProfit = totalGrossProfit - totalOpEx;

  // Check if target month already has data in system
  const monthSalesCount = existingSales.filter((s) => s.transactionDate.startsWith(targetMonthStr)).length;

  // Handle single month form submission
  const handleSubmitSingleMonth = (e: React.FormEvent) => {
    e.preventDefault();

    if (totalLitersSold <= 0) {
      alert('Total liter penjualan harus lebih besar dari 0.');
      return;
    }

    const payload: MonthlyBatchPayload = {
      targetMonth: targetMonthStr,
      totalLitersSold,
      meterAwal: useMeter ? meterAwal : undefined,
      meterAkhir: useMeter ? meterAkhir : undefined,
      unitPrice,
      buyPrice,
      cashPayment: cashAmount,
      nonCashPayment: nonCashAmount,
      distributionMode,
      totalDOLiters: hasDO ? totalDOLiters : 0,
      doAmount: hasDO ? totalDOAmount : 0,
      tbbmDepot,
      expenses: {
        gajiOperator,
        tokenListrik,
        pdam,
        maintenance,
        lossesMinyak,
        lossesLiters: buyPrice > 0 ? Math.round(lossesMinyak / buyPrice) : 0,
        dividenOwner,
        lainnya,
        notes: `Rekap pengeluaran bulanan historis ${formatMonthYear(targetMonthStr)}`,
      },
      syncTankStock,
      replaceExistingMonthData,
    };

    onSaveMonthlyBatch(payload);
    onClose();
  };

  // Download Multi-Month Excel Template
  const handleDownloadMultiMonthTemplate = () => {
    const templateRows = [
      {
        'Bulan (YYYY-MM)': '2026-01',
        'Nama Periode': 'Januari 2026',
        'Stand Awal': 100000,
        'Stand Akhir': 118200,
        'Total Liter': 18200,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai (Rp)': 200257000,
        'QRIS / EDC (Rp)': 35433000,
        'Total DO (Liter)': 18000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Gaji Operator (Rp)': 2400000,
        'Token Listrik (Rp)': 350000,
        'PDAM (Rp)': 100000,
        'Maintenance (Rp)': 150000,
        'Losses Minyak (Rp)': 0,
        'Dividen Owner (Rp)': 6000000,
        'Lain-lain (Rp)': 100000,
        'Catatan': 'Rekapitulasi pembukuan Januari 2026',
      },
      {
        'Bulan (YYYY-MM)': '2026-02',
        'Nama Periode': 'Februari 2026',
        'Stand Awal': 118200,
        'Stand Akhir': 135400,
        'Total Liter': 17200,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai (Rp)': 189326000,
        'QRIS / EDC (Rp)': 33414000,
        'Total DO (Liter)': 18000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Gaji Operator (Rp)': 2400000,
        'Token Listrik (Rp)': 320000,
        'PDAM (Rp)': 95000,
        'Maintenance (Rp)': 100000,
        'Losses Minyak (Rp)': 0,
        'Dividen Owner (Rp)': 5500000,
        'Lain-lain (Rp)': 80000,
        'Catatan': 'Rekapitulasi pembukuan Februari 2026',
      },
      {
        'Bulan (YYYY-MM)': '2026-03',
        'Nama Periode': 'Maret 2026',
        'Stand Awal': 135400,
        'Stand Akhir': 154100,
        'Total Liter': 18700,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai (Rp)': 205840000,
        'QRIS / EDC (Rp)': 36325000,
        'Total DO (Liter)': 20000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Gaji Operator (Rp)': 2400000,
        'Token Listrik (Rp)': 340000,
        'PDAM (Rp)': 110000,
        'Maintenance (Rp)': 200000,
        'Losses Minyak (Rp)': 0,
        'Dividen Owner (Rp)': 6500000,
        'Lain-lain (Rp)': 120000,
        'Catatan': 'Rekapitulasi pembukuan Maret 2026',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 16 }, // Bulan (YYYY-MM)
      { wch: 16 }, // Nama Periode
      { wch: 14 }, // Stand Awal
      { wch: 14 }, // Stand Akhir
      { wch: 14 }, // Total Liter
      { wch: 13 }, // Harga Jual
      { wch: 13 }, // Harga Beli
      { wch: 16 }, // Tunai (Rp)
      { wch: 16 }, // QRIS / EDC (Rp)
      { wch: 16 }, // Total DO (Liter)
      { wch: 24 }, // TBBM Depot
      { wch: 18 }, // Gaji Operator (Rp)
      { wch: 16 }, // Token Listrik (Rp)
      { wch: 12 }, // PDAM (Rp)
      { wch: 16 }, // Maintenance (Rp)
      { wch: 16 }, // Losses Minyak (Rp)
      { wch: 16 }, // Dividen Owner (Rp)
      { wch: 14 }, // Lain-lain (Rp)
      { wch: 32 }, // Catatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Bulanan_Historis');
    XLSX.writeFile(wb, 'Template_Rekap_Bulanan_Historis_Pertashop.xlsx');
  };

  // Handle Multi-Month Excel File Upload
  const handleUploadMultiMonthExcel = (file: File) => {
    setExcelFileName(file.name);
    setIsProcessingExcel(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsedBatches: MonthlyBatchPayload[] = [];

        json.forEach((row: any) => {
          const normalized: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.toLowerCase().replace(/[\s_\-()]/g, '');
            normalized[cleanKey] = row[k];
          });

          // Detect Bulan (YYYY-MM)
          let monthStr = String(
            normalized['bulanyyyymm'] ||
            normalized['bulan'] ||
            normalized['period'] ||
            normalized['month'] ||
            ''
          ).trim();

          // Validate YYYY-MM
          if (!/^\d{4}-\d{2}$/.test(monthStr)) {
            // Attempt parse if date string
            const dateMatch = monthStr.match(/^(\d{4})[/-](\d{1,2})/);
            if (dateMatch) {
              monthStr = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}`;
            } else {
              return; // Skip invalid row
            }
          }

          const literRaw = normalized['totalliter'] || normalized['liter'] || normalized['volume'] || normalized['penjualanliter'];
          const meterAwalRaw = normalized['standawal'] || normalized['meterawal'];
          const meterAkhirRaw = normalized['standakhir'] || normalized['meterakhir'];

          let literSold = parseFloat(literRaw) || 0;
          let mAwal = meterAwalRaw !== '' && meterAwalRaw !== undefined ? parseFloat(meterAwalRaw) : undefined;
          let mAkhir = meterAkhirRaw !== '' && meterAkhirRaw !== undefined ? parseFloat(meterAkhirRaw) : undefined;

          if (literSold <= 0 && mAwal !== undefined && mAkhir !== undefined) {
            literSold = Math.max(0, mAkhir - mAwal);
          }

          if (literSold <= 0) return;

          const uPrice = parseFloat(normalized['hargajual'] || normalized['harga']) || primaryProduct.currentPrice || 12950;
          const bPrice = parseFloat(normalized['hargabeli'] || normalized['hargatebus']) || primaryProduct.buyPrice || 12100;
          const omzetCalc = literSold * uPrice;

          const tunaiRaw = normalized['tunairp'] || normalized['tunai'] || normalized['cash'];
          const qrisRaw = normalized['qrisedcrp'] || normalized['qris'] || normalized['nontunai'];

          let tunai = tunaiRaw !== '' && tunaiRaw !== undefined ? parseFloat(tunaiRaw) : Math.round(omzetCalc * 0.85);
          let qris = qrisRaw !== '' && qrisRaw !== undefined ? parseFloat(qrisRaw) : omzetCalc - tunai;

          const doLitersRaw = normalized['totaldoliter'] || normalized['totaldo'] || normalized['dopertaminaliter'] || normalized['doliter'];
          const doLiters = parseFloat(doLitersRaw) || 0;
          const depot = String(normalized['tbbmdepot'] || normalized['tbbm'] || normalized['depot'] || 'TBBM Rewulu / Boyolali').trim();

          const gaji = parseFloat(normalized['gajioperatorrp'] || normalized['gajioperator'] || normalized['gaji']) || 2400000;
          const listrik = parseFloat(normalized['tokenlistrikrp'] || normalized['tokenlistrik'] || normalized['listrik']) || 350000;
          const pdamVal = parseFloat(normalized['pdamrp'] || normalized['pdam'] || normalized['air']) || 100000;
          const maint = parseFloat(normalized['maintenancerp'] || normalized['maintenance'] || normalized['servis']) || 150000;
          const losses = parseFloat(normalized['lossesminyakrp'] || normalized['lossesminyak'] || normalized['losses']) || 0;
          const prive = parseFloat(normalized['dividenownerrp'] || normalized['dividenowner'] || normalized['prive']) || 0;
          const lain = parseFloat(normalized['lainlainrp'] || normalized['lainlain'] || normalized['lainnya']) || 100000;
          const catatan = String(normalized['catatan'] || normalized['notes'] || normalized['keterangan'] || '').trim();

          parsedBatches.push({
            targetMonth: monthStr,
            totalLitersSold: literSold,
            meterAwal: mAwal,
            meterAkhir: mAkhir,
            unitPrice: uPrice,
            buyPrice: bPrice,
            cashPayment: tunai,
            nonCashPayment: qris,
            distributionMode: 'AUTO_DISTRIBUTE',
            totalDOLiters: doLiters,
            doAmount: doLiters * bPrice,
            tbbmDepot: depot,
            expenses: {
              gajiOperator: gaji,
              tokenListrik: listrik,
              pdam: pdamVal,
              maintenance: maint,
              lossesMinyak: losses,
              lossesLiters: bPrice > 0 ? Math.round(losses / bPrice) : 0,
              dividenOwner: prive,
              lainnya: lain,
              notes: catatan || `Rekap bulanan historis ${formatMonthYear(monthStr)}`,
            },
            syncTankStock: true,
            replaceExistingMonthData: true,
          });
        });

        // Sort by month ascending
        parsedBatches.sort((a, b) => a.targetMonth.localeCompare(b.targetMonth));
        setParsedMultiMonthRows(parsedBatches);
      } catch (err) {
        console.error('Error parsing multi-month excel:', err);
        alert('Gagal membaca file Excel. Pastikan format file sesuai template rekap bulanan.');
      } finally {
        setIsProcessingExcel(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Multi-Month
  const handleCommitMultiMonth = () => {
    if (parsedMultiMonthRows.length === 0) {
      alert('Tidak ada baris data bulanan yang valid untuk disimpan.');
      return;
    }

    onSaveMultiMonthBatches(parsedMultiMonthRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-indigo-300">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Input Rekap Bulanan Historis (Data Lampau)</h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                  Pertashop Berjalan
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Solusi praktis bagi Pertashop yang sudah berjalan: input pembukuan bulan-bulan lalu secara batch per bulan tanpa perlu input harian satu per satu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('FORM')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'FORM'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Input 1 Bulan Cepat (Formulir)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('EXCEL')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'EXCEL'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Multi-Bulan Sekaligus (Excel)</span>
            </button>
          </div>

          {activeTab === 'EXCEL' && (
            <button
              type="button"
              onClick={handleDownloadMultiMonthTemplate}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Template Rekap Multi-Bulan (.xlsx)</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'FORM' ? (
            /* TAB 1: FORMULIR INPUT 1 BULAN CEPAT */
            <form onSubmit={handleSubmitSingleMonth} className="space-y-5 text-xs">
              {/* Alert Status Bulan Ini */}
              {monthSalesCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Bulan <strong>{formatMonthYear(targetMonthStr)}</strong> telah memiliki{' '}
                      <strong>{monthSalesCount} transaksi</strong> di sistem.
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded">
                    {replaceExistingMonthData ? 'Akan Digantikan' : 'Akan Ditambahkan'}
                  </span>
                </div>
              )}

              {/* SECTION 1: PERIODE BULAN */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Pilih Periode Bulan Lampau:</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Target: {formatMonthYear(targetMonthStr)} ({daysInMonth} Hari)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Bulan:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {MONTH_NAMES_INDO.map((name, i) => (
                        <option key={i} value={i + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tahun:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {[2024, 2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Harga Jual / Liter:</label>
                    <input
                      type="number"
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Harga Tebus / Beli:</label>
                    <input
                      type="number"
                      required
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PENJUALAN BBM BULAN INI */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-emerald-600" />
                    <span>Rekap Total Penjualan Nozzle:</span>
                  </h3>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={useMeter}
                      onChange={(e) => setUseMeter(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Input Stand Meter Totalisator</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {useMeter && (
                    <>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Stand Meter Awal Bulan:</label>
                        <input
                          type="number"
                          value={meterAwal}
                          onChange={(e) => handleMeterAwalChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Stand Meter Akhir Bulan:</label>
                        <input
                          type="number"
                          value={meterAkhir}
                          onChange={(e) => handleMeterAkhirChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className={useMeter ? '' : 'sm:col-span-2'}>
                    <label className="block text-slate-600 font-semibold mb-1">Total Liter Terjual 1 Bulan:</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={totalLitersSold}
                        onChange={(e) => handleLitersChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl font-mono font-black text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-slate-400">Liter</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Porsi Kas Tunai vs QRIS (%):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cashRatio}
                        onChange={(e) => setCashRatio(parseInt(e.target.value, 10))}
                        className="flex-1 accent-emerald-600 cursor-pointer"
                      />
                      <span className="font-mono font-bold text-slate-700 w-12 text-right">
                        {cashRatio}% Tunai
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Revenue Preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Total Omzet Penjualan</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">{formatRupiah(totalOmzet)}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Estimasi Laba Kotor (Gross)</span>
                    <span className="font-bold text-emerald-700 font-mono text-xs">{formatRupiah(totalGrossProfit)}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Penerimaan Kasir Tunai</span>
                    <span className="font-medium text-slate-700 font-mono text-xs">{formatRupiah(cashAmount)}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Non-Tunai (QRIS / EDC)</span>
                    <span className="font-medium text-slate-700 font-mono text-xs">{formatRupiah(nonCashAmount)}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PENERIMAAN DO BBM PERTAMINA */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-teal-600" />
                    <span>Rekap Pasokan Delivery Order (DO) Pertamina:</span>
                  </h3>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={hasDO}
                      onChange={(e) => setHasDO(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    <span>Ada Pengiriman DO Bulan Ini</span>
                  </label>
                </div>

                {hasDO && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Total Volume DO (Liter):</label>
                      <input
                        type="number"
                        value={totalDOLiters}
                        onChange={(e) => setTotalDOLiters(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Setara {Math.round(totalDOLiters / 1000)} KL ({Math.round(totalDOLiters / 2000)} kali DO @ 2 KL)
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Total Nilai Penebusan DO:</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-xs">
                        {formatRupiah(totalDOAmount)}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        {totalDOLiters} L × {formatRupiah(buyPrice)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">TBBM Depot Pengirim:</label>
                      <input
                        type="text"
                        value={tbbmDepot}
                        onChange={(e) => setTbbmDepot(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: BIAYA & PENGELUARAN OPERASIONAL (OPEX) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>Rekap Beban & Pengeluaran Operasional (OpEx):</span>
                  </h3>
                  <span className="text-[11px] font-bold font-mono text-amber-700">
                    Total Beban: {formatRupiah(totalOpEx)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Gaji Operator (Total):
                    </label>
                    <input
                      type="number"
                      value={gajiOperator}
                      onChange={(e) => setGajiOperator(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[9px] text-emerald-800 mt-0.5 block font-medium">
                      *Dicatat akhir bulan maks 20:00 WIB
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Token Listrik PLN:</label>
                    <input
                      type="number"
                      value={tokenListrik}
                      onChange={(e) => setTokenListrik(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tagihan PDAM Air:</label>
                    <input
                      type="number"
                      value={pdam}
                      onChange={(e) => setPdam(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Maintenance / Servis:</label>
                    <input
                      type="number"
                      value={maintenance}
                      onChange={(e) => setMaintenance(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Beban Losses Minyak (Rp):</label>
                    <input
                      type="number"
                      value={lossesMinyak}
                      onChange={(e) => setLossesMinyak(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Dividen / Prive Owner:</label>
                    <input
                      type="number"
                      value={dividenOwner}
                      onChange={(e) => setDividenOwner(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Beban Lain-lain / ATK:</label>
                    <input
                      type="number"
                      value={lainnya}
                      onChange={(e) => setLainnya(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Estimasi Laba Bersih:</label>
                    <div className="px-3 py-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-black text-emerald-800 text-xs">
                      {formatRupiah(estimatedNetProfit)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: PILIHAN DISTRIBUSI TRANSAKSI & SINKRONISASI */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Metode Penyimpanan Data Penjualan Lampau:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      distributionMode === 'AUTO_DISTRIBUTE'
                        ? 'border-indigo-600 bg-white text-indigo-950 shadow-xs'
                        : 'border-indigo-200 bg-indigo-50/40 text-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="distMode"
                        value="AUTO_DISTRIBUTE"
                        checked={distributionMode === 'AUTO_DISTRIBUTE'}
                        onChange={() => setDistributionMode('AUTO_DISTRIBUTE')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="font-bold block text-xs">
                          ✨ Sebar Otomatis ke Transaksi Harian (Rekomendasi)
                        </span>
                        <span className="text-[10px] text-slate-600 block mt-0.5 leading-relaxed">
                          Sistem otomatis memecah total {formatNumber(totalLitersSold)} L menjadi transaksi Shift 1 & Shift 2 untuk {daysInMonth} hari dengan fluktuasi alami yang realistis. Grafik penjualan harian dan kalender bulanan langsung terisi sempurna.
                        </span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      distributionMode === 'SINGLE_RECORD'
                        ? 'border-indigo-600 bg-white text-indigo-950 shadow-xs'
                        : 'border-indigo-200 bg-indigo-50/40 text-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="distMode"
                        value="SINGLE_RECORD"
                        checked={distributionMode === 'SINGLE_RECORD'}
                        onChange={() => setDistributionMode('SINGLE_RECORD')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="font-bold block text-xs">
                          📑 Simpan sebagai 1 Record Closing Bulanan Resmi
                        </span>
                        <span className="text-[10px] text-slate-600 block mt-0.5 leading-relaxed">
                          Dicatat sebagai 1 transaksi tunggal di tanggal akhir bulan ({endOfMonthDate}). Cocok jika Anda hanya ingin melihat laporan total laba rugi dan ringkasan eksekutif bulanan tanpa memadati tabel shift.
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="pt-2 border-t border-indigo-200/60 flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-indigo-950 font-medium">
                    <input
                      type="checkbox"
                      checked={syncTankStock}
                      onChange={(e) => setSyncTankStock(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Sinkronkan Stok Tangki Modular (+DO Masuk, -Penjualan Terjual)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-indigo-950 font-medium">
                    <input
                      type="checkbox"
                      checked={replaceExistingMonthData}
                      onChange={(e) => setReplaceExistingMonthData(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Ganti (Replace) data bulan {formatMonthYear(targetMonthStr)} jika sudah pernah diinput</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  💡 Gaji operator otomatis dicatat pada tanggal akhir bulan pukul 20:00 WIB sesuai aturan SOP Pertashop.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-900/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Data Bulan {formatMonthYear(targetMonthStr)}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* TAB 2: IMPORT MULTI-BULAN EXCEL */
            <div className="space-y-5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadMultiMonthExcel(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1">
                  {excelFileName ? excelFileName : 'Upload File Excel Rekap Multi-Bulan (1 Baris = 1 Bulan)'}
                </h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto mb-4 leading-relaxed">
                  Cukup isi 1 baris per bulan di file Excel (misal 6 baris untuk 6 bulan yang lalu), lalu upload ke sini. Seluruh riwayat penjualan, DO, dan pengeluaran akan langsung masuk serentak!
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Pilih File Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMultiMonthTemplate}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Download Template (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Multi-Month Table Preview */}
              {parsedMultiMonthRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{parsedMultiMonthRows.length} Periode Bulan Terdeteksi Siap Diimpor:</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Total Liter: {formatNumber(parsedMultiMonthRows.reduce((acc, r) => acc + r.totalLitersSold, 0))} L
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Bulan</th>
                          <th className="py-2.5 px-3 text-right">Liter Terjual</th>
                          <th className="py-2.5 px-3 text-right">Omzet</th>
                          <th className="py-2.5 px-3 text-right">DO Pertamina</th>
                          <th className="py-2.5 px-3 text-right">Gaji Karyawan</th>
                          <th className="py-2.5 px-3 text-right">Total OpEx</th>
                          <th className="py-2.5 px-3 text-right">Est. Laba Bersih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedMultiMonthRows.map((batch, i) => {
                          const omzet = batch.totalLitersSold * batch.unitPrice;
                          const hpp = batch.totalLitersSold * batch.buyPrice;
                          const gross = omzet - hpp;
                          const opex =
                            batch.expenses.gajiOperator +
                            batch.expenses.tokenListrik +
                            batch.expenses.pdam +
                            batch.expenses.maintenance +
                            batch.expenses.lossesMinyak +
                            batch.expenses.lainnya;
                          const net = gross - opex;

                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold font-mono text-indigo-900">
                                {formatMonthYear(batch.targetMonth)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                {formatNumber(batch.totalLitersSold)} L
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-900">
                                {formatRupiah(omzet)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-teal-700">
                                {batch.totalDOLiters > 0 ? `${formatNumber(batch.totalDOLiters)} L` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">
                                {formatRupiah(batch.expenses.gajiOperator)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-amber-700">
                                {formatRupiah(opex)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                                {formatRupiah(net)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-950 block">
                        Siap Memasukkan {parsedMultiMonthRows.length} Bulan ke Sistem
                      </span>
                      <span className="text-[11px] text-emerald-800 block">
                        Setiap bulan akan disebarkan secara realistis ke transaksi harian dan beban operasional (gaji akhir bulan maks 20:00 WIB).
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCommitMultiMonth}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Seluruh {parsedMultiMonthRows.length} Bulan</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
