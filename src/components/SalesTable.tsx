import React, { useState } from 'react';
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SaleRecord } from '../types';
import { formatRupiah, formatNumber, formatShortDate, formatLiter } from '../utils/formatters';

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<SaleRecord | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const filteredSales = sales
    .filter((s) => {
      const matchSearch =
        s.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchShift = selectedShift === 'ALL' || s.shift.includes(selectedShift);

      let matchDate = true;
      if (dateFilter === 'TODAY') {
        matchDate = s.transactionDate === todayStr;
      } else if (dateFilter === '7DAYS') {
        const itemDate = new Date(s.transactionDate);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        matchDate = diffDays <= 7;
      } else if (dateFilter === '30DAYS') {
        const itemDate = new Date(s.transactionDate);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        matchDate = diffDays <= 30;
      }

      return matchSearch && matchShift && matchDate;
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.transactionDate}T${a.time || '00:00'}`).getTime();
      const timeB = new Date(`${b.transactionDate}T${b.time || '00:00'}`).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

  // Totals
  const totalLiters = filteredSales.reduce((acc, s) => acc + s.literSold, 0);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);

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
      'Uji Tera (L)': s.teraTestLiters ?? 5,
      'Catatan': s.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penjualan_Pertashop');
    XLSX.writeFile(wb, `Laporan_Penjualan_Pertashop_${todayStr}.xlsx`);
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
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_Pertashop_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header & Controls Toolbar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
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
            title="Download Format Excel (.xlsx)"
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

      {/* Filter Row */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
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

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white outline-none"
          >
            <option value="ALL">Semua Periode</option>
            <option value="TODAY">Hari Ini</option>
            <option value="7DAYS">7 Hari Terakhir</option>
            <option value="30DAYS">30 Hari Terakhir</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
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
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Produk</th>
              <th className="py-3 px-4 text-right">Totalisator Stand</th>
              <th className="py-3 px-4 text-right">Jumlah Liter</th>
              <th className="py-3 px-4 text-right">Harga Satuan</th>
              <th className="py-3 px-4 text-right">Total Omzet</th>
              <th className="py-3 px-4 text-right">Margin Dealer</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <Fuel className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Tidak ada catatan penjualan ditemukan.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klik "+ Catat Shift" untuk membuat laporan penjualan baru.
                  </p>
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-medium text-slate-900 whitespace-nowrap">
                    <div>{formatShortDate(sale.transactionDate)}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{sale.time}</span>
                      <span>•</span>
                      <span className="font-semibold text-blue-600">{sale.shift}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                    {sale.operatorName}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                      {sale.productName}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                    {sale.meterAwal !== undefined && sale.meterAkhir !== undefined ? (
                      <span>
                        {formatNumber(sale.meterAwal)} → {formatNumber(sale.meterAkhir)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatNumber(sale.literSold, 1)} L
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                    {formatRupiah(sale.unitPrice)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                    {formatRupiah(sale.totalRevenue)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                    {formatRupiah(sale.totalProfit)}
                  </td>

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
                        onClick={() => {
                          if (window.confirm(`Hapus catatan penjualan shift ${sale.shift} (${sale.operatorName})?`)) {
                            onDeleteSale(sale.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Table Footer Total */}
          {filteredSales.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                <td colSpan={4} className="py-3.5 px-5 text-slate-600 uppercase tracking-wider text-[11px]">
                  Total Rekap ({filteredSales.length} Catatan Transaksi)
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-black text-sm">
                  {formatNumber(totalLiters, 1)} L
                </td>
                <td className="py-3.5 px-4 text-right text-slate-400">-</td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-black text-sm">
                  {formatRupiah(totalRevenue)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                  {formatRupiah(totalProfit)}
                </td>
                <td></td>
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
    </div>
  );
};
