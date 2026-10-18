import { useEffect, useRef } from 'react';

/**
 * Hook aksesibilitas bersama untuk semua modal di aplikasi ini.
 *
 * Ditemukan lewat audit WCAG 2.1 AA: SELURUH modal (17 file) tidak punya tiga hal dasar
 * yang wajib untuk dialog modal menurut ARIA Authoring Practices:
 *   1. Tombol Escape tidak menutup modal sama sekali.
 *   2. Tidak ada focus trap - menekan Tab berulang kali membuat fokus keyboard "bocor"
 *      ke tombol-tombol di halaman BELAKANG modal yang sedang terbuka (terverifikasi:
 *      dari 40x Tab, 27 di antaranya lolos ke elemen di belakang modal).
 *   3. Tidak ada role="dialog"/aria-modal - pembaca layar tidak tahu sedang masuk ke dialog.
 *
 * Daripada menduplikasi logika ini di 17 file terpisah (dan berisiko sebagian keliru/
 * terlewat seperti yang sudah beberapa kali terjadi dengan logika bisnis di proyek ini),
 * satu hook ini dipakai bersama. Pemakaian:
 *
 *   const { containerRef, titleId } = useModalA11y(isOpen, onClose);
 *   <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
 *     <h2 id={titleId}>Judul Modal</h2>
 *     ...
 *   </div>
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      if (!containerRef.current) return [];
      const selector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const nodeList = containerRef.current.querySelectorAll(selector);
      const all: HTMLElement[] = [];
      nodeList.forEach((node) => all.push(node as HTMLElement));
      return all.filter((el) => el.offsetParent !== null); // sembunyikan elemen yang tidak terlihat (display:none dsb.)
    };

    // Pindahkan fokus ke dalam modal saat dibuka, supaya pembaca layar/keyboard langsung
    // berada di konteks dialog, bukan tertinggal di halaman belakang.
    const focusables = getFocusable();
    (focusables[0] || containerRef.current)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Kunci fokus di dalam modal (focus trap): dari elemen terakhir + Tab -> balik ke
      // elemen pertama; dari elemen pertama + Shift+Tab -> loncat ke elemen terakhir.
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Kembalikan fokus ke elemen yang tadi memicu modal, supaya pengguna keyboard tidak
      // "kehilangan tempat" setelah modal ditutup.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  return { containerRef, titleId };
}
