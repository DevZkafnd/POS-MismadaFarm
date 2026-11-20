import { describe, expect, it } from "vitest";
import {
  bulatTiga,
  hitungSelisihOpname,
  perluAlasan,
  ringkasOpname,
  semuaAlasanLengkap,
  type BarisOpname,
} from "@/lib/domain/opname";

const baris = (
  idBarang: number,
  stokSistem: number,
  stokFisik: number,
  alasan: string | null = null,
): BarisOpname => ({ idBarang, stokSistem, stokFisik, alasan });

describe("hitungSelisihOpname", () => {
  it("menghitung selisih fisik dikurangi sistem", () => {
    expect(hitungSelisihOpname(10, 12)).toBe(2);
    expect(hitungSelisihOpname(10, 7)).toBe(-3);
    expect(hitungSelisihOpname(5, 5)).toBe(0);
  });

  it("membulatkan hasil ke 3 desimal", () => {
    expect(hitungSelisihOpname(0.1, 0.3)).toBe(0.2);
  });
});

describe("perluAlasan", () => {
  it("wajib alasan hanya bila selisih tidak nol (BR-08)", () => {
    expect(perluAlasan(0)).toBe(false);
    expect(perluAlasan(0.0001)).toBe(false); // dibulatkan jadi 0
    expect(perluAlasan(1)).toBe(true);
    expect(perluAlasan(-1)).toBe(true);
  });
});

describe("semuaAlasanLengkap", () => {
  it("lolos bila semua baris berselisih punya alasan", () => {
    expect(
      semuaAlasanLengkap([baris(1, 10, 10), baris(2, 5, 3, "rusak"), baris(3, 2, 4, "salah catat")]),
    ).toBe(true);
  });

  it("gagal bila ada selisih tanpa alasan atau alasan kosong", () => {
    expect(semuaAlasanLengkap([baris(1, 10, 8)])).toBe(false);
    expect(semuaAlasanLengkap([baris(1, 10, 8, "   ")])).toBe(false);
  });
});

describe("ringkasOpname", () => {
  it("meringkas jumlah baris, baris berselisih, dan total selisih", () => {
    const ringkas = ringkasOpname([baris(1, 10, 12), baris(2, 5, 5), baris(3, 8, 6)]);
    expect(ringkas).toEqual({ totalBaris: 3, barisBerselisih: 2, totalSelisih: 0 });
  });
});

describe("bulatTiga", () => {
  it("membulatkan nilai pecahan ke 3 desimal", () => {
    expect(bulatTiga(1.23456)).toBe(1.235);
    expect(bulatTiga(0.1 + 0.2)).toBe(0.3);
  });
});
