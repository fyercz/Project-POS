import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiveFuelModal } from '../../src/components/ReceiveFuelModal';
import type { PurchaseOrder, TankConfig } from '../../src/types';

// Bug nyata yang ditemukan lewat evaluasi fungsional menyeluruh (bukan lewat tsc/build, yang
// keduanya lolos bersih): komponen ini dulu menaruh "if (!isOpen || !order) return null"
// SEBELUM sebagian besar useState-nya dipanggil. Karena di App.tsx komponen ini SELALU ter-
// render (order berubah dari null -> PurchaseOrder saat dibuka), ini membuat React memanggil
// JUMLAH HOOK YANG BERBEDA antar render - React error #310, APLIKASI CRASH TOTAL setiap kali
// tombol "Bongkar" diklik. tsc dan build tidak pernah menangkap ini karena ini murni
// pelanggaran ATURAN RUNTIME React, bukan kesalahan tipe.
describe('ReceiveFuelModal', () => {
  const tank: TankConfig = {
    tankId: 't1', tankName: 'Tangki 1', productId: 'prod-pertamax-92',
    totalCapacityLiters: 5000, currentStockLiters: 1000, deadStockLiters: 300,
    warningThresholdLiters: 1200, criticalThresholdLiters: 600,
  };

  const order: PurchaseOrder = {
    id: 'po1',
    poNumber: 'PO-PTS-202610-001',
    orderDate: '2026-10-19',
    estimatedDeliveryDate: '2026-10-20',
    productId: 'prod-pertamax-92',
    productName: 'Pertamax 92',
    volumeKL: 2,
    volumeLiters: 2000,
    buyPricePerLiter: 15046,
    totalAmount: 30092000,
    supplyDepot: 'TBBM Rewulu',
    truckPlateNumber: 'AD 8492 FB',
    driverName: 'Pak Joso',
    status: 'DIPESAN',
    createdAt: '2026-10-19 10:00',
  };

  const baseProps = {
    onClose: vi.fn(),
    tank,
    onCompleteReceiving: vi.fn(),
  };

  it('TIDAK CRASH saat order berubah dari null (tertutup) menjadi terisi (terbuka) - regresi React error #310', () => {
    // Pola ini PERSIS mensimulasikan bagaimana App.tsx memakai komponen ini: selalu ter-render,
    // dengan `order` berpindah dari null ke objek sungguhan saat pengguna klik "Bongkar".
    const { rerender } = render(<ReceiveFuelModal {...baseProps} isOpen={false} order={null} />);
    expect(() => {
      rerender(<ReceiveFuelModal {...baseProps} isOpen={true} order={order} />);
    }).not.toThrow();
    expect(screen.getByText(/Penerimaan & Bongkar BBM DO/i)).toBeInTheDocument();
  });

  it('render null saat isOpen=false (tidak menampilkan apa pun)', () => {
    const { container } = render(<ReceiveFuelModal {...baseProps} isOpen={false} order={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('field sounding sebelum bongkar terisi otomatis dari stok tangki saat ini', () => {
    render(<ReceiveFuelModal {...baseProps} isOpen={true} order={order} />);
    const soundingBeforeInput = screen.getAllByRole('spinbutton')[1]; // index 0 = tanggal (date input beda role)
    expect((soundingBeforeInput as HTMLInputElement).value).toBe('1000');
  });
});
