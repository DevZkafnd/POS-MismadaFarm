import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  bikinCsv,
  bikinCsvLaporan,
  bikinExcel,
  bikinPdf,
  susunSeksiLaporan,
  type DataLaporan,
} from "@/lib/domain/ekspor";

const contoh: DataLaporan = {
  periode: { dari: "2026-11-01", sampai: "2026-11-20" },
  konsolidasi: { omzet: 500_000, labaKotor: 200_000, pengeluaran: 50_000, labaBersih: 150_000 },
  perLini: [
    { namaLini: "Pupuk", omzet: 300_000, labaKotor: 120_000, pengeluaran: 20_000, labaRugi: 100_000 },
  ],
  marginBarang: [
    {
      namaBarang: "Urea",
      hargaJual: 12_000,
      hargaBeli: 9_000,
      marginPersen: 25,
      terjual: 10,
      omzet: 120_000,
      labaKotor: 30_000,
    },
  ],
};

describe("bikinCsv", () => {
  it("menyusun header dan baris dengan pemisah titik-koma", () => {
    const csv = bikinCsv(
      ["Nama", "Jumlah"],
      [
        ["Beras", 12000],
        ["Pupuk", 45000],
      ],
    );
    expect(csv).toBe("Nama;Jumlah\r\nBeras;12000\r\nPupuk;45000");
  });

  it("mengutip sel yang memuat pemisah, kutip, atau baris baru", () => {
    const csv = bikinCsv(["Ket"], [['ada; titik "koma"'], ["baris\nbaru"]]);
    expect(csv).toBe('Ket\r\n"ada; titik ""koma"""\r\n"baris\nbaru"');
  });

  it("mengosongkan sel null/undefined", () => {
    expect(bikinCsv(["a", "b"], [[null, undefined]])).toBe("a;b\r\n;");
  });
});

describe("susunSeksiLaporan (F13)", () => {
  it("menyusun tiga seksi: ringkasan, per lini, margin barang", () => {
    const seksi = susunSeksiLaporan(contoh);
    expect(seksi.map((s) => s.judul)).toEqual([
      "Ringkasan (periode 2026-11-01 s.d. 2026-11-20)",
      "Laba-Rugi per Lini Usaha",
      "Margin per Barang",
    ]);
    expect(seksi[0].baris).toEqual([
      ["Omzet", 500_000],
      ["Laba kotor", 200_000],
      ["Pengeluaran", 50_000],
      ["Laba bersih", 150_000],
    ]);
    expect(seksi[1].baris[0]).toEqual(["Pupuk", 300_000, 120_000, 20_000, 100_000]);
    expect(seksi[2].baris[0][0]).toBe("Urea");
  });

  it("memakai tanda '-' bila periode kosong", () => {
    const seksi = susunSeksiLaporan({ ...contoh, periode: { dari: null, sampai: null } });
    expect(seksi[0].judul).toBe("Ringkasan (periode - s.d. -)");
  });
});

describe("bikinCsvLaporan", () => {
  it("menggabungkan seksi dengan baris kosong pemisah", () => {
    const csv = bikinCsvLaporan(susunSeksiLaporan(contoh));
    expect(csv).toContain("Ringkasan (periode 2026-11-01 s.d. 2026-11-20)");
    expect(csv).toContain("Keterangan;Nilai");
    expect(csv).toContain("Pupuk;300000;120000;20000;100000");
    expect(csv.split("\r\n\r\n")).toHaveLength(3);
  });
});

describe("bikinExcel (F13)", () => {
  it(
    "menghasilkan berkas .xlsx (arsip ZIP) yang tidak kosong",
    async () => {
      const bytes = await bikinExcel(susunSeksiLaporan(contoh));
      expect(bytes.length).toBeGreaterThan(0);
      // Berkas .xlsx adalah arsip ZIP → signature "PK".
      expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
    },
    30_000,
  );
});

describe("bikinPdf (F13)", () => {
  it("menghasilkan PDF sah yang bisa dibuka ulang pdf-lib", async () => {
    const bytes = await bikinPdf(susunSeksiLaporan(contoh));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("tidak melempar galat untuk karakter di luar WinAnsi", async () => {
    const seksi = susunSeksiLaporan({
      ...contoh,
      marginBarang: [
        { ...contoh.marginBarang[0], namaBarang: "Pupuk ½ – khusus™" },
      ],
    });
    const bytes = await bikinPdf(seksi);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
