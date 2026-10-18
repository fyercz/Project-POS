import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SalesEntryModal } from '../../src/components/SalesEntryModal';
import { getTodayDateString } from '../../src/utils/formatters';
import type { Product, SaleRecord } from '../../src/types';

const product: Product = {
  id: 'prod-pertamax-92',
  code: '92',
  name: 'Pertamax 92 (BBM Non-Subsidi)',
  ron: 92,
  currentPrice: 15850,
  buyPrice: 15046,
  marginPerLiter: 804,
  color: 'blue',
  badgeColor: 'bg-blue-500',
  description: '',
};

function makeSale(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 's1',
    transactionDate: getTodayDateString(),
    time: '08:00',
    shift: 'Shift 1 (05.30 - 13.30)',
    operatorName: 'Daslam',
    productId: product.id,
    productName: product.name,
    literSold: 100,
    unitPrice: 15850,
    buyPriceSnapshot: 15046,
    totalRevenue: 1585000,
    totalProfit: 80400,
    paymentCash: 1585000,
    paymentQris: 0,
    paymentEdc: 0,
    actualCashInHand: 1585000,
    cashDifference: 0,
    notes: '',
    createdAt: 'x',
    ...overrides,
  } as SaleRecord;
}

const baseProps = {
  isOpen: true,
  products: [product],
  currentPrice: 15850,
  currentBuyPrice: 15046,
  currentStockLiters: 3000,
};

// Setiap test di sini merepresentasikan perilaku nyata yang pernah jadi sumber bug atau
// kebingungan pengguna sepanjang riwayat proyek ini - bukan cakupan generik.
describe('SalesEntryModal', () => {
  it('render judul "Input Laporan Penjualan..." saat membuat baru (bukan mengedit)', () => {
    render(<SalesEntryModal {...baseProps} onClose={vi.fn()} onSaveSale={vi.fn(() => null)} sales={[]} />);
    expect(screen.getByText(/Input Laporan Penjualan & Sounding Shift/i)).toBeInTheDocument();
  });

  it('tombol Simpan NONAKTIF kalau shift yang dipilih (default: Shift 1) sudah terisi hari ini', () => {
    // Regresi: dulu validasi bentrok shift hanya terjadi di dalam handleSubmit, kasir bisa
    // menekan tombol lalu baru melihat pesan error. Sekarang tombol langsung disabled supaya
    // kasir tahu dari awal tanpa perlu mencoba submit dulu.
    const existingShift1Today = makeSale({ shift: 'Shift 1 (05.30 - 13.30)' });
    render(
      <SalesEntryModal
        {...baseProps}
        onClose={vi.fn()}
        onSaveSale={vi.fn(() => null)}
        sales={[existingShift1Today]}
      />
    );
    const submitBtn = document.getElementById('submit-sale-record-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('tombol Simpan AKTIF kalau sudah diisi nominal & tidak ada shift yang bentrok', async () => {
    // Tombol juga nonaktif selama liter terjual masih 0 (belum ada nominal diisi sama sekali) -
    // jadi untuk menguji KHUSUS variabel "tidak ada bentrok shift", nominal tunai harus diisi
    // dulu supaya hanya satu variabel yang berbeda dari test "shift bentrok" di atas.
    render(<SalesEntryModal {...baseProps} onClose={vi.fn()} onSaveSale={vi.fn(() => null)} sales={[]} />);
    const cashInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(cashInput, '500000');
    const submitBtn = document.getElementById('submit-sale-record-btn');
    expect(submitBtn).not.toBeDisabled();
  });

  it('Escape menutup modal (regresi: dulu tombol Escape sama sekali tidak berfungsi)', async () => {
    const onClose = vi.fn();
    render(<SalesEntryModal {...baseProps} onClose={onClose} onSaveSale={vi.fn(() => null)} sales={[]} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tidak merender apa pun saat isOpen=false', () => {
    const { container } = render(
      <SalesEntryModal {...baseProps} isOpen={false} onClose={vi.fn()} onSaveSale={vi.fn(() => null)} sales={[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
