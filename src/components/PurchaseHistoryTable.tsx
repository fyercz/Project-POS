import React, { useState } from 'react';
import { Truck, CheckCircle2, Clock, ShoppingCart, Eye, Plus, Pencil, Trash2 } from 'lucide-react';
import { PurchaseOrder, POStatus } from '../types';
import { formatRupiah, formatNumber, formatShortDate } from '../utils/formatters';

interface PurchaseHistoryTableProps {
  orders: PurchaseOrder[];
  onOpenNewOrderModal: () => void;
  onOpenReceiveModal: (order: PurchaseOrder) => void;
  onEditOrder: (order: PurchaseOrder) => void;
  onDeleteOrder: (id: string) => void;
}

export const PurchaseHistoryTable: React.FC<PurchaseHistoryTableProps> = ({
  orders,
  onOpenNewOrderModal,
  onOpenReceiveModal,
  onEditOrder,
  onDeleteOrder,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<PurchaseOrder | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  const getStatusBadge = (status: POStatus) => {
    switch (status) {
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Selesai Dibongkar
          </span>
        );
      case 'PENGIRIMAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse">
            <Truck className="w-3 h-3" />
            Mobil Tangki OTW
          </span>
        );
      case 'DIPESAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3" />
            Menunggu Pengiriman
          </span>
        );
      case 'BATAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">
            Penebusan BBM ke TBBM Pertamina
          </span>
          <h2 className="text-base font-bold text-slate-800 tracking-tight mt-0.5">
            Riwayat Pemesanan & Berita Acara DO
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIPESAN">Menunggu Pengiriman</option>
            <option value="PENGIRIMAN">Dalam Perjalanan</option>
            <option value="SELESAI">Selesai Dibongkar</option>
          </select>

          <button
            type="button"
            onClick={onOpenNewOrderModal}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-red-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Buat PO Pertamina</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-5">No. PO & DO Pertamina</th>
              <th className="py-3 px-4">Tanggal Pesan / Kirim</th>
              <th className="py-3 px-4">Produk & TBBM</th>
              <th className="py-3 px-4 text-center">Pecahan Volume</th>
              <th className="py-3 px-4 text-right">Harga Tebus / Total</th>
              <th className="py-3 px-4">Mobil Tangki & Supir</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Belum ada pemesanan DO Pertamina tercatat.</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-medium text-slate-900 whitespace-nowrap">
                    <div className="font-mono font-bold">{order.poNumber}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {order.doPertaminaNumber || order.soPertaminaNumber || '-'}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                    <div>Pesan: {formatShortDate(order.orderDate)}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Est. Tiba: {formatShortDate(order.estimatedDeliveryDate)}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-800">{order.productName}</span>
                    <span className="block text-[11px] text-slate-400">{order.supplyDepot}</span>
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="inline-block px-2.5 py-0.5 bg-red-50 text-red-700 font-black font-mono rounded-md border border-red-200 text-xs">
                      {order.volumeKL} KL
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 font-mono">
                      ({formatNumber(order.volumeLiters)} L)
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                    <div className="font-bold text-slate-900">{formatRupiah(order.totalAmount)}</div>
                    <div className="text-[11px] text-slate-400">
                      @{formatRupiah(order.buyPricePerLiter)}/L
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800 font-mono">
                      {order.truckPlateNumber || '-'}
                    </div>
                    <div className="text-[11px] text-slate-400">{order.driverName || '-'}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {order.status !== 'SELESAI' && (
                        <button
                          type="button"
                          onClick={() => onOpenReceiveModal(order)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          title="Bongkar / Penerimaan BBM"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Bongkar</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => setSelectedDetailOrder(order)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Lihat Rincian / Berita Acara"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditOrder(order)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit Data Pemesanan DO"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus data pemesanan PO ${order.poNumber} (${order.volumeKL} KL)?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Pemesanan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Berita Acara Detail Modal */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Berita Acara Penerimaan BBM
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedDetailOrder.poNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[11px]">Volume DO:</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {selectedDetailOrder.volumeKL} KL ({formatNumber(selectedDetailOrder.volumeLiters)} L)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Diterima Bersih:</span>
                  <strong className="text-emerald-700 font-mono text-sm">
                    {formatNumber(selectedDetailOrder.actualLitersReceived || selectedDetailOrder.volumeLiters)} L
                  </strong>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sounding Sebelum Bongkar:</span>
                  <span className="font-mono font-bold">
                    {selectedDetailOrder.soundingBeforeCm || '-'} cm (
                    {formatNumber(selectedDetailOrder.soundingBeforeLiters || 0)} L)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sounding Sesudah Bongkar:</span>
                  <span className="font-mono font-bold">
                    {selectedDetailOrder.soundingAfterCm || '-'} cm (
                    {formatNumber(selectedDetailOrder.soundingAfterLiters || 0)} L)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Densitas & Suhu BBM:</span>
                  <span className="font-mono">
                    {selectedDetailOrder.density || '-'} g/ml • {selectedDetailOrder.temperature || '-'} °C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobil Tangki & Supir:</span>
                  <span>
                    {selectedDetailOrder.truckPlateNumber || '-'} ({selectedDetailOrder.driverName || '-'})
                  </span>
                </div>
              </div>

              {selectedDetailOrder.notes && (
                <div className="p-2.5 bg-blue-50/50 rounded-lg text-slate-700 text-[11px] border border-blue-100">
                  <strong>Catatan:</strong> {selectedDetailOrder.notes}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setSelectedDetailOrder(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800 transition-colors"
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
