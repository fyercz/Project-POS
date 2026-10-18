import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// PENTING: test ini TIDAK menjalankan file .bat (sandbox Linux tidak punya cmd.exe).
// Ini adalah pemeriksaan STATIS yang mengkodekan setiap akar masalah nyata yang pernah
// menyebabkan Pertashop.bat / update.bat tertutup mendadak (force-close) di Windows:
//   1. Line ending harus CRLF murni (LF murni terbukti membuat cmd.exe tersandung
//      di blok if/for multi-baris).
//   2. Tidak boleh ada "chcp 65001" (terbukti membuat sebagian build Windows keluar
//      mendadak tanpa pesan, tepat di baris itu).
//   3. Tanda kurung harus seimbang (indikasi blok if/for tidak terpotong).
//   4. Setiap "goto LABEL" harus punya ":LABEL" yang valid di file yang sama.
//   5. Tidak boleh ada pola "cmd.exe /c" dengan tanda kutip bersarang tiga lapis
//      (pola rawan yang pernah menyebabkan relaunch gagal diam-diam).
//
// Jalankan perubahan apa pun ke file-file ini di komputer Windows sungguhan untuk
// verifikasi akhir - lihat README.md bagian "Menguji skrip .bat" untuk caranya.

const BATCH_FILES = ['Pertashop.bat', 'update.bat'];
const ROOT = join(__dirname, '../..');

describe.each(BATCH_FILES)('%s', (filename) => {
  const filePath = join(ROOT, filename);
  const raw = readFileSync(filePath);
  const text = raw.toString('utf-8');

  it('memakai line ending CRLF murni (bukan LF, bukan campuran)', () => {
    const crlfCount = (raw.toString('binary').match(/\r\n/g) || []).length;
    const totalLf = (raw.toString('binary').match(/\n/g) || []).length;
    expect(crlfCount).toBe(totalLf);
    expect(crlfCount).toBeGreaterThan(0);
  });

  it('tidak memakai "chcp 65001" (riwayat: pernah menyebabkan force-close tanpa pesan)', () => {
    const hasChcp = /^\s*chcp\s+65001/im.test(text);
    expect(hasChcp).toBe(false);
  });

  it('tanda kurung "(" dan ")" seimbang', () => {
    const open = (text.match(/\(/g) || []).length;
    const close = (text.match(/\)/g) || []).length;
    expect(open).toBe(close);
  });

  it('setiap "goto LABEL" punya ":LABEL" yang valid di file yang sama', () => {
    const gotoTargets = new Set(
      [...text.matchAll(/goto\s+(\w+)/gi)].map((m) => m[1].toUpperCase())
    );
    const labels = new Set(
      [...text.matchAll(/^:(\w+)/gm)].map((m) => m[1].toUpperCase())
    );
    const missing = [...gotoTargets].filter((t) => !labels.has(t));
    expect(missing).toEqual([]);
  });

  it('tidak memakai pola "cmd.exe /c" dengan tanda kutip bersarang rawan', () => {
    // Pola spesifik yang pernah dipakai dan terbukti rawan: cmd.exe /c ""...
    const hasFragilePattern = /cmd\.exe\s+\/c\s+""/i.test(text);
    expect(hasFragilePattern).toBe(false);
  });
});

describe('update.bat (khusus)', () => {
  const text = readFileSync(join(ROOT, 'update.bat'), 'utf-8');

  it('tidak memakai "setlocal enabledelayedexpansion" (sumber kompleksitas yang tidak perlu di sini)', () => {
    expect(/enabledelayedexpansion/i.test(text)).toBe(false);
  });

  it('berpindah ke salinan %TEMP% tanpa "call" (perpindahan permanen, bukan subroutine)', () => {
    expect(text).toMatch(/"%TEMP%\\pertashop-update\.bat"\s+--dari-temp/i);
  });
});

describe('Pertashop.bat (khusus)', () => {
  const text = readFileSync(join(ROOT, 'Pertashop.bat'), 'utf-8');

  it('tidak pernah memanggil update.bat dengan "call" (self-overwrite hazard)', () => {
    expect(/call\s+update\.bat/i.test(text)).toBe(false);
  });

  it('membuka update.bat di proses terpisah ("start") lalu langsung keluar', () => {
    expect(text).toMatch(/start\s+"[^"]*"\s+"update\.bat"/i);
  });
});
