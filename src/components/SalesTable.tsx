import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  Printer,
  Trash2,
  Fuel,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  FileSpreadsheet,
  UploadCloud,
  Gauge,
  Calendar,
  SlidersHorizontal,
  RotateCcw,
  Check,
  CreditCard,
  Banknote,
  FileText,
  X,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SaleRecord } from '../types';
import { formatRupiah, formatNumber, formatShortDate, formatLiter } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

export interface SalesColumnVisibility {
  waktuShift: boolean;
  operator: boolean;
  produk: boolean;
  totalisator: boolean;
  sounding: boolean;
  volume: boolean;
  harga: boolean;
  omzet: boolean;
  margin: boolean;
  metodeBayar: boolean;
  selisihKas: boolean;
  catatan: boolean;
  aksi: boolean;
}

const DEFAULT_COLUMNS: SalesColumnVisibility = {
  waktuShift: true,
  operator: true,
  produk: true,
  totalisator: true,
  sounding: false,
  volume: true,
  harga: true,
  omzet: true,
  margin: true,
  metodeBayar: false,
  selisihKas: false,
  catatan: false,
  aksi: true,
};

const COLUMN_STORAGE_KEY = 'pertashop_sales_table_columns_v2';

interface ColumnMeta {
  id: keyof SalesColumnVisibility;
  label: string;
  category: 'Wajib / Utama' | 'Operasional & Teknis' | 'Finansial & Kas' | 'Lainnya';
  desc: string;
}

const COLUMN_DEFINITIONS: ColumnMeta[] = [
  { id: 'waktuShift', label: 'Waktu & Shift', category: 'Wajib / Utama', desc: 'Tanggal, jam, dan shift kerja' },
  { id: 'operator', label: 'Nama Operator', category: 'Wajib / Utama', desc: 'Petugas operator bertugas' },
  { id: 'produk', label: 'Produk BBM', category: 'Wajib / Utama', desc: 'Jenis BBM (Pertamax / Dexlite)' },
  { id: 'totalisator', label: 'Totalisator Meter', category: 'Operasional & Teknis', desc: 'Stand awal → Stand akhir dispenser' },
  { id: 'sounding', label: 'Sounding Tangki', category: 'Operasional & Teknis', desc: 'Tinggi stik celup & volume fisik tangki' },
  { id: 'volume', label: 'Volume Terjual (Liter)', category: 'Finansial & Kas', desc: 'Jumlah liter BBM keluar' },
  { id: 'harga', label: 'Harga Satuan (Rp)', category: 'Finansial & Kas', desc: 'Harga jual per liter' },
  { id: 'omzet', label: 'Total Omzet (Rp)', category: 'Finansial & Kas', desc: 'Penerimaan kotor penjualan' },
  { id: 'margin', label: 'Margin / Laba (Rp)', category: 'Finansial & Kas', desc: 'Estimasi keuntungan dealer' },
  { id: 'metodeBayar', label: 'Metode Pembayaran', category: 'Finansial & Kas', desc: 'Rincian Kas Tunai & Non-Tunai' },
  { id: 'selisihKas', label: 'Selisih Kasir', category: 'Finansial & Kas', desc: 'Selisih uang fisik kasir vs sistem' },
  { id: 'catatan', label: 'Catatan Shift', category: 'Lainnya', desc: 'Keterangan atau kendala nozzle' },
  { id: 'aksi', label: 'Tombol Aksi', category: 'Lainnya', desc: 'Cetak struk, edit data, dan hapus' },
];

export type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

interface SalesTableProps {
  sales: SaleRecord[];
  onDeleteSale: (id: string) => void;
  onEditSale: (sale: SaleRecord) => void;
  onOpenNewSaleModal: () => void;
  onOpenPrintReportModal: () => void;
  onOpenImportModal: () => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onDeleteSale,
  onEditSale,
  onOpenNewSaleModal,
  onOpenPrintReportModal,
  onOpenImportModal,
}) => {
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  
  // Date Range Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomDateInputs, setShowCustomDateInputs] = useState<boolean>(false);

  // Column Customization States
  const [visibleColumns, setVisibleColumns] = useState<SalesColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_COLUMNS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_COLUMNS;
  });
  const [showColumnMenu, setShowColumnMenu] = useState<boolean>(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<SaleRecord | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Save column visibility to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {
      // ignore
    }
  }, [visibleColumns]);

  // Close column dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleColumn = (key: keyof SalesColumnVisibility) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAllColumns = () => {
    const allTrue: SalesColumnVisibility = Object.keys(DEFAULT_COLUMNS).reduce((acc, key) => {
      acc[key as keyof SalesColumnVisibility] = true;
      return acc;
    }, {} as SalesColumnVisibility);
    setVisibleColumns(allTrue);
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
  };

  const activeColumnsCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalColumnsCount = Object.keys(visibleColumns).length;

  // Date Calculations
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  const sevenDaysDate = new Date(now);
  sevenDaysDate.setDate(sevenDaysDate.getDate() - 6);
  const sevenDaysAgoStr = `${sevenDaysDate.getFullYear()}-${String(sevenDaysDate.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysDate.getDate()).padStart(2, '0')}`;

  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYearMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Last day of last month
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const lastMonthStartStr = `${lastYearMonth}-01`;
  const lastMonthEndStr = `${lastYearMonth}-${String(lastDayOfLastMonth).padStart(2, '0')}`;

  // Handle Preset Selection
  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      setShowCustomDateInputs(false);
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'YESTERDAY') {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
      setShowCustomDateInputs(false);
    } else if (preset === '7DAYS') {
      setStartDate(sevenDaysAgoStr);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'THIS_MONTH') {
      setStartDate(`${currentYearMonth}-01`);
      setEndDate(todayStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'LAST_MONTH') {
      setStartDate(lastMonthStartStr);
      setEndDate(lastMonthEndStr);
      setShowCustomDateInputs(false);
    } else if (preset === 'CUSTOM') {
      setShowCustomDateInputs(true);
    }
  };

  const handleResetDateFilter = () => {
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setShowCustomDateInputs(false);
  };

  // Filter Sales Records
  const filteredSales = sales
    .filter((s) => {
      // 1. Search filter
      const matchSearch =
        s.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Shift filter
      const matchShift = selectedShift === 'ALL' || s.shift.includes(selectedShift);

      // 3. Date Range Filter
      let matchDate = true;
      if (datePreset === 'TODAY') {
        matchDate = s.transactionDate === todayStr;
      } else if (datePreset === 'YESTERDAY') {
        matchDate = s.transactionDate === yesterdayStr;
      } else if (datePreset === '7DAYS') {
        matchDate = s.transactionDate >= sevenDaysAgoStr && s.transactionDate <= todayStr;
      } else if (datePreset === 'THIS_MONTH') {
        matchDate = s.transactionDate.startsWith(currentYearMonth);
      } else if (datePreset === 'LAST_MONTH') {
        matchDate = s.transactionDate.startsWith(lastYearMonth);
      } else if (datePreset === 'CUSTOM' || startDate || endDate) {
        if (startDate && s.transactionDate < startDate) matchDate = false;
        if (endDate && s.transactionDate > endDate) matchDate = false;
      }

      return matchSearch && matchShift && matchDate;
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.transactionDate}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.transactionDate}T${b.time || '00:00'}`).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  // Totals of filtered data
  const totalLiters = filteredSales.reduce((acc, s) => acc + s.literSold, 0);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalCash = filteredSales.reduce((acc, s) => acc + (s.paymentCash || 0), 0);
  const totalNonCash = filteredSales.reduce((acc, s) => acc + ((s.paymentQris || 0) + (s.paymentEdc || 0)), 0);
  const totalCashDiff = filteredSales.reduce((acc, s) => acc + (s.cashDifference || 0), 0);

  // Dynamic Colspan for Table Footer
  // We calculate how many visible columns precede the "volume" column
  let preVolumeColSpan = 0;
  if (visibleColumns.waktuShift) preVolumeColSpan++;
  if (visibleColumns.operator) preVolumeColSpan++;
  if (visibleColumns.produk) preVolumeColSpan++;
  if (visibleColumns.totalisator) preVolumeColSpan++;
  if (visibleColumns.sounding) preVolumeColSpan++;

  // Excel (.xlsx) Export
  const exportToExcel = () => {
    const excelData = filteredSales.map((s) => ({
      'ID Transaksi': s.id,
      'Tanggal': s.transactionDate,
      'Waktu': s.time,
      'Shift': s.shift,
      'Nama Operator': s.operatorName,
      'Produk BBM': s.productName,
      'Stand Meter Awal': s.meterAwal ?? '-',
      'Stand Meter Akhir': s.meterAkhir ?? '-',
      'Volume Terjual (Liter)': s.literSold,
      'Harga Satuan (Rp)': s.unitPrice,
      'Harga Tebus Beli (Rp)': s.buyPriceSnapshot,
      'Total Omzet (Rp)': s.totalRevenue,
      'Estimasi Laba Dealer (Rp)': s.totalProfit,
      'Kas Tunai (Rp)': s.paymentCash,
      'QRIS Non-Tunai (Rp)': s.paymentQris,
      'EDC Kartu (Rp)': s.paymentEdc,
      'Uang Kasir Fisik (Rp)': s.actualCashInHand,
      'Selisih Kas (Rp)': s.cashDifference,
      'Sounding Stick (cm)': s.soundingStickCm ?? '-',
      'Volume Sounding (Liter)': s.soundingCalculatedLiters ?? '-',
      'Selisih Fisik vs Buku (L)': s.soundingVarianceLiters ?? '-',
      'Uji Pasta Air (cm)': s.soundingWaterCm ?? '-',
      'Uji Tera (L)': s.teraTestLiters ?? 5,
      'Catatan': s.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penjualan_Pertashop');
    const periodTag = datePreset !== 'ALL' ? `_${datePreset}` : '';
    XLSX.writeFile(wb, `Laporan_Penjualan_Pertashop${periodTag}_${todayStr}.xlsx`);
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Tanggal',
      'Waktu',
      'Shift',
      'Operator',
      'Produk',
      'Stand Awal',
      'Stand Akhir',
      'Jumlah Liter',
      'Harga Satuan (Rp)',
      'Total Pendapatan (Rp)',
      'Estimasi Laba (Rp)',
      'Tunai (Rp)',
      'QRIS/Non-Tunai (Rp)',
      'Selisih Kas (Rp)',
      'Sounding Stick (cm)',
      'Volume Sounding (L)',
      'Selisih Sounding (L)',
      'Catatan',
    ];

    const rows = filteredSales.map((s) => [
      s.id,
      s.transactionDate,
      s.time,
      `"${s.shift}"`,
      `"${s.operatorName}"`,
      `"${s.productName}"`,
      s.meterAwal ?? '-',
      s.meterAkhir ?? '-',
      s.literSold,
      s.unitPrice,
      s.totalRevenue,
      s.totalProfit,
      s.paymentCash,
      s.paymentQris + s.paymentEdc,
      s.cashDifference,
      s.soundingStickCm ?? '-',
      s.soundingCalculatedLiters ?? '-',
      s.soundingVarianceLiters ?? '-',
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const periodTag = datePreset !== 'ALL' ? `_${datePreset}` : '';
    link.setAttribute('download', `Laporan_Penjualan_Pertashop${periodTag}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDateFiltered = datePreset !== 'ALL' || Boolean(startDate) || Boolean(endDate);

  const getPresetLabel = (p: DatePreset): string => {
    switch (p) {
      case 'TODAY':
        return 'Hari Ini';
      case 'YESTERDAY':
        return 'Kemarin';
      case '7DAYS':
        return '7 Hari Terakhir';
      case 'THIS_MONTH':
        return 'Bulan Ini';
      case 'LAST_MONTH':
        return 'Bulan Lalu';
      case 'CUSTOM':
        return 'Kustom';
      default:
        return 'Semua';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header & Controls Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">
            Pencatatan Penjualan Nozzle
          </span>
          <h2 className="text-base font-bold text-slate-800 tracking-tight mt-0.5">
            Tabel Transaksi & Rekonsiliasi Shift
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Customizable Columns Button & Dropdown */}
          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-2xs ${
                showColumnMenu
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Atur kolom yang ingin ditampilkan atau disembunyikan"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>Atur Kolom</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 font-bold">
                {activeColumnsCount}/{totalColumnsCount}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Column Selector Popover */}
            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-30 p-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Tampilan Kolom Tabel</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColumnMenu(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={handleResetColumns}
                    className="text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Standar
                  </button>
                </div>

                {/* Columns List */}
                <div className="max-h-72 overflow-y-auto py-1 space-y-1 divide-y divide-slate-50">
                  {COLUMN_DEFINITIONS.map((col) => {
                    const isChecked = visibleColumns[col.id];
                    return (
                      <label
                        key={col.id}
                        className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColumn(col.id)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${isChecked ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                              {col.label}
                            </span>
                            <span className="text-[9px] text-slate-400 px-1 py-0.2 rounded bg-slate-100">
                              {col.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{col.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Pilihan tersimpan otomatis</span>
                  <button
                    type="button"
                    onClick={() => setShowColumnMenu(false)}
                    className="px-2.5 py-1 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Button */}
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Import data penjualan dari file Excel (.xlsx) atau CSV"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
            <span>Import Excel / CSV</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={exportToExcel}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Download Format Excel (.xlsx) sesuai data yang terfilter"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrintReportModal}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Berita Acara</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewSaleModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Shift</span>
          </button>
        </div>
      </div>

      {/* Filter Row 1: Search & Shift */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari operator, catatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white outline-none"
          >
            <option value="ALL">Semua Shift</option>
            <option value="Shift 1">Shift 1 (05.30 - 13.30)</option>
            <option value="Shift 2">Shift 2 (13.30 - 19.30)</option>
            <option value="Full Day">Full Day</option>
          </select>
        </div>
      </div>

      {/* Filter Row 2: Date Range Presets & Custom Range Pickers */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Preset Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Periode:</span>
          </span>

          {(['ALL', 'TODAY', 'YESTERDAY', '7DAYS', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'] as DatePreset[]).map((p) => {
            const isActive = datePreset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200/80'
                }`}
              >
                {getPresetLabel(p)}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Picker Fields */}
        <div className="flex flex-wrap items-center gap-2">
          {(showCustomDateInputs || datePreset === 'CUSTOM' || startDate || endDate) && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Dari</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="text-xs font-mono font-semibold text-slate-700 outline-none bg-transparent"
              />
              <span className="text-slate-300 font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('CUSTOM');
                }}
                className="text-xs font-mono font-semibold text-slate-700 outline-none bg-transparent"
              />
            </div>
          )}

          {isDateFiltered && (
            <button
              type="button"
              onClick={handleResetDateFilter}
              className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-colors"
              title="Kembalikan ke semua periode"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Summary Bar */}
      {isDateFiltered && (
        <div className="px-4 sm:px-5 py-2 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-blue-600 text-white text-[10px]">
              <Filter className="w-3 h-3" />
              Filter Aktif: {getPresetLabel(datePreset)}
            </span>
            <span className="text-xs text-blue-800">
              {startDate && endDate
                ? `${formatShortDate(startDate)} s/d ${formatShortDate(endDate)}`
                : startDate
                ? `Mulai ${formatShortDate(startDate)}`
                : endDate
                ? `Hingga ${formatShortDate(endDate)}`
                : 'Rentang Tertentu'}
            </span>
            <span className="text-blue-400">•</span>
            <span className="font-semibold text-blue-950">
              {filteredSales.length} Transaksi Ditemukan
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span>
              Vol: <strong className="text-blue-900">{formatNumber(totalLiters, 1)} L</strong>
            </span>
            <span>•</span>
            <span>
              Omzet: <strong className="text-blue-900">{formatRupiah(totalRevenue)}</strong>
            </span>
            <span>•</span>
            <span>
              Laba: <strong className="text-emerald-700">{formatRupiah(totalProfit)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              {/* Column 1: Waktu & Shift */}
              {visibleColumns.waktuShift && (
                <th className="py-3 px-5">
                  <button
                    type="button"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>Waktu & Shift</span>
                    {sortOrder === 'desc' ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
              )}

              {/* Column 2: Operator */}
              {visibleColumns.operator && <th className="py-3 px-4">Operator</th>}

              {/* Column 3: Produk BBM */}
              {visibleColumns.produk && <th className="py-3 px-4">Produk</th>}

              {/* Column 4: Totalisator */}
              {visibleColumns.totalisator && <th className="py-3 px-4 text-right">Totalisator Stand</th>}

              {/* Column 5: Sounding Tangki */}
              {visibleColumns.sounding && <th className="py-3 px-4 text-right">Sounding Tangki</th>}

              {/* Column 6: Volume Liter */}
              {visibleColumns.volume && <th className="py-3 px-4 text-right">Jumlah Liter</th>}

              {/* Column 7: Harga Satuan */}
              {visibleColumns.harga && <th className="py-3 px-4 text-right">Harga Satuan</th>}

              {/* Column 8: Omzet */}
              {visibleColumns.omzet && <th className="py-3 px-4 text-right">Total Omzet</th>}

              {/* Column 9: Margin Laba */}
              {visibleColumns.margin && <th className="py-3 px-4 text-right">Margin Dealer</th>}

              {/* Column 10: Metode Pembayaran */}
              {visibleColumns.metodeBayar && <th className="py-3 px-4 text-right">Metode Bayar</th>}

              {/* Column 11: Selisih Kasir */}
              {visibleColumns.selisihKas && <th className="py-3 px-4 text-right">Selisih Kas</th>}

              {/* Column 12: Catatan */}
              {visibleColumns.catatan && <th className="py-3 px-4">Catatan</th>}

              {/* Column 13: Aksi */}
              {visibleColumns.aksi && <th className="py-3 px-4 text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={activeColumnsCount || 1} className="py-12 text-center text-slate-400">
                  <Fuel className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Tidak ada catatan penjualan ditemukan.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isDateFiltered
                      ? 'Coba ubah atau reset filter rentang tanggal di atas.'
                      : 'Klik "+ Catat Shift" untuk membuat laporan penjualan baru.'}
                  </p>
                  {isDateFiltered && (
                    <button
                      type="button"
                      onClick={handleResetDateFilter}
                      className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Filter Periode
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Waktu & Shift */}
                  {visibleColumns.waktuShift && (
                    <td className="py-3.5 px-5 font-medium text-slate-900 whitespace-nowrap">
                      <div>{formatShortDate(sale.transactionDate)}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{sale.time}</span>
                        <span>•</span>
                        <span className="font-semibold text-blue-600">{sale.shift}</span>
                      </div>
                    </td>
                  )}

                  {/* Operator */}
                  {visibleColumns.operator && (
                    <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {sale.operatorName}
                    </td>
                  )}

                  {/* Produk BBM */}
                  {visibleColumns.produk && (
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                        {sale.productName}
                      </span>
                    </td>
                  )}

                  {/* Totalisator */}
                  {visibleColumns.totalisator && (
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {sale.meterAwal !== undefined && sale.meterAkhir !== undefined ? (
                        <div>
                          <span>
                            {formatNumber(sale.meterAwal)} → {formatNumber(sale.meterAkhir)}
                          </span>
                          {sale.soundingStickCm !== undefined && !visibleColumns.sounding && (
                            <div
                              className="flex items-center justify-end gap-1 text-[10px] text-emerald-700 font-sans font-semibold mt-0.5"
                              title={`Sounding Fisik: ${sale.soundingStickCm} cm (${sale.soundingCalculatedLiters || 0} L)`}
                            >
                              <Gauge className="w-3 h-3 text-emerald-600" />
                              <span>Stik {sale.soundingStickCm} cm ({formatNumber(sale.soundingCalculatedLiters || 0)} L)</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-400">-</span>
                          {sale.soundingStickCm !== undefined && !visibleColumns.sounding && (
                            <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-700 font-sans font-semibold mt-0.5">
                              <Gauge className="w-3 h-3 text-emerald-600" />
                              <span>Stik {sale.soundingStickCm} cm</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Sounding Fisik Tangki */}
                  {visibleColumns.sounding && (
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {sale.soundingStickCm !== undefined ? (
                        <div className="font-mono">
                          <span className="font-bold text-emerald-800">
                            {sale.soundingStickCm} cm
                          </span>
                          <div className="text-[10px] text-slate-500">
                            {formatNumber(sale.soundingCalculatedLiters || 0)} L
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  )}

                  {/* Volume Liter */}
                  {visibleColumns.volume && (
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatNumber(sale.literSold, 1)} L
                    </td>
                  )}

                  {/* Harga Satuan */}
                  {visibleColumns.harga && (
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatRupiah(sale.unitPrice)}
                    </td>
                  )}

                  {/* Total Omzet */}
                  {visibleColumns.omzet && (
                    <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatRupiah(sale.totalRevenue)}
                    </td>
                  )}

                  {/* Margin Laba */}
                  {visibleColumns.margin && (
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                      {formatRupiah(sale.totalProfit)}
                    </td>
                  )}

                  {/* Metode Pembayaran */}
                  {visibleColumns.metodeBayar && (
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                      <div className="text-slate-700">Tunai: {formatRupiah(sale.paymentCash)}</div>
                      {(sale.paymentQris > 0 || sale.paymentEdc > 0) && (
                        <div className="text-blue-600 font-semibold">
                          Non-Tunai: {formatRupiah(sale.paymentQris + sale.paymentEdc)}
                        </div>
                      )}
                    </td>
                  )}

                  {/* Selisih Kasir */}
                  {visibleColumns.selisihKas && (
                    <td className="py-3.5 px-4 text-right font-mono font-semibold whitespace-nowrap">
                      {sale.cashDifference === 0 ? (
                        <span className="text-emerald-600 font-bold">Pas (Rp 0)</span>
                      ) : sale.cashDifference > 0 ? (
                        <span className="text-emerald-700 font-bold">
                          +{formatRupiah(sale.cashDifference)}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">
                          {formatRupiah(sale.cashDifference)}
                        </span>
                      )}
                    </td>
                  )}

                  {/* Catatan */}
                  {visibleColumns.catatan && (
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-xs truncate" title={sale.notes || ''}>
                      {sale.notes || '-'}
                    </td>
                  )}

                  {/* Aksi */}
                  {visibleColumns.aksi && (
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(sale)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat Struk / Rincian"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditSale(sale)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Data Penjualan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSaleToDelete(sale)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>

          {/* Table Footer Total */}
          {filteredSales.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                {preVolumeColSpan > 0 && (
                  <td colSpan={preVolumeColSpan} className="py-3.5 px-5 text-slate-600 uppercase tracking-wider text-[11px]">
                    Total Rekap ({filteredSales.length} Catatan Transaksi)
                  </td>
                )}
                
                {/* Total Volume */}
                {visibleColumns.volume && (
                  <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-black text-sm whitespace-nowrap">
                    {formatNumber(totalLiters, 1)} L
                  </td>
                )}

                {/* Harga Satuan - empty */}
                {visibleColumns.harga && (
                  <td className="py-3.5 px-4 text-right text-slate-400">-</td>
                )}

                {/* Total Omzet */}
                {visibleColumns.omzet && (
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-black text-sm whitespace-nowrap">
                    {formatRupiah(totalRevenue)}
                  </td>
                )}

                {/* Total Margin Laba */}
                {visibleColumns.margin && (
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black whitespace-nowrap">
                    {formatRupiah(totalProfit)}
                  </td>
                )}

                {/* Metode Bayar Totals */}
                {visibleColumns.metodeBayar && (
                  <td className="py-3.5 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                    <div className="text-slate-700">T: {formatRupiah(totalCash)}</div>
                    <div className="text-blue-700">NT: {formatRupiah(totalNonCash)}</div>
                  </td>
                )}

                {/* Selisih Kas Total */}
                {visibleColumns.selisihKas && (
                  <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                    <span className={totalCashDiff === 0 ? 'text-slate-600' : totalCashDiff > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                      {totalCashDiff > 0 ? `+${formatRupiah(totalCashDiff)}` : formatRupiah(totalCashDiff)}
                    </span>
                  </td>
                )}

                {/* Catatan - empty */}
                {visibleColumns.catatan && <td></td>}

                {/* Aksi - empty */}
                {visibleColumns.aksi && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 font-mono text-xs animate-in zoom-in-95 duration-150">
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <div className="font-bold text-base text-slate-900 font-sans">PERTASHOP PERTAMINA</div>
              <div className="text-slate-500 text-[11px]">SPBU Modular Non-Subsidi</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Kode: 4P.552.09</div>
            </div>

            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal/Waktu:</span>
                <span>{selectedReceipt.transactionDate} {selectedReceipt.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shift / Operator:</span>
                <span>{selectedReceipt.shift} ({selectedReceipt.operatorName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Produk:</span>
                <span className="font-bold text-blue-700">{selectedReceipt.productName}</span>
              </div>
              {selectedReceipt.meterAwal !== undefined && (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Stand Totalisator:</span>
                  <span>{formatNumber(selectedReceipt.meterAwal)} - {formatNumber(selectedReceipt.meterAkhir || 0)}</span>
                </div>
              )}
            </div>

            <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
              <div className="flex justify-between font-bold">
                <span>Volume Terjual:</span>
                <span>{formatLiter(selectedReceipt.literSold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Harga Satuan:</span>
                <span>{formatRupiah(selectedReceipt.unitPrice)} / L</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL PENDAPATAN:</span>
                <span>{formatRupiah(selectedReceipt.totalRevenue)}</span>
              </div>
            </div>

            {/* Sounding Details in Receipt if present */}
            {selectedReceipt.soundingStickCm !== undefined && (
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px] bg-slate-50 p-2.5 rounded-lg">
                <div className="flex justify-between font-bold text-slate-800">
                  <span className="flex items-center gap-1 text-slate-700">
                    <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                    Sounding Tangki (Stik):
                  </span>
                  <span className="font-mono text-emerald-800">
                    {selectedReceipt.soundingStickCm} cm ({formatNumber(selectedReceipt.soundingCalculatedLiters || 0)} L)
                  </span>
                </div>
                {selectedReceipt.soundingVarianceLiters !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>Selisih Fisik vs Buku:</span>
                    <span className="font-bold font-mono">
                      {selectedReceipt.soundingVarianceLiters === 0
                        ? '0 L (Sesuai)'
                        : selectedReceipt.soundingVarianceLiters > 0
                        ? `+${formatNumber(selectedReceipt.soundingVarianceLiters, 1)} L (Surplus)`
                        : `${formatNumber(selectedReceipt.soundingVarianceLiters, 1)} L (Susut)`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Uji Pasta Air:</span>
                  <span>{selectedReceipt.soundingWaterCm || 0} cm (Bebas Air)</span>
                </div>
              </div>
            )}

            <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Pembayaran Tunai:</span>
                <span>{formatRupiah(selectedReceipt.paymentCash)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>QRIS / MyPertamina:</span>
                <span>{formatRupiah(selectedReceipt.paymentQris)}</span>
              </div>
              {selectedReceipt.paymentEdc > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>EDC / Kartu:</span>
                  <span>{formatRupiah(selectedReceipt.paymentEdc)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-800 font-semibold pt-1">
                <span>Uang Fisik Kasir:</span>
                <span>{formatRupiah(selectedReceipt.actualCashInHand)}</span>
              </div>
            </div>

            {selectedReceipt.notes && (
              <div className="py-2 text-[10px] text-slate-500 italic">
                Catatan: {selectedReceipt.notes}
              </div>
            )}

            <div className="text-center pt-4 text-[10px] text-slate-400">
              Pertamina Patra Niaga • Terima Kasih
            </div>

            <div className="mt-5 flex gap-2 font-sans">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="py-2 px-4 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={saleToDelete !== null}
        title="Hapus Catatan Penjualan"
        message={
          saleToDelete
            ? `Apakah Anda yakin ingin menghapus data penjualan tanggal ${formatShortDate(saleToDelete.transactionDate)} (${saleToDelete.shift}) oleh ${saleToDelete.operatorName} senilai ${formatRupiah(saleToDelete.totalRevenue)} (${formatLiter(saleToDelete.literSold)})?`
            : ''
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (saleToDelete) {
            onDeleteSale(saleToDelete.id);
            setSaleToDelete(null);
          }
        }}
        onClose={() => setSaleToDelete(null)}
      />
    </div>
  );
};

