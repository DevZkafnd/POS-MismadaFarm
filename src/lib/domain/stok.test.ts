import { describe, expect, it } from "vitest";
import {
  alokasiFefo,
  hitungKembalian,
  hitungTotal,
  urutkanFefo,
  type BatchStok,
} from "@/lib/domain/stok";

const batch = (idBatch: number, jumlahSisa: number, tglKedaluwarsa: string | null): BatchStok => ({
  idBatch,
  jumlahSisa,
  tglKedaluwarsa,
});

describe("urutkanFefo", () => {
  it("mengurutkan kedaluwarsa terdekat dulu dan tanpa kedaluwarsa paling akhir", () => {
    const hasil = urutkanFefo([
      batch(3, 5, null),
      batch(2, 5, "2026-12-01"),
      batch(1, 5, "2026-06-01"),
    ]);
    expect(hasil.map((b) => b.idBatch)).toEqual([1, 2, 3]);
  });

  it("memakai idBatch sebagai pemecah seri bila kedaluwarsa sama", () => {
    const hasil = urutkanFefo([batch(9, 1, "2026-06-01"), batch(4, 1, "2026-06-01")]);
    expect(hasil.map((b) => b.idBatch)).toEqual([4, 9]);
  });
});

describe("alokasiFefo", () => {
  it("mengambil dari batch kedaluwarsa terdekat lebih dulu", () => {
    const hasil = alokasiFefo(
      [batch(1, 3, "2026-06-01"), batch(2, 10, "2026-12-01"), batch(3, 10, null)],
      5,
    );
    expect(hasil.alokasi).toEqual([
      { idBatch: 1, jumlah: 3 },
      { idBatch: 2, jumlah: 2 },
    ]);
    expect(hasil.kurang).toBe(0);
  });

  it("melaporkan kekurangan stok tanpa membuang alokasi yang ada", () => {
    const hasil = alokasiFefo([batch(1, 2, "2026-06-01"), batch(2, 1, "2026-12-01")], 5);
    expect(hasil.alokasi).toEqual([
      { idBatch: 1, jumlah: 2 },
      { idBatch: 2, jumlah: 1 },
    ]);
    expect(hasil.kurang).toBe(2);
  });

  it("mengabaikan batch kosong dan tetap memakai batch tanpa kedaluwarsa", () => {
    const hasil = alokasiFefo([batch(1, 0, "2026-06-01"), batch(2, 7, null)], 4);
    expect(hasil.alokasi).toEqual([{ idBatch: 2, jumlah: 4 }]);
    expect(hasil.kurang).toBe(0);
  });

  it("mendukung jumlah pecahan (barang per kg)", () => {
    const hasil = alokasiFefo([batch(1, 0.4, "2026-06-01"), batch(2, 5, null)], 1.2);
    expect(hasil.alokasi).toHaveLength(2);
    expect(hasil.alokasi[0]).toEqual({ idBatch: 1, jumlah: 0.4 });
    expect(hasil.alokasi[1].idBatch).toBe(2);
    expect(hasil.alokasi[1].jumlah).toBeCloseTo(0.8, 10);
    expect(hasil.kurang).toBe(0);
  });
});

describe("hitungTotal & hitungKembalian", () => {
  it("menjumlahkan baris dan membulatkan ke rupiah bulat", () => {
    expect(
      hitungTotal([
        { hargaSatuan: 66000, jumlah: 1 },
        { hargaSatuan: 5000, jumlah: 0.3 },
      ]),
    ).toBe(67500);
  });

  it("menghitung kembalian dan tidak pernah negatif", () => {
    expect(hitungKembalian(67500, 100000)).toBe(32500);
    expect(hitungKembalian(67500, 50000)).toBe(0);
  });
});
