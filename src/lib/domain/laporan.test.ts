import { describe, expect, it } from "vitest";
import {
  labaBersih,
  labaKotorBaris,
  labaKotorTotal,
  labaRugiLini,
  marginPersen,
  omzetTotal,
} from "@/lib/domain/laporan";

describe("laba kotor (BR-10)", () => {
  it("menghitung laba satu baris dibulatkan ke rupiah bulat", () => {
    expect(labaKotorBaris({ hargaSatuan: 10_000, hargaBeliSaatItu: 7_500, jumlah: 3 })).toBe(7_500);
  });

  it("mendukung jumlah pecahan (barang per kg)", () => {
    expect(
      labaKotorBaris({ hargaSatuan: 10_000, hargaBeliSaatItu: 8_000, jumlah: 1.5 }),
    ).toBe(3_000);
  });

  it("menjumlahkan laba kotor dan omzet seluruh baris", () => {
    const baris = [
      { hargaSatuan: 10_000, hargaBeliSaatItu: 6_000, jumlah: 2 },
      { hargaSatuan: 5_000, hargaBeliSaatItu: 5_000, jumlah: 4 },
    ];
    expect(labaKotorTotal(baris)).toBe(8_000);
    expect(omzetTotal(baris)).toBe(40_000);
  });
});

describe("laba-rugi per lini & laba bersih (BR-10)", () => {
  it("mengurangi laba kotor lini dengan pengeluaran lini", () => {
    expect(labaRugiLini(100_000, 30_000)).toBe(70_000);
    expect(labaRugiLini(10_000, 40_000)).toBe(-30_000);
  });

  it("laba bersih = laba kotor total − seluruh pengeluaran", () => {
    expect(labaBersih(500_000, 120_000)).toBe(380_000);
  });
});

describe("marginPersen", () => {
  it("menghitung margin dengan 2 desimal", () => {
    expect(marginPersen(10_000, 7_500)).toBe(25);
    expect(marginPersen(30_000, 20_000)).toBe(33.33);
  });

  it("mengembalikan 0 bila harga jual nol", () => {
    expect(marginPersen(0, 5_000)).toBe(0);
  });
});
