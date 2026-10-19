import { describe, it, expect, vi } from 'vitest';
import { useSoundingLogic } from '../../src/hooks/useSoundingLogic';
import type { SoundingRecord, TankConfig, SaleRecord } from '../../src/types';

// Diekstrak dari App.tsx - domain Sounding adalah yang PALING TERJALIN dari 3 domain yang
// dipindah (lihat docs/REKOMENDASI_ARSITEKTUR.md). Setiap test merepresentasikan efek samping
// lintas-domain yang sudah diverifikasi manual di browser sebelum diekstrak.

const tank: TankConfig = {
  tankId: 't1',
  tankName: 'Tangki 1',
  productId: 'prod-pertamax-92',
  totalCapacityLiters: 5000,
  currentStockLiters: 3000,
  deadStockLiters: 300,
  warningThresholdLiters: 1200,
  criticalThresholdLiters: 600,
};

function makeSounding(overrides: Partial<SoundingRecord> = {}): SoundingRecord {
  return {
    id: 'snd1',
    date: '2026-10-15',
    time: '19:00',
    operatorName: 'Daslam',
    stickDipCm: 142,
    calculatedLiters: 2950,
    systemStockLiters: 3000,
    varianceLiters: -50,
    waterBottomCm: 0,
    ...overrides,
  };
}

function setup(overrides: Partial<Parameters<typeof useSoundingLogic>[0]> = {}) {
  const setSoundings = vi.fn();
  const setTank = vi.fn();
  const setSales = vi.fn();
  const setExpenses = vi.fn();
  const setEditingSounding = vi.fn();
  const setIsSoundingModalOpen = vi.fn();
  const setConfirmConfig = vi.fn();
  const hook = useSoundingLogic({
    soundings: [],
    setSoundings,
    tank,
    setTank,
    sales: [],
    setSales,
    setExpenses,
    products: [],
    priceHistory: [],
    editingSounding: null,
    setEditingSounding,
    setIsSoundingModalOpen,
    setConfirmConfig,
    ...overrides,
  });
  return { hook, setSoundings, setTank, setSales, setExpenses, setEditingSounding, setConfirmConfig };
}

describe('useSoundingLogic', () => {
  describe('handleSaveSounding', () => {
    it('sounding BARU dan TERBARU (tidak ada sounding lain) langsung memperbarui stok tangki', () => {
      const { hook, setTank } = setup({ soundings: [] });
      hook.handleSaveSounding(makeSounding(), 2950);
      expect(setTank).toHaveBeenCalled();
      const updater = setTank.mock.calls[0][0];
      const result = updater(tank);
      expect(result.currentStockLiters).toBe(2950);
    });

    it('mengedit sounding LAMA (bukan yang terbaru) TIDAK menimpa stok tangki saat ini', () => {
      // Regresi: dulu mengedit sounding lama bisa menimpa stok yang sudah berubah akibat
      // transaksi SESUDAHNYA - lihat ARCHITECTURE.md aturan bisnis #3.
      const oldSounding = makeSounding({ id: 'snd-old', date: '2026-10-10', time: '10:00' });
      const newerSounding = makeSounding({ id: 'snd-newer', date: '2026-10-15', time: '19:00' });
      const { hook, setTank } = setup({
        soundings: [newerSounding, oldSounding],
        editingSounding: oldSounding,
      });
      hook.handleSaveSounding({ ...oldSounding, calculatedLiters: 9999 }, 9999, 'snd-old');
      expect(setTank).not.toHaveBeenCalled();
    });

    it('mempertahankan varianceExpenseExcluded saat mengedit sounding yang sudah ditandai', () => {
      const existing = makeSounding({ varianceExpenseExcluded: true });
      const { hook, setSoundings } = setup({ soundings: [existing], editingSounding: existing });
      hook.handleSaveSounding({ ...existing, notes: 'diperbarui' }, 2950, 'snd1');
      const result: SoundingRecord[] = setSoundings.mock.calls[0][0];
      expect(result[0].varianceExpenseExcluded).toBe(true);
    });
  });

  describe('handleDeleteSounding', () => {
    it('menghapus sounding DAN beban pembukuan otomatis yang terkait', () => {
      const { hook, setSoundings, setExpenses } = setup({ soundings: [makeSounding()] });
      hook.handleDeleteSounding('snd1');
      const soundingsResult: SoundingRecord[] = setSoundings.mock.calls[0][0];
      expect(soundingsResult).toHaveLength(0);
      const expensesUpdater = setExpenses.mock.calls[0][0];
      const expensesResult = expensesUpdater([
        { id: 'exp1', sourceReferenceId: 'snd1' } as any,
        { id: 'exp2', sourceReferenceId: 'snd-lain' } as any,
      ]);
      expect(expensesResult).toHaveLength(1);
      expect(expensesResult[0].id).toBe('exp2');
    });
  });

  describe('handleDeleteMonthSoundings', () => {
    it('menampilkan dialog "tidak ada data" bila bulan target kosong', () => {
      const { hook, setConfirmConfig } = setup({ soundings: [makeSounding({ date: '2026-09-01' })] });
      hook.handleDeleteMonthSoundings('2026-10');
      const config = setConfirmConfig.mock.calls[0][0];
      expect(config.title).toContain('Tidak Ada Data');
      expect(config.isDestructive).toBe(false);
    });

    it('konfirmasi hapus bulan menghapus sounding, beban terkait, DAN melepas tautan di sales - tiga efek sekaligus', () => {
      const sndA = makeSounding({ id: 'sndA', date: '2026-10-05' });
      const sndB = makeSounding({ id: 'sndB', date: '2026-10-20' });
      const sndOther = makeSounding({ id: 'sndOther', date: '2026-09-15' });
      const linkedSale: SaleRecord = { id: 's1', soundingRecordId: 'sndA' } as any;
      const unrelatedSale: SaleRecord = { id: 's2', soundingRecordId: 'sndOther' } as any;

      const { hook, setConfirmConfig, setSoundings, setExpenses, setSales } = setup({
        soundings: [sndA, sndB, sndOther],
      });
      hook.handleDeleteMonthSoundings('2026-10');
      const config = setConfirmConfig.mock.calls[0][0];
      expect(config.isDestructive).toBe(true);
      expect(config.confirmLabel).toContain('2'); // 2 sounding bulan itu

      // Jalankan konfirmasi
      config.onConfirm();

      const soundingsUpdater = setSoundings.mock.calls[0][0];
      const soundingsResult: SoundingRecord[] = soundingsUpdater([sndA, sndB, sndOther]);
      expect(soundingsResult.map((s) => s.id)).toEqual(['sndOther']);

      const expensesUpdater = setExpenses.mock.calls[0][0];
      const expensesResult = expensesUpdater([
        { id: 'e1', sourceReferenceId: 'sndA' } as any,
        { id: 'e2', sourceReferenceId: 'sndOther' } as any,
      ]);
      expect(expensesResult.map((e: any) => e.id)).toEqual(['e2']);

      const salesUpdater = setSales.mock.calls[0][0];
      const salesResult = salesUpdater([linkedSale, unrelatedSale]);
      expect(salesResult[0].soundingRecordId).toBeUndefined(); // terlepas
      expect(salesResult[1].soundingRecordId).toBe('sndOther'); // tidak terpengaruh
    });
  });
});
