import React, { useState } from 'react';
import {
  Receipt,
  UserCheck,
  Clock,
  Zap,
  Droplets,
  Wrench,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Wallet,
  Building2,
  TrendingDown,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategoryType, EXPENSE_RATES } from '../types';
import { formatRupiah, formatShortDate, formatNumber, getTodayDateString } from '../utils/formatters';

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  onOpenAddExpense: (category?: ExpenseCategoryType) => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  const todayStr = getTodayDateString();

  // Calculations
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalTodayExpense = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalAllExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Grouped by Category totals
  const totalGaji = expenses
    .filter((e) => e.category === 'GAJI_OPERATOR')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalLembur = expenses
    .filter((e) => e.category === 'LEMBURAN')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalListrik = expenses
    .filter((e) => e.category === 'TOKEN_LISTRIK')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalPdam = expenses
    .filter((e) => e.category === 'PDAM')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalMaintenance = expenses
    .filter((e) => e.category === 'MAINTENANCE_ALAT')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalLainnya = expenses
    .filter((e) => e.category === 'LAINNYA')
    .reduce((acc, e) => acc + e.amount, 0);

  // Total Kas Harian vs Rekening
  const totalFromKasHarian = expenses
    .filter((e) => e.paymentSource === 'KAS_HARIAN')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalFromBank = expenses
    .filter((e) => e.paymentSource === 'REKENING_BANK')
    .reduce((acc, e) => acc + e.amount, 0);

  // Filtered List
  const filteredExpenses = expenses.filter((item) => {
    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.personOrVendor && item.personOrVendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchDate = selectedDate === 'ALL' || item.date === selectedDate;

    return matchCategory && matchSearch && matchDate;
  });

  const getCategoryBadge = (category: ExpenseCategoryType) => {
    switch (category) {
      case 'GAJI_OPERATOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            Gaji Operator
          </span>
        );
      case 'LEMBURAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Lemburan
          </span>
        );
      case 'TOKEN_LISTRIK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-900 border border-yellow-300">
            <Zap className="w-3.5 h-3.5 text-yellow-600" />
            Token Listrik
          </span>
        );
      case 'PDAM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Droplets className="w-3.5 h-3.5 text-cyan-600" />
            PDAM
          </span>
        );
      case 'MAINTENANCE_ALAT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            Lain-lain
          </span>
        );
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Jam', 'Kategori', 'Keterangan', 'Jumlah', 'Tarif', 'Total (Rp)', 'Penerima / Vendor', 'Shift', 'Sumber Dana', 'Catatan'];
    const rows = filteredExpenses.map((e) => [
      e.id,
      e.date,
      e.time,
      e.category,
      `"${e.title}"`,
      e.quantity || 1,
      e.unitRate || e.amount,
      e.amount,
      `"${e.personOrVendor || '-'}"`,
      `"${e.shift || '-'}"`,
      e.paymentSource,
      `"${e.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Pengeluaran_Pertashop_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards for Operational Expenses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gaji & Lemburan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Gaji & Lembur Operator
              </span>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-blue-900 font-mono tracking-tight">
                  {formatRupiah(totalGaji + totalLembur)}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Gaji: {formatRupiah(totalGaji)}</span>
            <span>Lembur: {formatRupiah(totalLembur)}</span>
          </div>
        </div>

        {/* Card 2: Token Listrik PLN */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Token Listrik PLN
              </span>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-yellow-700 font-mono tracking-tight">
                  {formatRupiah(totalListrik)}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Daya Pompa & Canopy</span>
            <span className="font-semibold text-yellow-800">PLN Prabayar</span>
          </div>
        </div>

        {/* Card 3: PDAM Air */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Tagihan PDAM Air
              </span>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-cyan-800 font-mono tracking-tight">
                  {formatRupiah(totalPdam)}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fasilitas Air Bersih</span>
            <span className="font-semibold text-cyan-800">Tirta Lawu</span>
          </div>
        </div>

        {/* Card 4: Maintenance Alat */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Maintenance Peralatan
              </span>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-indigo-900 font-mono tracking-tight">
                  {formatRupiah(totalMaintenance)}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Servis Dispenser, Nozzle, Genset</span>
            <span className="font-semibold text-indigo-800 font-mono">
              Total {formatRupiah(totalAllExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Templates Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold">Pencatatan Cepat Pengeluaran Rutin</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Standar Pertashop: Gaji Operator Rp 40.000/hari • Lembur Rp 30.000/shift
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenAddExpense('GAJI_OPERATOR')}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            + Gaji (Rp 40k)
          </button>

          <button
            onClick={() => onOpenAddExpense('LEMBURAN')}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            + Lembur (Rp 30k)
          </button>

          <button
            onClick={() => onOpenAddExpense('TOKEN_LISTRIK')}
            className="px-3 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            + Token Listrik
          </button>

          <button
            onClick={() => onOpenAddExpense('PDAM')}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Droplets className="w-3.5 h-3.5" />
            + PDAM
          </button>

          <button
            onClick={() => onOpenAddExpense('MAINTENANCE_ALAT')}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5" />
            + Maintenance
          </button>
        </div>
      </div>

      {/* 3. Main Expenses Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Buku Pengeluaran & Beban Operasional
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar seluruh pos pengeluaran harian, gaji pegawai, tagihan utilitas, dan perbaikan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => onOpenAddExpense()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Catat Pengeluaran
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari keterangan / operator / vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="GAJI_OPERATOR">Gaji Operator (Rp 40.000/hari)</option>
              <option value="LEMBURAN">Uang Lemburan (Rp 30.000/shift)</option>
              <option value="TOKEN_LISTRIK">Token Listrik PLN</option>
              <option value="PDAM">Tagihan PDAM Air</option>
              <option value="MAINTENANCE_ALAT">Maintenance & Servis</option>
              <option value="LAINNYA">Lain-lain / ATK</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-3">
            <span>
              Menampilkan <strong>{filteredExpenses.length}</strong> transaksi
            </span>
            <span className="font-mono font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded-md">
              Total: {formatRupiah(filteredExpenses.reduce((acc, e) => acc + e.amount, 0))}
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200">
                <th className="p-3">Waktu & Tanggal</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Keterangan / Item</th>
                <th className="p-3">Penerima / Vendor</th>
                <th className="p-3">Perhitungan / Rincian</th>
                <th className="p-3 text-right">Nominal Biaya</th>
                <th className="p-3 text-center">Sumber Dana</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada catatan pengeluaran yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{formatShortDate(exp.date)}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {exp.time} • {exp.shift || 'Non-Shift'}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">{getCategoryBadge(exp.category)}</td>

                    <td className="p-3 max-w-xs">
                      <div className="font-bold text-slate-900">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                          {exp.notes}
                        </div>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{exp.personOrVendor || '-'}</span>
                    </td>

                    <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {exp.category === 'GAJI_OPERATOR' ? (
                        <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                          {exp.quantity || 1} Hari × {formatRupiah(exp.unitRate || 40000)}
                        </span>
                      ) : exp.category === 'LEMBURAN' ? (
                        <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                          {exp.quantity || 1} Shift × {formatRupiah(exp.unitRate || 30000)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Fixed Rate</span>
                      )}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-rose-700">
                        -{formatRupiah(exp.amount)}
                      </span>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      {exp.paymentSource === 'KAS_HARIAN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Wallet className="w-3 h-3 text-emerald-600" />
                          Kas Harian
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          <Building2 className="w-3 h-3 text-purple-600" />
                          Rekening Bank
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Pengeluaran"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus catatan pengeluaran "${exp.title}" (${formatRupiah(exp.amount)})?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t border-slate-300">
                  <td colSpan={5} className="p-3 text-slate-700 uppercase">
                    Total Pengeluaran Terpilih:
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-rose-700 text-sm">
                    -{formatRupiah(filteredExpenses.reduce((acc, e) => acc + e.amount, 0))}
                  </td>
                  <td colSpan={2} className="p-3 text-center text-slate-500 text-[11px]">
                    Kas: {formatRupiah(filteredExpenses.filter(e => e.paymentSource === 'KAS_HARIAN').reduce((a, b) => a + b.amount, 0))} • Bank: {formatRupiah(filteredExpenses.filter(e => e.paymentSource === 'REKENING_BANK').reduce((a, b) => a + b.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
