/**
 * Pembuatan berkas ekspor laporan (F13 / FR-15). Fungsi murni + renderer.
 *
 * Struktur laporan disusun sekali lewat `susunSeksiLaporan` (murni, mudah diuji),
 * lalu dirender ke CSV, Excel (.xlsx), dan PDF:
 * - CSV  : pemisah `;` agar ramah Excel berlokal Indonesia (koma = desimal).
 * - Excel: `exceljs` (keputusan teknologi panduan).
 * - PDF  : `pdf-lib` (keputusan teknologi panduan).
 *
 * `exceljs` dan `pdf-lib` diimpor secara dinamis supaya tidak membebani bundle
 * awal halaman; keduanya baru dimuat saat tombol ekspor ditekan.
 */

export type Sel = string | number;

/** Satu bagian laporan (judul + kolom + baris). */
export type SeksiLaporan = {
  judul: string;
  kolom: string[];
  baris: Sel[][];
};

/** Data laporan yang dibutuhkan ekspor (bagian dari respons GET /api/laporan). */
export type DataLaporan = {
  periode: { dari: string | null; sampai: string | null };
  konsolidasi: {
    omzet: number;
    labaKotor: number;
    pengeluaran: number;
    labaBersih: number;
  };
  perLini: {
    namaLini: string;
    omzet: number;
    labaKotor: number;
    pengeluaran: number;
    labaRugi: number;
  }[];
  marginBarang: {
    namaBarang: string;
    hargaJual: number;
    hargaBeli: number;
    marginPersen: number;
    terjual: number;
    omzet: number;
    labaKotor: number;
  }[];
};

function escapeSel(nilai: string | number | null | undefined): string {
  const s = nilai === null || nilai === undefined ? "" : String(nilai);
  return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Susun teks CSV dari header dan baris data. */
export function bikinCsv(
  header: string[],
  baris: (string | number | null | undefined)[][],
): string {
  return [header, ...baris].map((r) => r.map(escapeSel).join(";")).join("\r\n");
}

/** Susun seluruh seksi laporan dari data (fungsi murni). */
export function susunSeksiLaporan(data: DataLaporan): SeksiLaporan[] {
  const periode = `${data.periode.dari ?? "-"} s.d. ${data.periode.sampai ?? "-"}`;
  return [
    {
      judul: `Ringkasan (periode ${periode})`,
      kolom: ["Keterangan", "Nilai"],
      baris: [
        ["Omzet", data.konsolidasi.omzet],
        ["Laba kotor", data.konsolidasi.labaKotor],
        ["Pengeluaran", data.konsolidasi.pengeluaran],
        ["Laba bersih", data.konsolidasi.labaBersih],
      ],
    },
    {
      judul: "Laba-Rugi per Lini Usaha",
      kolom: ["Lini Usaha", "Omzet", "Laba Kotor", "Pengeluaran", "Laba/Rugi"],
      baris: data.perLini.map((l) => [
        l.namaLini,
        l.omzet,
        l.labaKotor,
        l.pengeluaran,
        l.labaRugi,
      ]),
    },
    {
      judul: "Margin per Barang",
      kolom: ["Barang", "Harga Jual", "Harga Beli", "Margin (%)", "Terjual", "Omzet", "Laba Kotor"],
      baris: data.marginBarang.map((b) => [
        b.namaBarang,
        b.hargaJual,
        b.hargaBeli,
        b.marginPersen,
        b.terjual,
        b.omzet,
        b.labaKotor,
      ]),
    },
  ];
}

/** Rangkai seluruh seksi menjadi satu teks CSV. */
export function bikinCsvLaporan(seksi: SeksiLaporan[]): string {
  return seksi.map((s) => bikinCsv([s.judul], [s.kolom, ...s.baris])).join("\r\n\r\n");
}

/** Render seluruh seksi menjadi berkas Excel (.xlsx). */
export async function bikinExcel(seksi: SeksiLaporan[]): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan");

  seksi.forEach((s, i) => {
    if (i > 0) ws.addRow([]);
    ws.addRow([s.judul]).font = { bold: true };
    ws.addRow(s.kolom).font = { bold: true };
    for (const b of s.baris) ws.addRow(b);
  });

  // Lebar kolom sederhana: ikuti kolom terpanjang tiap seksi.
  const lebarPerKolom: number[] = [];
  for (const s of seksi) {
    [s.kolom, ...s.baris].forEach((baris) => {
      baris.forEach((sel, c) => {
        const panjang = String(sel).length + 2;
        lebarPerKolom[c] = Math.min(40, Math.max(lebarPerKolom[c] ?? 10, panjang));
      });
    });
  }
  lebarPerKolom.forEach((w, c) => {
    ws.getColumn(c + 1).width = w;
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

const LEBAR_A4 = 595.28;
const TINGGI_A4 = 841.89;
const MARGIN = 40;
const LEBAR_KONTEN = LEBAR_A4 - MARGIN * 2;

/**
 * Ganti karakter di luar jangkauan font standar (WinAnsi) dengan "?" agar
 * `drawText` tidak melempar galat saat data berisi karakter tak terduga.
 */
function amanWinAnsi(teks: string): string {
  return teks.replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "?");
}

/** Potong teks agar muat dalam lebar kolom (titik). */
function potongTeks(
  teks: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  ukuran: number,
  lebarMaks: number,
): string {
  if (font.widthOfTextAtSize(teks, ukuran) <= lebarMaks) return teks;
  let s = teks;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, ukuran) > lebarMaks) {
    s = s.slice(0, -1);
  }
  return `${s}...`;
}

/** Render seluruh seksi menjadi berkas PDF A4. */
export async function bikinPdf(seksi: SeksiLaporan[]): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontTebal = await doc.embedFont(StandardFonts.HelveticaBold);

  let halaman = doc.addPage([LEBAR_A4, TINGGI_A4]);
  let y = TINGGI_A4 - MARGIN;

  const barisBaru = () => {
    halaman = doc.addPage([LEBAR_A4, TINGGI_A4]);
    y = TINGGI_A4 - MARGIN;
  };

  halaman.drawText(amanWinAnsi("Laporan Mismada Farm"), {
    x: MARGIN,
    y,
    size: 14,
    font: fontTebal,
  });
  y -= 24;

  for (const s of seksi) {
    const ukuran = 9;
    const tinggiBaris = 14;
    const lebarKolom = LEBAR_KONTEN / s.kolom.length;

    // Judul seksi
    if (y - tinggiBaris < MARGIN) barisBaru();
    halaman.drawText(amanWinAnsi(s.judul), { x: MARGIN, y, size: 11, font: fontTebal });
    y -= tinggiBaris + 2;

    const tulisBaris = (baris: Sel[], tebal: boolean) => {
      if (y - tinggiBaris < MARGIN) barisBaru();
      baris.forEach((sel, c) => {
        const teks = amanWinAnsi(String(sel));
        const angka = typeof sel === "number";
        const f = tebal ? fontTebal : font;
        const potong = potongTeks(teks, f, ukuran, lebarKolom - 6);
        const lebar = f.widthOfTextAtSize(potong, ukuran);
        const x = angka
          ? MARGIN + lebarKolom * (c + 1) - 6 - lebar
          : MARGIN + lebarKolom * c;
        halaman.drawText(potong, {
          x: Math.max(MARGIN, x),
          y,
          size: ukuran,
          font: f,
          color: rgb(0.1, 0.1, 0.1),
        });
      });
      y -= tinggiBaris;
    };

    tulisBaris(s.kolom, true);
    for (const b of s.baris) tulisBaris(b, false);
    y -= 10;
  }

  return doc.save();
}
