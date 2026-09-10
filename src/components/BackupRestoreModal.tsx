import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  Truck,
  Fuel,
  Receipt,
  Gauge
} from 'lucide-react';
import { PertashopProfile, PertashopBackupData } from '../types';
import { StorageService } from '../utils/storage';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PertashopProfile;
  stats: {
    totalSales: number;
    totalPurchases: number;
    totalSoundings: number;
    totalExpenses: number;
    totalEmployees: number;
    totalAttendance: number;
    totalPayrolls: number;
  };
  onRestoreSuccess: (restoredData: PertashopBackupData) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  profile,
  stats,
  onRestoreSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'guide'>('backup');
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<PertashopBackupData | null>(null);
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [showRawInput, setShowRawInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    StorageService.downloadBackupJSON(profile);
    setSuccessMsg('File backup JSON berhasil diunduh ke komputer Anda!');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCopyClipboard = async () => {
    try {
      const backup = StorageService.createBackupData(profile);
      await navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      setErrorMsg('Gagal menyalin ke clipboard. Gunakan tombol Unduh File.');
    }
  };

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setParsedPreview(null);

    if (!file.name.endsWith('.json')) {
      setErrorMsg('File harus berformat .json!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const validated = StorageService.validateAndParseBackup(text);
        setParsedPreview(validated);
      } catch (err: any) {
        setErrorMsg(err.message || 'File JSON rusak atau tidak dapat dibaca.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca file dari perangkat.');
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleApplyRawJson = () => {
    setErrorMsg(null);
    if (!rawJsonInput.trim()) {
      setErrorMsg('Masukkan teks JSON terlebih dahulu.');
      return;
    }
    try {
      const validated = StorageService.validateAndParseBackup(rawJsonInput);
      setParsedPreview(validated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Format JSON tidak valid.');
    }
  };

  const handleConfirmRestore = () => {
    if (!parsedPreview) return;
    try {
      StorageService.restoreAllData(parsedPreview);
      onRestoreSuccess(parsedPreview);
      setSuccessMsg(`Data Pertashop "${parsedPreview.profile?.pertashopName || 'Utama'}" berhasil dipulihkan!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menerapkan data ke penyimpanan browser.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="backup-restore-modal-container"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/20">
              <Database className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Pusat Backup & Restore Database
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  Anti Data Hilang
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Amankan seluruh data transaksi, stok tangki, dan payroll Pertashop Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              setErrorMsg(null);
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1. Backup / Unduh Data</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('restore');
              setErrorMsg(null);
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Restore / Muat Data</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('guide');
              setErrorMsg(null);
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Panduan Export Code</span>
          </button>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Amankan Data Inputan Anda</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Data yang diinput pada peramban web ini tersimpan di memori lokal komputer Anda. Sebelum Anda melakukan <strong>Export Code (ZIP/GitHub)</strong> atau memindahkan aplikasi ke komputer kasir baru, unduh file backup ini agar seluruh data riil Anda tidak hilang.
                  </p>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Rekap Data Siap Di-Backup ({profile.pertashopName})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Penjualan Shift</span>
                      <Fuel className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalSales} <span className="text-[10px] font-normal text-slate-500">transaksi</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Pemesanan DO</span>
                      <Truck className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalPurchases} <span className="text-[10px] font-normal text-slate-500">order</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Sounding Tangki</span>
                      <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalSoundings} <span className="text-[10px] font-normal text-slate-500">catatan</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Pengeluaran</span>
                      <Receipt className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalExpenses} <span className="text-[10px] font-normal text-slate-500">pos beban</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Karyawan</span>
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalEmployees} <span className="text-[10px] font-normal text-slate-500">orang</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Log Presensi</span>
                      <Users className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalAttendance} <span className="text-[10px] font-normal text-slate-500">kehadiran</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-semibold">Slip Penggajian Bulanan</span>
                      <FileSpreadsheet className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {stats.totalPayrolls} <span className="text-[10px] font-normal text-slate-500">slip gaji</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-900 rounded-xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">Unduh Arsip Cadangan (.JSON)</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Format universal, ringan, dan dapat dimuat kembali kapan saja.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                    title="Salin JSON ke Clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Tersalin!' : 'Salin JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh File Backup (.json)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'restore' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Perhatian Pemulihan Data</h4>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    Memulihkan data akan menggantikan data yang sedang tampil di layar dengan data yang tersimpan di dalam file backup JSON yang Anda pilih.
                  </p>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 mx-auto bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  Pilih File Backup JSON dari Komputer
                </h4>
                <p className="text-slate-500 text-xs">
                  Klik untuk menelusuri file atau seret file <code>backup_pertashop_...json</code> ke sini
                </p>
              </div>

              {/* Preview of Loaded Backup */}
              {parsedPreview && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-900 text-sm">
                        File Backup Valid & Siap Dipulihkan
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                      Kode: {parsedPreview.sourceCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Nama Pertashop:</span>
                      <span className="font-bold text-slate-800">{parsedPreview.sourcePertashopName || parsedPreview.profile?.pertashopName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Waktu Pencadangan:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {parsedPreview.backupDateFormatted || parsedPreview.backupDate?.slice(0, 10)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Transaksi Penjualan:</span>
                      <span className="font-bold text-blue-700 font-mono">{parsedPreview.sales?.length || 0} Data</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Pemesanan DO:</span>
                      <span className="font-bold text-amber-700 font-mono">{parsedPreview.purchases?.length || 0} DO</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Sounding Fisik:</span>
                      <span className="font-bold text-emerald-700 font-mono">{parsedPreview.soundings?.length || 0} Catatan</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Pengeluaran & Payroll:</span>
                      <span className="font-bold text-indigo-700 font-mono">
                        {(parsedPreview.expenses?.length || 0) + (parsedPreview.payrolls?.length || 0)} Catatan
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmRestore}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Terapkan & Pulihkan Data Ini Sekarang</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Toggle Alternative Paste Raw JSON */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRawInput(!showRawInput)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{showRawInput ? 'Sembunyikan Input Teks JSON' : 'Atau tempel teks JSON manual...'}</span>
                </button>

                {showRawInput && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={4}
                      placeholder="Tempel isi file JSON di sini..."
                      value={rawJsonInput}
                      onChange={(e) => setRawJsonInput(e.target.value)}
                      className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleApplyRawJson}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Validasi Teks JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN EXPORT CODE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  Mengapa Data Tidak Otomatis Masuk ke Export Code?
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Fitur <strong>Export Code (ZIP atau GitHub)</strong> dirancang untuk mengunduh <em>Source Code</em> (aplikasi dan sistemnya).
                  Data penjualan yang Anda input disimpan di <strong>Browser LocalStorage</strong> komputer saat ini demi privasi dan kecepatan, bukan tertulis langsung ke berkas kode program fisik.
                </p>
              </div>

              <div className="space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  3 Langkah Membawa Data ke Komputer Kasir Baru:
                </span>

                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Unduh Backup JSON</strong>
                    <p className="text-slate-500 mt-0.5">
                      Buka tab <strong>"1. Backup / Unduh Data"</strong> pada menu ini, lalu klik tombol <strong>"Unduh File Backup (.json)"</strong>. Simpan file tersebut di Flashdisk atau komputer Anda.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Export Code & Jalankan di Komputer Kasir</strong>
                    <p className="text-slate-500 mt-0.5">
                      Unduh kode aplikasi via menu <strong>Export to ZIP</strong> di AI Studio. Buka folder aplikasi di komputer kasir Pertashop dan jalankan <code>run.bat</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Pulihkan (Restore) Data</strong>
                    <p className="text-slate-500 mt-0.5">
                      Di komputer kasir, buka menu <strong>"Backup & Restore"</strong> &rarr; pilih tab <strong>"Restore"</strong> &rarr; masukkan file JSON dari langkah 1. Seluruh riwayat penjualan, DO, dan absensi Anda langsung muncul seketika!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Format enkoding UTF-8 JSON kompatibel antar perangkat</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
