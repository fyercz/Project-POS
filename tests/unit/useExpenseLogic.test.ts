import { describe, it, expect, vi } from 'vitest';
import { useExpenseLogic } from '../../src/hooks/useExpenseLogic';
import type { ExpenseRecord, SoundingRecord, PurchaseOrder } from '../../src/types';

function makeExpense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: 'exp1',
    date: '2026-10-15',
    time: '19:00',
    category: 'LOSSES_MINYAK',
    title: 'Losses',
    amount: 50000,
    paymentSource: 'KAS_HARIAN',
    createdAt: 'x',
    ...overrides,
  };
}

function setup(overrides: Partial<Parameters<typeof useExpenseLogic>[0]> = {}) {
  const setExpenses = vi.fn();
  const setSoundings = vi.fn();
  const setPurchases = vi.fn();
  const setEditingExpense = vi.fn();
  const setSelectedExpenseCategory = vi.fn();
  const setIsExpenseModalOpen = vi.fn();
  const hook = useExpenseLogic({
    expenses: [],
    setExpenses,
    setSoundings,
    setPurchases,
    editingExpense: null,
    setEditingExpense,
    setSelectedExpenseCategory,
    setIsExpenseModalOpen,
    ...overrides,
  });
  return { hook, setExpenses, setSoundings, setPurchases, setEditingExpense };
}

describe('useExpenseLogic', () => {
  describe('handleDeleteExpense - markVarianceSourceExcluded', () => {
    it('menghapus beban dgn sourceType SOUNDING_TANGKI menandai sounding sumbernya, BUKAN purchases', () => {
      const expense = makeExpense({ sourceType: 'SOUNDING_TANGKI', sourceReferenceId: 'snd1' });
      const { hook, setSoundings, setPurchases } = setup({ expenses: [expense] });
      hook.handleDeleteExpense('exp1');

      expect(setSoundings).toHaveBeenCalledTimes(1);
      const soundingUpdater = setSoundings.mock.calls[0][0];
      const soundings: SoundingRecord[] = soundingUpdater([{ id: 'snd1' } as SoundingRecord]);
      expect(soundings[0].varianceExpenseExcluded).toBe(true);

      expect(setPurchases).not.toHaveBeenCalled();
    });

    it('menghapus beban dgn sourceType PENERIMAAN_DO menandai purchase sumbernya, BUKAN soundings', () => {
      const expense = makeExpense({ sourceType: 'PENERIMAAN_DO', sourceReferenceId: 'po1' });
      const { hook, setSoundings, setPurchases } = setup({ expenses: [expense] });
      hook.handleDeleteExpense('exp1');

      expect(setPurchases).toHaveBeenCalledTimes(1);
      const purchaseUpdater = setPurchases.mock.calls[0][0];
      const purchases: PurchaseOrder[] = purchaseUpdater([{ id: 'po1' } as PurchaseOrder]);
      expect(purchases[0].varianceExpenseExcluded).toBe(true);

      expect(setSoundings).not.toHaveBeenCalled();
    });

    it('menghapus beban MANUAL (tanpa sourceType) tidak menyentuh sounding maupun purchases', () => {
      const expense = makeExpense({ sourceType: undefined, sourceReferenceId: undefined });
      const { hook, setSoundings, setPurchases } = setup({ expenses: [expense] });
      hook.handleDeleteExpense('exp1');
      expect(setSoundings).not.toHaveBeenCalled();
      expect(setPurchases).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteExpensesByMonth', () => {
    it('menghapus beberapa beban sebulan sekaligus dan menandai SEMUA sumbernya', () => {
      const expenses = [
        makeExpense({ id: 'e1', date: '2026-10-05', sourceType: 'SOUNDING_TANGKI', sourceReferenceId: 'sndA' }),
        makeExpense({ id: 'e2', date: '2026-10-20', sourceType: 'PENERIMAAN_DO', sourceReferenceId: 'poB' }),
        makeExpense({ id: 'e3', date: '2026-09-15', sourceType: 'SOUNDING_TANGKI', sourceReferenceId: 'sndC' }),
      ];
      const { hook, setExpenses, setSoundings, setPurchases } = setup({ expenses });
      hook.handleDeleteExpensesByMonth('2026-10');

      const expensesUpdater = setExpenses.mock.calls[0][0] ?? setExpenses.mock.calls[0];
      // handleDeleteExpensesByMonth memanggil setExpenses langsung dengan array, bukan updater
      const remaining: ExpenseRecord[] = setExpenses.mock.calls[0][0];
      expect(remaining.map((e) => e.id)).toEqual(['e3']); // hanya September yang tersisa

      const soundingUpdater = setSoundings.mock.calls[0][0];
      const soundings = soundingUpdater([{ id: 'sndA' } as SoundingRecord, { id: 'sndC' } as SoundingRecord]);
      expect(soundings.find((s: any) => s.id === 'sndA').varianceExpenseExcluded).toBe(true);
      expect(soundings.find((s: any) => s.id === 'sndC').varianceExpenseExcluded).toBeUndefined(); // September tidak ikut terhapus, tidak ditandai

      const purchaseUpdater = setPurchases.mock.calls[0][0];
      const purchases = purchaseUpdater([{ id: 'poB' } as PurchaseOrder]);
      expect(purchases[0].varianceExpenseExcluded).toBe(true);
    });
  });

  describe('handleSaveExpense', () => {
    it('menambah beban baru memberi id & createdAt otomatis', () => {
      const { hook, setExpenses } = setup({ expenses: [] });
      hook.handleSaveExpense({
        date: '2026-10-18',
        time: '10:00',
        category: 'LISTRIK',
        title: 'Token Listrik',
        amount: 200000,
        paymentSource: 'KAS_HARIAN',
      } as any);
      const result: ExpenseRecord[] = setExpenses.mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0].id).toBeTruthy();
      expect(result[0].createdAt).toBeTruthy();
    });

    it('mengedit beban existing mempertahankan id & createdAt asli', () => {
      const existing = makeExpense({ id: 'exp-asli', createdAt: '2026-10-01 08:00' });
      const { hook, setExpenses } = setup({ expenses: [existing], editingExpense: existing });
      hook.handleSaveExpense({ ...existing, amount: 999999 } as any);
      const result: ExpenseRecord[] = setExpenses.mock.calls[0][0];
      expect(result[0].id).toBe('exp-asli');
      expect(result[0].createdAt).toBe('2026-10-01 08:00');
      expect(result[0].amount).toBe(999999);
    });
  });
});
