import React, { useState } from 'react';
import { X, Printer, Download, Calendar, Fuel, Check, Receipt } from 'lucide-react';
import { SaleRecord, PurchaseOrder, TankConfig, PertashopProfile, Product, ExpenseRecord } from '../types';
import { formatRupiah, formatNumber, formatLiter, formatDateIndo, getTodayDateString } from '../utils/formatters';

interface PrintDailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PertashopProfile;
  products: Product[];
  sales: SaleRecord[];
  purchases: PurchaseOrder[];
  tank: TankConfig;
  expenses?: ExpenseRecord[];
}

export const PrintDailyReportModal: React.FC<PrintDailyReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  products,
  sales,
  purchases,
  tank,
  expenses = [],
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  if (!isOpen) return null;

  // Filter sales & expenses for the selected date
  const daySales = sales.filter((s) => s.transactionDate === selectedDate);
  const dayPurchases = purchases.filter((p) => (p.actualDeliveryDate === selectedDate || p.orderDate === selectedDate) && p.status === 'SELESAI');
  const dayExpenses = expenses.filter((e) => e.date === selectedDate);

  const totalLiterSold = daySales.reduce((acc, s) => acc + s.literSold, 0);
  const totalRevenue = daySales.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalProfit = daySales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalCash = daySales.reduce((acc, s) => acc + s.paymentCash, 0);
  const totalQris = daySales.reduce((acc, s) => acc + s.paymentQris, 0);
  const totalEdc = daySales.reduce((acc, s) => acc + s.paymentEdc, 0);
  const totalActualCash = daySales.reduce((acc, s) => acc + s.actualCashInHand, 0);
  const totalCashDiff = totalActualCash - totalCash;

  const totalDayExpenses = dayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalKasHarianExpenses = dayExpenses.filter(e => e.paymentSource === 'KAS_HARIAN').reduce((acc, e) => acc + e.amount, 0);
  const netRemittance = totalActualCash - totalKasHarianExpenses;

  const totalReceivedLiters = dayPurchases.reduce((acc, p) => acc + (p.actualLitersReceived || p.volumeLiters), 0);


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div
        id="print-report-modal-container"
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4"
      >
        {/* Modal Controls Bar (hidden during print) */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold">Cetak Laporan Harian Pertashop (LHO)</h2>
              <p className="text-xs text-slate-400">Format Resmi Berita Acara Harian & Rekonsiliasi Kas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-medium outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Sheet */}
        <div className="p-6 sm:p-10 bg-white text-slate-900 font-sans text-xs space-y-6 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 print:m-0">
          {/* KOP Surat Pertashop */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xl font-black tracking-tight text-blue-900 font-serif">
                PERTAMINA PATRA NIAGA
              </div>
              <div className="text-sm font-bold uppercase text-slate-800 mt-0.5">
                {profile.pertashopName}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Kode Registrasi Pertashop: <strong className="font-mono">{profile.pertashopCode}</strong> • {profile.location}
              </div>
              <div className="text-xs text-slate-500">
                Supply Point: {profile.tbbmDepot} • Pengelola: {profile.ownerName}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Dokumen Resmi Operasional
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                LAPORAN HARIAN PERTASHOP
              </div>
              <div className="text-xs font-bold text-blue-800 mt-0.5">
                {formatDateIndo(selectedDate)}
              </div>
            </div>
          </div>

          {/* Section 1: Ringkasan Penjualan per Shift */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              I. Rincian Penjualan Nozzle per Shift
            </h3>

            <table className="w-full border-collapse border border-slate-300 text-left">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">Shift & Operator</th>
                  <th className="p-2 border-r border-slate-300">Produk</th>
                  <th className="p-2 text-right border-r border-slate-300">Stand Awal</th>
                  <th className="p-2 text-right border-r border-slate-300">Stand Akhir</th>
                  <th className="p-2 text-right border-r border-slate-300">Uji Tera (L)</th>
                  <th className="p-2 text-right border-r border-slate-300">Liter Terjual</th>
                  <th className="p-2 text-right border-r border-slate-300">Harga/L</th>
                  <th className="p-2 text-right">Total Omzet</th>
                </tr>
              </thead>
              <tbody>
                {daySales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                      Tidak ada transaksi penjualan yang tercatat pada tanggal {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  daySales.map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 font-medium">
                        <div>{sale.shift} ({sale.operatorName})</div>
                        {sale.soundingStickCm !== undefined && (
                          <div className="text-[10px] text-emerald-700 font-normal">
                            Sounding: {sale.soundingStickCm} cm ({formatNumber(sale.soundingCalculatedLiters || 0)} L)
                            {sale.soundingVarianceLiters !== undefined && sale.soundingVarianceLiters !== 0 && (
                              <span> • Selisih: {sale.soundingVarianceLiters > 0 ? `+${sale.soundingVarianceLiters}L` : `${sale.soundingVarianceLiters}L`}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200">{sale.productName}</td>
                      <td className="p-2 text-right border-r border-slate-200 font-mono">
                        {sale.meterAwal !== undefined ? formatNumber(sale.meterAwal) : '-'}
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-mono">
                        {sale.meterAkhir !== undefined ? formatNumber(sale.meterAkhir) : '-'}
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-mono">
                        {sale.teraTestLiters || 0} L
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-mono font-bold">
                        {formatNumber(sale.literSold, 1)} L
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-mono">
                        {formatRupiah(sale.unitPrice)}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-slate-900">
                        {formatRupiah(sale.totalRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {daySales.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={5} className="p-2 border-r border-slate-300 uppercase">
                      Total Penjualan Harian
                    </td>
                    <td className="p-2 text-right border-r border-slate-300 font-mono text-blue-900">
                      {formatNumber(totalLiterSold, 1)} L
                    </td>
                    <td className="p-2 border-r border-slate-300"></td>
                    <td className="p-2 text-right font-mono text-emerald-800 text-sm">
                      {formatRupiah(totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Section 2: Rekonsiliasi Kas & Pembayaran */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              II. Rekonsiliasi Kas & Metode Pembayaran
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-medium text-slate-600">
                      Penjualan Tunai (Cash)
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(totalCash)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-medium text-slate-600">
                      QRIS / MyPertamina
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(totalQris)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-medium text-slate-600">
                      EDC / Debit Bank
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(totalEdc)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="p-2">TOTAL PENERIMAAN</td>
                    <td className="p-2 text-right font-mono">{formatRupiah(totalRevenue)}</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-medium text-slate-600">
                      Uang Fisik Kasir (Disetor)
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(totalActualCash)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 bg-slate-50 font-medium text-slate-600">
                      Selisih Kas (Plus / Minus)
                    </td>
                    <td
                      className={`p-2 text-right font-mono font-bold ${
                        totalCashDiff === 0
                          ? 'text-emerald-700'
                          : totalCashDiff > 0
                          ? 'text-blue-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {totalCashDiff === 0
                        ? 'Sesuai (Rp 0)'
                        : totalCashDiff > 0
                        ? `+${formatRupiah(totalCashDiff)}`
                        : formatRupiah(totalCashDiff)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-black">
                    <td className="p-2">ESTIMASI MARGIN DEALER</td>
                    <td className="p-2 text-right font-mono text-emerald-800">
                      {formatRupiah(totalProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Posisi Stok Tangki & Penebusan DO */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              III. Logistik BBM & Mutasi Tangki Pendam Modular
            </h3>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Kapasitas Tangki:</span>
                <strong className="font-mono text-slate-900">{formatLiter(tank.totalCapacityLiters)} ({tank.totalCapacityLiters / 1000} KL)</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Penerimaan DO Hari Ini:</span>
                <strong className="font-mono text-slate-900">
                  {totalReceivedLiters > 0 ? `+${formatLiter(totalReceivedLiters)}` : '0 L (Tidak ada DO)'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Sisa Stok Buku Aktif:</span>
                <strong className="font-mono text-blue-800 font-bold">{formatLiter(tank.currentStockLiters)}</strong>
              </div>
            </div>
          </div>

          {/* Section 4: Beban & Pengeluaran Operasional Harian */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>IV. Pengeluaran Operasional Harian (Gaji, Lembur, Utilitas, Maintenance)</span>
              <span className="font-mono text-[11px] font-bold text-slate-800">
                Total Beban: {formatRupiah(totalDayExpenses)}
              </span>
            </h3>

            {dayExpenses.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 italic">
                Tidak ada catatan pengeluaran operasional pada tanggal {selectedDate}.
              </div>
            ) : (
              <table className="w-full border-collapse border border-slate-300 text-left">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">Waktu</th>
                    <th className="p-2 border-r border-slate-300">Kategori & Keterangan</th>
                    <th className="p-2 border-r border-slate-300">Penerima / Operator / Vendor</th>
                    <th className="p-2 border-r border-slate-300">Sumber Pembayaran</th>
                    <th className="p-2 text-right">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {dayExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 font-mono text-[11px]">
                        {exp.time}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium">
                        {exp.title}
                        {exp.quantity && exp.unitRate && (exp.category === 'GAJI_OPERATOR' || exp.category === 'LEMBURAN') && (
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            ({exp.quantity} × {formatRupiah(exp.unitRate)})
                          </span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">
                        {exp.personOrVendor || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          exp.paymentSource === 'KAS_HARIAN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {exp.paymentSource === 'KAS_HARIAN' ? 'Kasir / Kas Harian' : 'Rekening Bank'}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="p-2 border-r border-slate-300 text-right uppercase">
                      Total Beban Operasional:
                    </td>
                    <td className="p-2 text-right font-mono font-black text-rose-700">
                      {formatRupiah(totalDayExpenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Section 5: Lembar Tanda Tangan */}
          <div className="pt-6 border-t border-slate-300">
            <div className="text-xs text-slate-500 mb-4 text-center italic">
              Laporan ini dibuat dengan sebenar-benarnya sesuai pembacaan totalisator dispenser dan rekonsiliasi kas.
            </div>

            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <div className="text-slate-600 font-medium">Operator Shift 1 (05.30 - 13.30)</div>
                <div className="h-16 border-b border-slate-400 mx-4" />
                <div className="mt-1 font-bold text-slate-800">
                  ( {daySales.find((s) => s.shift.includes('Shift 1'))?.operatorName || 'Daslam'} )
                </div>
              </div>

              <div>
                <div className="text-slate-600 font-medium">Operator Shift 2 (13.30 - 19.30)</div>
                <div className="h-16 border-b border-slate-400 mx-4" />
                <div className="mt-1 font-bold text-slate-800">
                  ( {daySales.find((s) => s.shift.includes('Shift 2'))?.operatorName || 'Angga'} )
                </div>
              </div>

              <div>
                <div className="text-slate-600 font-medium">Pengelola / Owner Pertashop</div>
                <div className="h-16 border-b border-slate-400 mx-4" />
                <div className="mt-1 font-bold text-slate-800">( {profile.ownerName} )</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
