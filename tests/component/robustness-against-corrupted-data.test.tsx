import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SalesTable } from '../../src/components/SalesTable';
import { ExpensesView } from '../../src/components/ExpensesView';
import type { SaleRecord, ExpenseRecord } from '../../src/types';

/**
 * Ditemukan lewat evaluasi fungsional (bukan dugaan): satu record TIDAK LENGKAP di
 * localStorage - skenario realistis dari backup yang rusak/terpotong, atau localStorage yang
 * dimodifikasi manual - meng-CRASH TOTAL layar utama aplikasi (Ringkasan Penjualan) dan layar
 * Beban & Pengeluaran, karena fungsi filter/pencarian memanggil `.toLowerCase()` langsung pada
 * field yang diasumsikan selalu ada (operatorName, productName, shift, title, date) tanpa
 * penjagaan null - berbeda dari field opsional lain di file yang sama (notes, personOrVendor)
 * yang SUDAH dijaga dengan benar. tsc dan vite build TIDAK PERNAH menangkap ini karena field-
 * field itu memang wajib ada menurut tipe TypeScript-nya - masalahnya murni di runtime saat
 * data sungguhan (dari sumber manapun) tidak mematuhi tipe itu.
 */

describe('SalesTable - ketahanan terhadap record rusak', () => {
  const baseProps = {
    onDeleteSale: vi.fn(),
    onEditSale: vi.fn(),
    onOpenNewSaleModal: vi.fn(),
    onOpenPrintReportModal: vi.fn(),
    onOpenImportModal: vi.fn(),
  };

  it('TIDAK CRASH saat ada sale record tanpa operatorName/productName/shift (filter default ALL)', () => {
    const corruptedSale = { id: 's1', transactionDate: '2026-10-01' } as unknown as SaleRecord;
    expect(() => {
      render(<SalesTable {...baseProps} sales={[corruptedSale]} />);
    }).not.toThrow();
  });

  it('TIDAK CRASH saat filter "Bulan Ini"/"Bulan Lalu" diklik dan ada record TANPA transactionDate', () => {
    // Khusus menguji jalur .startsWith() yang HANYA dipanggil saat preset THIS_MONTH/LAST_MONTH
    // aktif (default-nya 'ALL', yang tidak melewati baris itu sama sekali).
    const corruptedSale = { id: 's1' } as unknown as SaleRecord; // transactionDate pun hilang
    render(<SalesTable {...baseProps} sales={[corruptedSale]} />);
    expect(() => {
      fireEvent.click(screen.getAllByText('Bulan Ini')[0]);
    }).not.toThrow();
    expect(() => {
      fireEvent.click(screen.getAllByText('Bulan Lalu')[0]);
    }).not.toThrow();
  });

  it('pencarian tetap berfungsi normal untuk record yang lengkap di antara yang rusak', () => {
    const corrupted = { id: 's1', transactionDate: '2026-10-01' } as unknown as SaleRecord;
    const valid: SaleRecord = {
      id: 's2', transactionDate: '2026-10-02', time: '10:00', shift: 'Shift 1 (05.30 - 13.30)',
      operatorName: 'Daslam', productId: 'p1', productName: 'Pertamax', literSold: 50,
      unitPrice: 15850, buyPriceSnapshot: 15046, totalRevenue: 792500, totalProfit: 40200,
      paymentCash: 792500, paymentQris: 0, paymentEdc: 0, actualCashInHand: 792500,
      cashDifference: 0, createdAt: 'x',
    };
    const { container } = render(<SalesTable {...baseProps} sales={[corrupted, valid]} />);
    expect(container.textContent).toContain('Daslam');
  });
});

describe('ExpensesView - ketahanan terhadap record rusak', () => {
  const baseProps = {
    onOpenAddExpense: vi.fn(),
    onEditExpense: vi.fn(),
    onDeleteExpense: vi.fn(),
    onDeleteExpensesByMonth: vi.fn(),
  };

  it('TIDAK CRASH saat ada expense record tanpa title/date', () => {
    const corruptedExpense = { id: 'e1' } as unknown as ExpenseRecord;
    expect(() => {
      render(<ExpensesView {...(baseProps as any)} expenses={[corruptedExpense]} />);
    }).not.toThrow();
  });
});
