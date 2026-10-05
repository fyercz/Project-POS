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
  Truck,
  Check,
  Calendar,
  Users,
  Building2,
  Sparkles,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SaleRecord, Product, PurchaseOrder, OrderVolumePecahan } from '../types';
import {
  formatRupiah,
  formatNumber,
  formatLiter,
  getTodayDateString,
  getCurrentTimeString,
  formatShortDate,
} from '../utils/formatters';

interface ImportSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentPrice: number;
  currentBuyPrice: number;
  onImportSales: (
    importedSales: SaleRecord[],
    mode: 'append' | 'replace',
    syncStock: boolean,
    importedPurchases?: PurchaseOrder[],
    syncAttendance?: boolean
  ) => void;
  onOpenHistoricalBatchModal?: () => void;
}

interface ParsedRowPreview {
  raw: any;
  sale: SaleRecord;
  isValid: boolean;
  errors: string[];
}

interface ParsedDORowPreview {
  raw: any;
  order: PurchaseOrder;
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
  onOpenHistoricalBatchModal,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'file' | 'paste'>('file');
  const [pasteType, setPasteType] = useState<'sales' | 'do'>('sales');
  const [previewTab, setPreviewTab] = useState<'sales' | 'do'>('sales');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [syncStock, setSyncStock] = useState<boolean>(true);
  const [syncAttendance, setSyncAttendance] = useState<boolean>(true);
  const [pastedText, setPastedText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRowPreview[]>([]);
  const [parsedDoRows, setParsedDoRows] = useState<ParsedDORowPreview[]>([]);
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
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyy) {
      const d = ddmmyyyy[1].padStart(2, '0');
      const m = ddmmyyyy[2].padStart(2, '0');
      const y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }
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
  const processRawSalesData = (rows: any[]): ParsedRowPreview[] => {
    if (!rows || rows.length === 0) return [];

    return rows.map((row, index) => {
      const errors: string[] = [];

      const normalized: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const cleanKey = k.toLowerCase().replace(/[\s_\-.]/g, '');
        normalized[cleanKey] = row[k];
      });

      const dateVal =
        normalized['tanggal'] ||
        normalized['tgl'] ||
        normalized['date'] ||
        normalized['transactiondate'] ||
        getTodayDateString();
      const transactionDate = parseDateString(dateVal);

      const timeVal = normalized['jam'] || normalized['waktu'] || normalized['time'] || getCurrentTimeString();
      const time = parseTimeString(timeVal);

      let shift = String(normalized['shift'] || 'Shift 1 (05.30 - 13.30)').trim();
      if (shift === '1' || shift.toLowerCase().includes('shift 1') || shift.toLowerCase().includes('pagi')) {
        shift = 'Shift 1 (05.30 - 13.30)';
      } else if (shift === '2' || shift.toLowerCase().includes('shift 2') || shift.toLowerCase().includes('siang')) {
        shift = 'Shift 2 (13.30 - 19.30)';
      } else if (shift.toLowerCase().includes('full')) {
        shift = 'Full Day';
      }

      const operatorName = String(
        normalized['operator'] ||
        normalized['namaoperator'] ||
        normalized['petugas'] ||
        normalized['kasir'] ||
        'Daslam'
      ).trim();

      const prodNameRaw = String(normalized['produk'] || normalized['product'] || defaultProduct.name).trim();
      const matchedProduct =
        products.find(
          (p) =>
            p.name.toLowerCase().includes(prodNameRaw.toLowerCase()) ||
            p.code.toLowerCase().includes(prodNameRaw.toLowerCase())
        ) || defaultProduct;

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
        errors.push('Volume liter penjualan harus lebih besar dari 0');
      }

      const unitPrice =
        parseFloat(normalized['hargajual'] || normalized['harga'] || normalized['unitprice']) ||
        matchedProduct.currentPrice;
      const buyPriceSnapshot =
        parseFloat(normalized['hargabeli'] || normalized['hargatebus'] || normalized['buyprice']) ||
        matchedProduct.buyPrice;

      const totalRevenue =
        parseFloat(normalized['omzet'] || normalized['totalomzet'] || normalized['totalrevenue'] || normalized['total']) ||
        literSold * unitPrice;
      const totalProfit =
        parseFloat(normalized['laba'] || normalized['profit'] || normalized['margin']) ||
        literSold * (unitPrice - buyPriceSnapshot);

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
        notes: notes || 'Diimpor dari file batch penjualan 1 bulan',
        createdAt: `${transactionDate} ${time}`,
      };

      return {
        raw: row,
        sale,
        isValid: errors.length === 0,
        errors,
      };
    });
  };

  // Transform raw objects to PurchaseOrder (DO) and validate
  const processRawDOData = (rows: any[]): ParsedDORowPreview[] => {
    if (!rows || rows.length === 0) return [];

    return rows.map((row, index) => {
      const errors: string[] = [];

      const normalized: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const cleanKey = k.toLowerCase().replace(/[\s_\-.]/g, '');
        normalized[cleanKey] = row[k];
      });

      const poNumber = String(
        normalized['nodo'] ||
        normalized['nomordo'] ||
        normalized['nopo'] ||
        normalized['nomorpo'] ||
        normalized['ponumber'] ||
        normalized['deliveryorder'] ||
        `DO-IMP-${Date.now().toString().slice(-4)}-${index + 1}`
      ).trim();

      const soPertaminaNumber = String(
        normalized['noso'] || normalized['nomorso'] || normalized['sopertamina'] || ''
      ).trim();

      const doPertaminaNumber = String(
        normalized['dopertamina'] || normalized['nodo'] || normalized['nomordo'] || poNumber
      ).trim();

      const orderDateVal =
        normalized['tanggalorder'] ||
        normalized['tanggal'] ||
        normalized['tgl'] ||
        normalized['orderdate'] ||
        getTodayDateString();
      const orderDate = parseDateString(orderDateVal);

      const actualDeliveryDateVal =
        normalized['tanggaltiba'] ||
        normalized['tanggalterima'] ||
        normalized['tglterima'] ||
        normalized['actualdeliverydate'] ||
        orderDate;
      const actualDeliveryDate = parseDateString(actualDeliveryDateVal);

      const prodNameRaw = String(normalized['produk'] || normalized['product'] || defaultProduct.name).trim();
      const matchedProduct =
        products.find(
          (p) =>
            p.name.toLowerCase().includes(prodNameRaw.toLowerCase()) ||
            p.code.toLowerCase().includes(prodNameRaw.toLowerCase())
        ) || defaultProduct;

      // Volume parsing (Liters vs KL)
      let volumeLiters = 0;
      let volumeKL: OrderVolumePecahan = 2;

      const rawVol =
        normalized['volumeliter'] ||
        normalized['volume'] ||
        normalized['liter'] ||
        normalized['jumlah'] ||
        normalized['volumeliters'];
      const rawKL = normalized['volumekl'] || normalized['kl'] || normalized['pecahan'];

      if (rawVol !== undefined && rawVol !== '') {
        const parsedV = parseFloat(rawVol) || 0;
        if (parsedV <= 10) {
          // Inputted in KL e.g. 2 or 3
          volumeKL = Math.min(5, Math.max(1, Math.round(parsedV))) as OrderVolumePecahan;
          volumeLiters = volumeKL * 1000;
        } else {
          volumeLiters = parsedV;
          volumeKL = Math.min(5, Math.max(1, Math.round(parsedV / 1000))) as OrderVolumePecahan;
        }
      } else if (rawKL !== undefined && rawKL !== '') {
        const parsedKL = parseFloat(rawKL) || 2;
        volumeKL = Math.min(5, Math.max(1, Math.round(parsedKL))) as OrderVolumePecahan;
        volumeLiters = volumeKL * 1000;
      } else {
        volumeKL = 2;
        volumeLiters = 2000;
      }

      if (volumeLiters <= 0) {
        errors.push('Volume DO harus lebih dari 0 Liter');
      }

      const buyPricePerLiter =
        parseFloat(normalized['hargabeli'] || normalized['hargatebus'] || normalized['buyprice'] || normalized['harga']) ||
        matchedProduct.buyPrice ||
        12100;

      const totalAmount =
        parseFloat(normalized['total'] || normalized['totalamount'] || normalized['totalharga'] || normalized['nominal']) ||
        volumeLiters * buyPricePerLiter;

      const supplyDepot = String(
        normalized['tbbm'] ||
        normalized['depot'] ||
        normalized['supplydepot'] ||
        normalized['terminal'] ||
        'TBBM Rewulu / Boyolali'
      ).trim();

      const truckPlateNumber = String(
        normalized['plat'] ||
        normalized['plattruk'] ||
        normalized['truckplate'] ||
        normalized['platnomor'] ||
        'AD 8492 FB'
      ).trim();

      const driverName = String(
        normalized['supir'] ||
        normalized['driver'] ||
        normalized['namasupir'] ||
        normalized['namadriver'] ||
        'Pak Joko Santoso'
      ).trim();

      const rawStatus = String(normalized['status'] || 'SELESAI').toUpperCase().trim();
      const status = rawStatus === 'DIPESAN' || rawStatus === 'PENGIRIMAN' || rawStatus === 'BATAL' ? rawStatus : 'SELESAI';

      const actualLitersReceived =
        parseFloat(normalized['literditerima'] || normalized['actualliters'] || normalized['volumeterima']) ||
        volumeLiters;

      const varianceLiters = actualLitersReceived - volumeLiters;

      const notes = String(normalized['catatan'] || normalized['notes'] || normalized['keterangan'] || '').trim();

      const order: PurchaseOrder = {
        id: `po-imp-${Date.now()}-${index}`,
        poNumber,
        soPertaminaNumber,
        doPertaminaNumber,
        orderDate,
        estimatedDeliveryDate: actualDeliveryDate,
        actualDeliveryDate,
        productId: matchedProduct.id,
        productName: matchedProduct.name,
        volumeKL,
        volumeLiters,
        buyPricePerLiter,
        totalAmount,
        supplyDepot,
        truckPlateNumber,
        driverName,
        status,
        actualLitersReceived,
        effectiveStockAdded: actualLitersReceived,
        varianceLiters,
        notes: notes || `Penerimaan BBM DO Pertamina (${volumeLiters} L / ${volumeKL} KL)`,
        createdAt: `${orderDate} 12:00`,
        completedAt: `${actualDeliveryDate} 14:00`,
      };

      return {
        raw: row,
        order,
        isValid: errors.length === 0,
        errors,
      };
    });
  };

  // Handle file upload with multi-sheet support
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let detectedSalesRows: any[] = [];
        let detectedDoRows: any[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const lowerName = sheetName.toLowerCase();
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (
            lowerName.includes('do') ||
            lowerName.includes('delivery') ||
            lowerName.includes('penerimaan') ||
            lowerName.includes('pembelian') ||
            lowerName.includes('po') ||
            lowerName.includes('order')
          ) {
            detectedDoRows = [...detectedDoRows, ...json];
          } else if (
            lowerName.includes('penjualan') ||
            lowerName.includes('sales') ||
            lowerName.includes('transaksi') ||
            lowerName.includes('shift')
          ) {
            detectedSalesRows = [...detectedSalesRows, ...json];
          } else {
            // Check headers in first sheet if not matched by sheet name
            if (json.length > 0) {
              const firstRowKeys = Object.keys(json[0]).map((k) => k.toLowerCase().replace(/[\s_]/g, ''));
              const isDoSheet = firstRowKeys.some((k) => k.includes('nodo') || k.includes('tbbm') || k.includes('volumekl'));
              if (isDoSheet) {
                detectedDoRows = [...detectedDoRows, ...json];
              } else {
                detectedSalesRows = [...detectedSalesRows, ...json];
              }
            }
          }
        });

        const parsedSales = processRawSalesData(detectedSalesRows);
        const parsedDO = processRawDOData(detectedDoRows);

        setParsedRows(parsedSales);
        setParsedDoRows(parsedDO);

        if (parsedSales.length > 0) {
          setPreviewTab('sales');
        } else if (parsedDO.length > 0) {
          setPreviewTab('do');
        }
      } catch (err) {
        console.error('Error reading Excel/CSV file:', err);
        alert('Gagal membaca file. Pastikan format file valid (.xlsx, .xls, .csv).');
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
      const lines = pastedText.trim().split(/\r?\n/);
      if (lines.length === 0) return;

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

      setFileName(`Pasted Text (${rows.length} Baris - ${pasteType === 'sales' ? 'Penjualan' : 'Delivery Order'})`);

      if (pasteType === 'sales') {
        const parsed = processRawSalesData(rows);
        setParsedRows(parsed);
        setPreviewTab('sales');
      } else {
        const parsed = processRawDOData(rows);
        setParsedDoRows(parsed);
        setPreviewTab('do');
      }
    } catch (err) {
      console.error('Error parsing text:', err);
      alert('Format teks tidak valid. Gunakan format salinan tabel dari Excel atau CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download official Pertashop Multi-Sheet Excel Template (Sales Batch 1 Bulan & DO)
  const handleDownloadTemplate = () => {
    // 1. Sheet Data Penjualan 1 Bulan Penuh (Contoh 31 Hari Lengkap Shift 1 & 2)
    const salesTemplateData: any[] = [];
    let currentStand = 145500;
    const yearMonth = '2026-08';

    for (let day = 1; day <= 31; day++) {
      const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
      
      // Shift 1 (Pagi)
      const shift1Liters = 260 + (day % 7) * 15;
      const standAkhir1 = currentStand + shift1Liters;
      const omzet1 = shift1Liters * 12950;
      const qris1 = day % 2 === 0 ? 200000 : 150000;
      const tunai1 = omzet1 - qris1;

      salesTemplateData.push({
        'Tanggal': dateStr,
        'Waktu': '06:00',
        'Shift': 'Shift 1 (05.30 - 13.30)',
        'Operator': 'Daslam',
        'Produk': 'Pertamax (RON 92)',
        'Stand Awal': currentStand,
        'Stand Akhir': standAkhir1,
        'Liter': shift1Liters,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai': tunai1,
        'QRIS': qris1,
        'EDC': 0,
        'Uang Kasir': tunai1,
        'Catatan': `Shift 1 Tgl ${day} cuaca cerah`,
      });
      currentStand = standAkhir1;

      // Shift 2 (Siang/Sore)
      const shift2Liters = 280 + ((day + 3) % 6) * 18;
      const standAkhir2 = currentStand + shift2Liters;
      const omzet2 = shift2Liters * 12950;
      const qris2 = day % 3 === 0 ? 300000 : 250000;
      const tunai2 = omzet2 - qris2;

      salesTemplateData.push({
        'Tanggal': dateStr,
        'Waktu': '14:00',
        'Shift': 'Shift 2 (13.30 - 19.30)',
        'Operator': 'Angga',
        'Produk': 'Pertamax (RON 92)',
        'Stand Awal': currentStand,
        'Stand Akhir': standAkhir2,
        'Liter': shift2Liters,
        'Harga Jual': 12950,
        'Harga Beli': 12100,
        'Tunai': tunai2,
        'QRIS': qris2,
        'EDC': 0,
        'Uang Kasir': tunai2,
        'Catatan': `Shift 2 Tgl ${day} arus kendaraan ramai`,
      });
      currentStand = standAkhir2;
    }

    // 2. Sheet Delivery Order (DO) Pertamina Selama 1 Bulan (Contoh 8x Pengiriman DO @ 2 KL / 2.000 L)
    const doTemplateData = [
      {
        'Nomor DO': 'DO-PTM-202608-001',
        'Nomor SO': 'SO-99211',
        'Tanggal DO': '2026-08-01',
        'Tanggal Tiba': '2026-08-01',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'AD 8492 FB',
        'Nama Driver': 'Pak Joko Santoso',
        'Status': 'SELESAI',
        'Catatan': 'DO Awal Bulan - Segel Utuh & Tera Pas',
      },
      {
        'Nomor DO': 'DO-PTM-202608-002',
        'Nomor SO': 'SO-99218',
        'Tanggal DO': '2026-08-05',
        'Tanggal Tiba': '2026-08-05',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'AB 9102 CD',
        'Nama Driver': 'Pak Bambang',
        'Status': 'SELESAI',
        'Catatan': 'Penerimaan BBM kuota reguler',
      },
      {
        'Nomor DO': 'DO-PTM-202608-003',
        'Nomor SO': 'SO-99226',
        'Tanggal DO': '2026-08-09',
        'Tanggal Tiba': '2026-08-09',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'AD 8492 FB',
        'Nama Driver': 'Pak Joko Santoso',
        'Status': 'SELESAI',
        'Catatan': 'Bongkar siang hari lancar',
      },
      {
        'Nomor DO': 'DO-PTM-202608-004',
        'Nomor SO': 'SO-99234',
        'Tanggal DO': '2026-08-14',
        'Tanggal Tiba': '2026-08-14',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'B 9421 KGA',
        'Nama Driver': 'Pak Slamet',
        'Status': 'SELESAI',
        'Catatan': 'Penebusan kuota pertengahan bulan',
      },
      {
        'Nomor DO': 'DO-PTM-202608-005',
        'Nomor SO': 'SO-99242',
        'Tanggal DO': '2026-08-18',
        'Tanggal Tiba': '2026-08-18',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'AD 8492 FB',
        'Nama Driver': 'Pak Joko Santoso',
        'Status': 'SELESAI',
        'Catatan': 'Kondisi BBM bersih tidak ada air',
      },
      {
        'Nomor DO': 'DO-PTM-202608-006',
        'Nomor SO': 'SO-99250',
        'Tanggal DO': '2026-08-22',
        'Tanggal Tiba': '2026-08-22',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'AB 9102 CD',
        'Nama Driver': 'Pak Bambang',
        'Status': 'SELESAI',
        'Catatan': 'Bongkar malam aman',
      },
      {
        'Nomor DO': 'DO-PTM-202608-007',
        'Nomor SO': 'SO-99258',
        'Tanggal DO': '2026-08-26',
        'Tanggal Tiba': '2026-08-26',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'B 9421 KGA',
        'Nama Driver': 'Pak Slamet',
        'Status': 'SELESAI',
        'Catatan': 'Pasokan lancar akhir pekan',
      },
      {
        'Nomor DO': 'DO-PTM-202608-008',
        'Nomor SO': 'SO-99265',
        'Tanggal DO': '2026-08-30',
        'Tanggal Tiba': '2026-08-30',
        'Produk': 'Pertamax (RON 92)',
        'Volume KL': 2,
        'Volume Liter': 2000,
        'Harga Beli': 12100,
        'Total Nominal': 24200000,
        'TBBM Depot': 'TBBM Rewulu / Boyolali',
        'Plat Mobil Tangki': 'AD 8492 FB',
        'Nama Driver': 'Pak Joko Santoso',
        'Status': 'SELESAI',
        'Catatan': 'DO Penutup Akhir Bulan',
      },
    ];

    const wsSales = XLSX.utils.json_to_sheet(salesTemplateData);
    wsSales['!cols'] = [
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

    const wsDO = XLSX.utils.json_to_sheet(doTemplateData);
    wsDO['!cols'] = [
      { wch: 20 }, // Nomor DO
      { wch: 15 }, // Nomor SO
      { wch: 13 }, // Tanggal DO
      { wch: 13 }, // Tanggal Tiba
      { wch: 20 }, // Produk
      { wch: 12 }, // Volume KL
      { wch: 14 }, // Volume Liter
      { wch: 12 }, // Harga Beli
      { wch: 16 }, // Total Nominal
      { wch: 24 }, // TBBM Depot
      { wch: 16 }, // Plat Mobil Tangki
      { wch: 18 }, // Nama Driver
      { wch: 12 }, // Status
      { wch: 32 }, // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsSales, 'Data_Penjualan_1_Bulan');
    XLSX.utils.book_append_sheet(workbook, wsDO, 'Data_DO_Pertamina');
    XLSX.writeFile(workbook, 'Template_Batch_Penjualan_1_Bulan_dan_DO_Pertashop.xlsx');
  };

  const validSalesRows = parsedRows.filter((r) => r.isValid);
  const totalImportLiters = validSalesRows.reduce((sum, r) => sum + r.sale.literSold, 0);
  const totalImportRevenue = validSalesRows.reduce((sum, r) => sum + r.sale.totalRevenue, 0);
  const totalImportProfit = validSalesRows.reduce((sum, r) => sum + r.sale.totalProfit, 0);

  const validDoRows = parsedDoRows.filter((r) => r.isValid);
  const totalDoLiters = validDoRows.reduce((sum, r) => sum + r.order.volumeLiters, 0);
  const totalDoKL = validDoRows.reduce((sum, r) => sum + r.order.volumeKL, 0);
  const totalDoAmount = validDoRows.reduce((sum, r) => sum + r.order.totalAmount, 0);

  const handleCommitImport = () => {
    if (validSalesRows.length === 0 && validDoRows.length === 0) {
      alert('Tidak ada baris data valid untuk diimpor. Silakan periksa kembali file atau teks yang dimasukkan.');
      return;
    }

    const salesToSave = validSalesRows.map((r) => r.sale);
    const purchasesToSave = validDoRows.map((r) => r.order);

    onImportSales(salesToSave, importMode, syncStock, purchasesToSave, syncAttendance);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="import-sales-modal"
        className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Import Batch 1 Bulan & DO Pertamina</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">
                  Multi-Sheet Excel / CSV
                </span>
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Impor data penjualan massal 1 bulan penuh (Shift 1 & 2) beserta riwayat penerimaan BBM Delivery Order (DO) Pertamina
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

        {/* Tab Selection & Template Download Banner */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveInputTab('file')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeInputTab === 'file'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload File Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveInputTab('paste')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
            className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Download Template Excel Resmi: Berisi 2 Sheet (Penjualan 1 Bulan & DO Pertamina)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Template Excel (2 Sheet: Penjualan & DO)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Banner Solusi Pertashop Berjalan: Rekap Bulanan Historis */}
          {onOpenHistoricalBatchModal && (
            <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3 text-indigo-950">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-indigo-950 block text-xs">
                    Pertashop Sudah Berjalan & Ingin Input Data Bulan-Bulan Lalu?
                  </span>
                  <span className="text-[11px] text-indigo-800 block mt-0.5">
                    Gunakan fitur <strong>Input Rekap Bulanan (Data Lampau)</strong> untuk memasukkan data secara batch 1 baris per bulan tanpa perlu input harian satu per satu.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistoricalBatchModal();
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
              >
                <span>Buka Input Rekap Bulanan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* File Upload Zone */}
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
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/30'
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
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">
                {fileName ? fileName : 'Klik atau seret file Excel / CSV ke sini'}
              </p>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Mendukung file Excel multi-sheet otomatis (Sheet 1: <strong>Penjualan 1 Bulan</strong> dan Sheet 2: <strong>Delivery Order DO</strong>). Sistem akan memilah kedua jenis data secara cerdas.
              </p>
            </div>
          ) : (
            /* Paste Zone */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Pilih Data yang Sedang Disalin:
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPasteType('sales')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      pasteType === 'sales'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⛽ Data Penjualan (1 Bulan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasteType('do')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      pasteType === 'do'
                        ? 'bg-white text-teal-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚚 Delivery Order (DO)
                  </button>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={
                  pasteType === 'sales'
                    ? 'Paste salinan baris tabel penjualan dari Excel / Google Sheet di sini...\nFormat kolom: Tanggal | Shift | Operator | Liter | Stand Awal | Stand Akhir | Tunai | QRIS ...'
                    : 'Paste salinan baris Delivery Order (DO) di sini...\nFormat kolom: Nomor DO | Tanggal DO | Tanggal Tiba | Volume Liter/KL | Harga Beli | Total Nominal | Plat Truk | Driver ...'
                }
                rows={5}
                className="w-full px-3.5 py-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">
                  💡 Tips: Salin seluruh baris termasuk baris judul header dari Excel, lalu klik tombol Proses.
                </span>
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  disabled={!pastedText.trim() || isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Proses Teks Tabel {pasteType === 'sales' ? 'Penjualan' : 'DO'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Batch Summary Bar */}
          {(parsedRows.length > 0 || parsedDoRows.length > 0) && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Rangkuman Batch 1 Bulan Terdeteksi:
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      Verifikasi data penjualan harian dan pasokan DO sebelum disimpan ke sistem
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Penjualan Volume */}
                <div className="bg-white/80 border border-emerald-200/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Penjualan BBM Terjual
                  </span>
                  <span className="text-base font-black font-mono text-emerald-700 block mt-0.5">
                    {formatNumber(totalImportLiters, 1)} L
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {validSalesRows.length} transaksi shift
                  </span>
                </div>

                {/* Omzet Penjualan */}
                <div className="bg-white/80 border border-emerald-200/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Total Omzet Penjualan
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 block mt-0.5">
                    {formatRupiah(totalImportRevenue)}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    Est. Margin: {formatRupiah(totalImportProfit)}
                  </span>
                </div>

                {/* Delivery Order BBM Masuk */}
                <div className="bg-white/80 border border-teal-200/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Pasokan DO Pertamina Masuk
                  </span>
                  <span className="text-base font-black font-mono text-teal-700 block mt-0.5">
                    {formatNumber(totalDoLiters)} L ({totalDoKL} KL)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {validDoRows.length} pengiriman DO
                  </span>
                </div>

                {/* Nilai Tebusan DO */}
                <div className="bg-white/80 border border-teal-200/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    Total Penebusan DO
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 block mt-0.5">
                    {formatRupiah(totalDoAmount)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Harga tebus rata-rata
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Preview Navigation Tabs */}
          {(parsedRows.length > 0 || parsedDoRows.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('sales')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewTab === 'sales'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Fuel className="w-3.5 h-3.5" />
                    <span>Data Penjualan ({validSalesRows.length} Baris)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewTab('do')}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                      previewTab === 'do'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Delivery Order DO ({validDoRows.length} DO)</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500">
                  {previewTab === 'sales'
                    ? `${validSalesRows.length} valid / ${parsedRows.length} terbaca`
                    : `${validDoRows.length} valid / ${parsedDoRows.length} terbaca`}
                </span>
              </div>

              {/* Table Preview Sales */}
              {previewTab === 'sales' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-[11px] font-sans">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tanggal & Shift</th>
                        <th className="py-2 px-3">Operator</th>
                        <th className="py-2 px-3 text-right">Stand Meter</th>
                        <th className="py-2 px-3 text-right">Liter</th>
                        <th className="py-2 px-3 text-right">Omzet</th>
                        <th className="py-2 px-3 text-right">Tunai</th>
                        <th className="py-2 px-3 text-right">QRIS / EDC</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Belum ada baris data penjualan yang terdeteksi dalam file atau teks.
                          </td>
                        </tr>
                      ) : (
                        parsedRows.slice(0, 100).map((r, i) => (
                          <tr key={i} className={`hover:bg-slate-50 ${!r.isValid ? 'bg-rose-50/60' : ''}`}>
                            <td className="py-2 px-3">
                              <span className="font-bold font-mono text-slate-800 block">
                                {r.sale.transactionDate}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {r.sale.shift}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-700">
                              {r.sale.operatorName}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {r.sale.meterAwal !== undefined && r.sale.meterAkhir !== undefined
                                ? `${r.sale.meterAwal} ➜ ${r.sale.meterAkhir}`
                                : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatNumber(r.sale.literSold, 1)} L
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-900">
                              {formatRupiah(r.sale.totalRevenue)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatRupiah(r.sale.paymentCash)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatRupiah(r.sale.paymentQris + r.sale.paymentEdc)}
                            </td>
                            <td className="py-2 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[10px]" title={r.errors.join(', ')}>
                                  <AlertCircle className="w-3 h-3" /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table Preview DO */}
              {previewTab === 'do' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-[11px] font-sans">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Nomor DO</th>
                        <th className="py-2 px-3">Tgl Tiba / Kirim</th>
                        <th className="py-2 px-3 text-right">Volume BBM</th>
                        <th className="py-2 px-3 text-right">Harga Tebus</th>
                        <th className="py-2 px-3 text-right">Total Nominal</th>
                        <th className="py-2 px-3">Truk & Supir</th>
                        <th className="py-2 px-3">Depot TBBM</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedDoRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Belum ada baris data Delivery Order (DO) yang terdeteksi. Gunakan Sheet 2 "Data_DO_Pertamina" pada template untuk mengimpor DO sekaligus.
                          </td>
                        </tr>
                      ) : (
                        parsedDoRows.map((r, i) => (
                          <tr key={i} className={`hover:bg-slate-50 ${!r.isValid ? 'bg-rose-50/60' : ''}`}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">
                              {r.order.doPertaminaNumber || r.order.poNumber}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {r.order.actualDeliveryDate || r.order.orderDate}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-teal-700">
                              {formatNumber(r.order.volumeLiters)} L ({r.order.volumeKL} KL)
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatRupiah(r.order.buyPricePerLiter)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(r.order.totalAmount)}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <span className="font-bold block">{r.order.truckPlateNumber || '-'}</span>
                              <span className="text-[10px] text-slate-500 block">{r.order.driverName || '-'}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-xs">
                              {r.order.supplyDepot}
                            </td>
                            <td className="py-2 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-teal-700 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[10px]" title={r.errors.join(', ')}>
                                  <AlertCircle className="w-3 h-3" /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Execution Options */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Opsi & Sinkronisasi Sistem:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Option Mode */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Metode Penyimpanan Data:</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700">Tambahkan ke Data Yang Ada (Append)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700">Ganti Seluruh Data (Replace)</span>
                  </label>
                </div>
              </div>

              {/* Sync Options */}
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncStock}
                    onChange={(e) => setSyncStock(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Sinkronkan Saldo Stok Tangki Modular
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Otomatis menambah stok dari DO BBM yang diterima dan mengurangi volume penjualan nozzle.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncAttendance}
                    onChange={(e) => setSyncAttendance(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Sinkronkan Shift ke Absensi Karyawan
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Otomatis merekap kehadiran & lembur operator untuk persiapan <strong>hitung gaji otomatis pada 2 hari terakhir bulan</strong>.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleCommitImport}
            disabled={validSalesRows.length === 0 && validDoRows.length === 0}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {validSalesRows.length > 0 && validDoRows.length > 0
                ? `Simpan ${validSalesRows.length} Penjualan & ${validDoRows.length} DO ke Sistem`
                : validSalesRows.length > 0
                ? `Simpan ${validSalesRows.length} Transaksi Penjualan`
                : validDoRows.length > 0
                ? `Simpan ${validDoRows.length} Delivery Order (DO)`
                : 'Pilih Data Terlebih Dahulu'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
