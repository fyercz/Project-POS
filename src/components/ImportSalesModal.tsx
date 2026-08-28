import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Layers,
  ArrowRight,
  Database,
  Fuel,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SaleRecord, Product } from '../types';
import { formatRupiah, formatNumber, formatLiter, getTodayDateString, getCurrentTimeString } from '../utils/formatters';

interface ImportSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentPrice: number;
  currentBuyPrice: number;
  onImportSales: (importedSales: SaleRecord[], mode: 'append' | 'replace', syncStock: boolean) => void;
}

interface ParsedRowPreview {
  raw: any;
  sale: SaleRecord;
  isValid: boolean;
  errors: string[];
}

export const ImportSalesModal: React.FC<ImportSalesModalProps> = ({
  isOpen,
  onClose,
  products,
  currentPrice,
  currentBuyPrice,
  onImportSales,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'file' | 'paste'>('file');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [syncStock, setSyncStock] = useState<boolean>(true);
  const [pastedText, setPastedText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRowPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultProduct = products[0] || {
    id: 'prod-pertamax-92',
    name: 'Pertamax (RON 92)',
    currentPrice: currentPrice || 12950,
    buyPrice: currentBuyPrice || 12100,
  };

  // Helper to parse date formats
  const parseDateString = (val: any): string => {
    if (!val) return getTodayDateString();
    if (typeof val === 'number') {
      // Excel serial date to JS Date
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
      }
    }
    const str = String(val).trim();
    // Check if YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Check DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, '0');
      const m = ddmmyyyy[2].padStart(2, '0');
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }
    // Attempt standard Date parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
    return getTodayDateString();
  };

  // Helper to parse time
  const parseTimeString = (val: any): string => {
    if (!val) return getCurrentTimeString();
    if (typeof val === 'number') {
      // Fraction of day
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const str = String(val).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      return str.substring(0, 5);
    }
    return getCurrentTimeString();
  };

  // Transform raw objects to SaleRecord and validate
  const processRawData = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      setParsedRows([]);
      return;
    }

    const results: ParsedRowPreview[] = rows.map((row, index) => {
      const errors: string[] = [];

      // Normalize keys by lowercase & removing spaces/underscores
      const normalized: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const cleanKey = k.toLowerCase().replace(/[\s_\-.]/g, '');
        normalized[cleanKey] = row[k];
      });

      // Date & Time
      const dateVal =
        normalized['tanggal'] ||
        normalized['tgl'] ||
        normalized['date'] ||
        normalized['transactiondate'] ||
        getTodayDateString();
      const transactionDate = parseDateString(dateVal);

      const timeVal = normalized['jam'] || normalized['waktu'] || normalized['time'] || getCurrentTimeString();
      const time = parseTimeString(timeVal);

      // Shift
      let shift = String(normalized['shift'] || 'Shift 1 (05.30 - 13.30)').trim();
      if (shift === '1' || shift.toLowerCase().includes('shift 1') || shift.toLowerCase().includes('pagi')) {
        shift = 'Shift 1 (05.30 - 13.30)';
      } else if (shift === '2' || shift.toLowerCase().includes('shift 2') || shift.toLowerCase().includes('siang')) {
        shift = 'Shift 2 (13.30 - 19.30)';
      } else if (shift.toLowerCase().includes('full')) {
        shift = 'Full Day';
      }

      // Operator
      const operatorName = String(
        normalized['operator'] ||
        normalized['namaoperator'] ||
        normalized['petugas'] ||
        normalized['kasir'] ||
        'Daslam'
      ).trim();

      // Product
      const prodNameRaw = String(normalized['produk'] || normalized['product'] || defaultProduct.name).trim();
      const matchedProduct =
        products.find(
          (p) =>
            p.name.toLowerCase().includes(prodNameRaw.toLowerCase()) ||
            p.code.toLowerCase().includes(prodNameRaw.toLowerCase())
        ) || defaultProduct;

      // Meters & Liters
      const meterAwalRaw = normalized['standawal'] || normalized['meterawal'] || normalized['awal'];
      const meterAkhirRaw = normalized['standakhir'] || normalized['meterakhir'] || normalized['akhir'];

      const meterAwal = meterAwalRaw !== undefined && meterAwalRaw !== '' ? parseFloat(meterAwalRaw) : undefined;
      const meterAkhir = meterAkhirRaw !== undefined && meterAkhirRaw !== '' ? parseFloat(meterAkhirRaw) : undefined;

      let literSold = 0;
      const literRaw = normalized['liter'] || normalized['litersold'] || normalized['jumlah'] || normalized['volume'];

      if (literRaw !== undefined && literRaw !== '') {
        literSold = parseFloat(literRaw) || 0;
      } else if (meterAwal !== undefined && meterAkhir !== undefined) {
        literSold = Math.max(0, meterAkhir - meterAwal);
      }

      if (literSold <= 0) {
        errors.push('Volume liter harus lebih besar dari 0');
      }

      // Prices
      const unitPrice =
        parseFloat(normalized['hargajual'] || normalized['harga'] || normalized['unitprice']) ||
        matchedProduct.currentPrice;
      const buyPriceSnapshot =
        parseFloat(normalized['hargabeli'] || normalized['hargatebus'] || normalized['buyprice']) ||
        matchedProduct.buyPrice;

      // Total Revenue & Profit
      const totalRevenue =
        parseFloat(normalized['omzet'] || normalized['totalomzet'] || normalized['totalrevenue'] || normalized['total']) ||
        literSold * unitPrice;
      const totalProfit =
        parseFloat(normalized['laba'] || normalized['profit'] || normalized['margin']) ||
        literSold * (unitPrice - buyPriceSnapshot);

      // Payments
      const paymentQris = parseFloat(normalized['qris'] || normalized['paymentqris'] || normalized['nontunai']) || 0;
      const paymentEdc = parseFloat(normalized['edc'] || normalized['paymentedc'] || normalized['debit']) || 0;
      const totalDigital = paymentQris + paymentEdc;

      const paymentCashRaw = normalized['tunai'] || normalized['cash'] || normalized['paymentcash'];
      const paymentCash =
        paymentCashRaw !== undefined && paymentCashRaw !== ''
          ? parseFloat(paymentCashRaw) || 0
          : Math.max(0, totalRevenue - totalDigital);

      const actualCashRaw = normalized['uangkasir'] || normalized['actualcash'] || normalized['kasfisik'];
      const actualCashInHand =
        actualCashRaw !== undefined && actualCashRaw !== ''
          ? parseFloat(actualCashRaw) || 0
          : paymentCash;

      const cashDifference = actualCashInHand - paymentCash;

      const teraTestLiters =
        parseFloat(normalized['tera'] || normalized['ujitera'] || normalized['teratestliters']) || 5;

      // Optional Sounding Fields
      const soundingStickRaw =
        normalized['soundingstick'] ||
        normalized['soundingstickcm'] ||
        normalized['stickcm'] ||
        normalized['stikcm'] ||
        normalized['tinggistick'] ||
        normalized['sounding'];
      const soundingStickCm =
        soundingStickRaw !== undefined && soundingStickRaw !== '' ? parseFloat(soundingStickRaw) : undefined;
      
      const soundingCalculatedLiters =
        soundingStickCm !== undefined
          ? parseFloat(normalized['volumesounding'] || normalized['soundingcalculatedliters']) || Math.round(soundingStickCm * 21)
          : undefined;

      const soundingWaterCm =
        parseFloat(normalized['ujipastaair'] || normalized['pastaair'] || normalized['watercm']) || 0;

      const notes = String(normalized['catatan'] || normalized['notes'] || normalized['keterangan'] || '').trim();

      const sale: SaleRecord = {
        id: `sale-imp-${Date.now()}-${index}`,
        transactionDate,
        time,
        shift,
        operatorName,
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        meterAwal,
        meterAkhir,
        literSold,
        unitPrice,
        buyPriceSnapshot,
        totalRevenue,
        totalProfit,
        paymentCash,
        paymentQris,
        paymentEdc,
        actualCashInHand,
        cashDifference,
        teraTestLiters,
        hasSounding: soundingStickCm !== undefined,
        soundingStickCm,
        soundingCalculatedLiters,
        soundingWaterCm: soundingStickCm !== undefined ? soundingWaterCm : undefined,
        notes: notes || 'Diimpor dari file data existing',
        createdAt: `${transactionDate} ${time}`,
      };

      return {
        raw: row,
        sale,
        isValid: errors.length === 0,
        errors,
      };
    });

    setParsedRows(results);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processRawData(json);
      } catch (err) {
        console.error('Error reading Excel/CSV file:', err);
        alert('Gagal membaca file Excel/CSV. Pastikan format file valid (.xlsx, .xls, .csv).');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle manual TSV/CSV text parse
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    try {
      // Split by lines
      const lines = pastedText.trim().split(/\r?\n/);
      if (lines.length === 0) return;

      // Detect delimiter (Tab or Comma or Semicolon)
      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(';')) delimiter = ';';
      else if (firstLine.includes(',')) delimiter = ',';

      const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        rows.push(rowObj);
      }

      setFileName(`Pasted Text (${rows.length} Baris)`);
      processRawData(rows);
    } catch (err) {
      console.error('Error parsing text:', err);
      alert('Format teks tidak valid. Gunakan format salinan tabel dari Excel atau CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download official Pertashop Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Tanggal': '2026-08-25',
        'Waktu': '06:00',
        'Shift': 'Shift 1 (05.30 - 13.30)',
        'Operator': 'Daslam',
        'Produk': 'Pertamax (RON 92)',
        'Stand Awal': 145530,
        'Stand Akhir': 145810,
        'Liter': 280,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai': 3426000,
        'QRIS': 200000,
        'EDC': 0,
        'Uang Kasir': 3426000,
        'Catatan': 'Lancar ramai pengendara roda dua',
      },
      {
        'Tanggal': '2026-08-25',
        'Waktu': '14:00',
        'Shift': 'Shift 2 (13.30 - 19.30)',
        'Operator': 'Angga',
        'Produk': 'Pertamax (RON 92)',
        'Stand Awal': 145810,
        'Stand Akhir': 146120,
        'Liter': 310,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai': 3614500,
        'QRIS': 400000,
        'EDC': 0,
        'Uang Kasir': 3614500,
        'Catatan': 'Shift siang cuaca cerah',
      },
      {
        'Tanggal': '2026-08-26',
        'Waktu': '06:00',
        'Shift': 'Shift 1 (05.30 - 13.30)',
        'Operator': 'Daslam',
        'Produk': 'Pertamax (RON 92)',
        'Stand Awal': 146120,
        'Stand Akhir': 146385,
        'Liter': 265,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai': 3231750,
        'QRIS': 200000,
        'EDC': 0,
        'Uang Kasir': 3231750,
        'Catatan': 'Penjualan pagi hari',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Tanggal
      { wch: 8 },  // Waktu
      { wch: 25 }, // Shift
      { wch: 15 }, // Operator
      { wch: 20 }, // Produk
      { wch: 12 }, // Stand Awal
      { wch: 12 }, // Stand Akhir
      { wch: 10 }, // Liter
      { wch: 12 }, // Harga Jual
      { wch: 12 }, // Harga Beli
      { wch: 14 }, // Tunai
      { wch: 12 }, // QRIS
      { wch: 10 }, // EDC
      { wch: 14 }, // Uang Kasir
      { wch: 30 }, // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Penjualan');
    XLSX.writeFile(workbook, 'Template_Import_Penjualan_Pertashop.xlsx');
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const totalImportLiters = validRows.reduce((sum, r) => sum + r.sale.literSold, 0);
  const totalImportRevenue = validRows.reduce((sum, r) => sum + r.sale.totalRevenue, 0);
  const totalImportProfit = validRows.reduce((sum, r) => sum + r.sale.totalProfit, 0);

  const handleCommitImport = () => {
    if (validRows.length === 0) {
      alert('Tidak ada baris data yang valid untuk diimpor.');
      return;
    }

    const salesToSave = validRows.map((r) => r.sale);
    onImportSales(salesToSave, importMode, syncStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="import-sales-modal"
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Import Data Penjualan Existing
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  Excel / CSV
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Perbarui dan sinkronkan riwayat transaksi penjualan nozzle Pertashop secara massal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Template Download Banner */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveInputTab('file')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeInputTab === 'file'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload File (.xlsx / .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInputTab('paste')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeInputTab === 'paste'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Copy-Paste Tabel</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Template Excel Resmi</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Input Method Content */}
          {activeInputTab === 'file' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? `File terpilih: ${fileName}` : 'Klik untuk memilih file atau seret file ke sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung format Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) atau <strong>.csv</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Paste (Tempel) Baris Data dari Excel / Google Sheets:
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Tanggal	Shift	Operator	Liter	Harga Jual	Tunai	QRIS&#10;2026-08-25	Shift 1	Daslam	280	12950	3426000	200000"
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  disabled={!pastedText.trim() || isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Proses Teks Tabel
                </button>
              </div>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Stat metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Baris Terdeteksi</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>{parsedRows.length}</span>
                    <span className="text-xs font-normal text-emerald-600 font-sans">
                      ({validRows.length} Valid)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-500 uppercase block">Total Volume Diimpor</span>
                  <div className="text-lg font-black text-blue-800 font-mono mt-0.5">
                    {formatLiter(totalImportLiters)}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Total Omzet Penjualan</span>
                  <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">
                    {formatRupiah(totalImportRevenue)}
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block">Estimasi Margin Pertashop</span>
                  <div className="text-lg font-black text-amber-800 font-mono mt-0.5">
                    {formatRupiah(totalImportProfit)}
                  </div>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Pratinjau Data Penjualan ({parsedRows.length} Baris)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName('');
                      setPastedText('');
                    }}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Data</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 sticky top-0 z-10 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Tanggal & Waktu</th>
                        <th className="py-2.5 px-3">Shift & Operator</th>
                        <th className="py-2.5 px-3 text-right">Stand Meter</th>
                        <th className="py-2.5 px-3 text-right">Liter</th>
                        <th className="py-2.5 px-3 text-right">Omzet</th>
                        <th className="py-2.5 px-3 text-right">Tunai / QRIS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50 hover:bg-rose-50'}
                        >
                          <td className="py-2 px-3">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700"
                                title={r.errors.join(', ')}
                              >
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{r.sale.transactionDate}</span>{' '}
                            <span className="text-slate-400 font-mono text-[11px]">{r.sale.time}</span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{r.sale.operatorName}</span>
                            <span className="text-[11px] text-blue-600 block">{r.sale.shift}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {r.sale.meterAwal !== undefined && r.sale.meterAkhir !== undefined ? (
                              <span>{formatNumber(r.sale.meterAwal)} → {formatNumber(r.sale.meterAkhir)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatNumber(r.sale.literSold, 1)} L
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            {formatRupiah(r.sale.totalRevenue)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap text-[11px]">
                            <div>T: {formatRupiah(r.sale.paymentCash)}</div>
                            {r.sale.paymentQris > 0 && (
                              <div className="text-blue-600">Q: {formatRupiah(r.sale.paymentQris)}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Pengaturan Mode Import & Stok
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      importMode === 'append'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Tambahkan Data (Append)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Data impor digabungkan dengan catatan penjualan yang sudah ada.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-bold">Gantikan Semua Data (Replace All)</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Hapus data penjualan lama dan gantikan penuh dengan data file ini.
                      </div>
                    </div>
                  </label>
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncStock}
                    onChange={(e) => setSyncStock(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                  <span>
                    Sinkronkan stok tangki fisik: Kurangi stok tangki otomatis sejumlah total volume yang diimpor (
                    <strong>{formatLiter(totalImportLiters)}</strong>)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleCommitImport}
            disabled={validRows.length === 0}
            className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Simpan & Terapkan ({validRows.length} Transaksi Penjualan)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
