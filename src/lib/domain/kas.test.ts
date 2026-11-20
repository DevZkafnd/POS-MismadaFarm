import { describe, expect, it } from "vitest";
import { bolehKunciRekap, hitungKasSeharusnya, hitungSelisihKas } from "@/lib/domain/kas";

describe("hitungKasSeharusnya (BR-09)", () => {
  it("menjumlahkan kas awal, penjualan tunai, dan pelunasan lalu mengurangi pengeluaran", () => {
    const kas = hitungKasSeharusnya({
      kasAwal: 100_000,
      penjualanTunai: 500_000,
      pelunasanPiutang: 50_000,
      pengeluaranTunai: 30_000,
      pembayaranPemasokTunai: 20_000,
    });
    expect(kas).toBe(600_000);
  });

  it("kasbon yang belum dilunasi tidak menambah kas (pelunasan 0)", () => {
    const kas = hitungKasSeharusnya({
      kasAwal: 0,
      penjualanTunai: 0,
      pelunasanPiutang: 0,
      pengeluaranTunai: 0,
      pembayaranPemasokTunai: 0,
    });
    expect(kas).toBe(0);
  });
});

describe("hitungSelisihKas", () => {
  it("menghitung selisih fisik dikurangi seharusnya, termasuk selisih negatif", () => {
    expect(hitungSelisihKas(595_000, 600_000)).toBe(-5_000);
    expect(hitungSelisihKas(605_000, 600_000)).toBe(5_000);
    expect(hitungSelisihKas(600_000, 600_000)).toBe(0);
  });
});

describe("bolehKunciRekap (BR-09)", () => {
  it("selisih nol boleh dikunci tanpa keterangan", () => {
    expect(bolehKunciRekap(0, null)).toBe(true);
  });

  it("selisih bukan nol wajib punya keterangan", () => {
    expect(bolehKunciRekap(-5_000, "")).toBe(false);
    expect(bolehKunciRekap(-5_000, "   ")).toBe(false);
    expect(bolehKunciRekap(-5_000, "uang kembalian salah hitung")).toBe(true);
  });
});
