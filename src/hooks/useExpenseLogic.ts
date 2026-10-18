import type { Dispatch, SetStateAction } from 'react';
import { ExpenseRecord, ExpenseCategoryType, SoundingRecord, PurchaseOrder } from '../types';
import { getTodayDateString, getCurrentTimeString } from '../utils/formatters';

/**
 * Diekstrak dari App.tsx sebagai bagian dari rekomendasi #7 di docs/REKOMENDASI_ARSITEKTUR.md -
 * domain KEDUA yang dipindah (setelah Karyawan/Absensi/Gaji di useAttendancePayrollLogic.ts).
 *
 * KETERKAITAN LINTAS-DOMAIN YANG DITEMUKAN: handleDeleteExpense/handleDeleteExpensesByMonth
 * TERNYATA menulis ke DUA domain lain (`soundings` DAN `purchases`) lewat
 * markVarianceSourceExcluded() - menghapus beban losses/gain BBM otomatis harus menandai
 * sounding/DO sumbernya supaya beban itu TIDAK dibuat ulang lagi saat aplikasi dibuka kembali
 * (lihat aturan bisnis di ARCHITECTURE.md). Karena itu hook ini menerima setSoundings dan
 * setPurchases sebagai parameter, bukan memilikinya sendiri.
 *
 * State UI modal (isExpenseModalOpen, editingExpense, selectedExpenseCategory) TETAP
 * didefinisikan di App.tsx (dipakai langsung oleh JSX <ExpenseEntryModal> di sana) - hook ini
 * hanya menerima setter-nya untuk 2 handler "buka modal" yang sederhana.
 */

export interface UseExpenseLogicParams {
  expenses: ExpenseRecord[];
  setExpenses: Dispatch<SetStateAction<ExpenseRecord[]>>;
  setSoundings: Dispatch<SetStateAction<SoundingRecord[]>>;
  setPurchases: Dispatch<SetStateAction<PurchaseOrder[]>>;
  editingExpense: ExpenseRecord | null;
  setEditingExpense: Dispatch<SetStateAction<ExpenseRecord | null>>;
  setSelectedExpenseCategory: Dispatch<SetStateAction<ExpenseCategoryType>>;
  setIsExpenseModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function useExpenseLogic({
  expenses,
  setExpenses,
  setSoundings,
  setPurchases,
  editingExpense,
  setEditingExpense,
  setSelectedExpenseCategory,
  setIsExpenseModalOpen,
}: UseExpenseLogicParams) {
  const handleOpenAddExpense = (cat?: ExpenseCategoryType) => {
    setEditingExpense(null);
    setSelectedExpenseCategory(cat || 'GAJI_OPERATOR');
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setSelectedExpenseCategory(expense.category);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    if (editingExpense) {
      const updated = expenses.map((e) =>
        e.id === editingExpense.id
          ? { ...expenseData, id: editingExpense.id, createdAt: editingExpense.createdAt }
          : e
      );
      setExpenses(updated);
    } else {
      const newExpense: ExpenseRecord = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: `${getTodayDateString()} ${getCurrentTimeString()}`,
      };
      setExpenses([newExpense, ...expenses]);
    }
  };

  // Tandai sumber (sounding/DO) agar beban losses/gain otomatisnya TIDAK dibuat ulang saat
  // aplikasi dibuka kembali, setelah pengguna sengaja menghapus beban tersebut secara manual.
  const markVarianceSourceExcluded = (removedExpenses: ExpenseRecord[]) => {
    const soundingIds = new Set(
      removedExpenses
        .filter((e) => (e.sourceType === 'SOUNDING_TANGKI' || e.sourceType === 'CLOSING_SHIFT') && e.sourceReferenceId)
        .map((e) => e.sourceReferenceId!)
    );
    const purchaseIds = new Set(
      removedExpenses.filter((e) => e.sourceType === 'PENERIMAAN_DO' && e.sourceReferenceId).map((e) => e.sourceReferenceId!)
    );
    if (soundingIds.size > 0) {
      setSoundings((prev) => prev.map((s) => (soundingIds.has(s.id) ? { ...s, varianceExpenseExcluded: true } : s)));
    }
    if (purchaseIds.size > 0) {
      setPurchases((prev) => prev.map((p) => (purchaseIds.has(p.id) ? { ...p, varianceExpenseExcluded: true } : p)));
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    const removed = expenses.find((e) => e.id === expenseId);
    setExpenses(expenses.filter((e) => e.id !== expenseId));
    if (removed) markVarianceSourceExcluded([removed]);
  };

  const handleDeleteExpensesByMonth = (monthKey: string) => {
    const removed = expenses.filter((e) => e.date.startsWith(monthKey));
    const remaining = expenses.filter((e) => !e.date.startsWith(monthKey));
    setExpenses(remaining);
    markVarianceSourceExcluded(removed);
  };

  return {
    handleOpenAddExpense,
    handleEditExpense,
    handleSaveExpense,
    handleDeleteExpense,
    handleDeleteExpensesByMonth,
  };
}
