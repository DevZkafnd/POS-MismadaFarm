import { describe, expect, it } from "vitest";
import { arahStokRetur, nilaiRetur } from "@/lib/domain/retur";

describe("nilaiRetur", () => {
  it("menghitung nilai dari harga satuan asal dan jumlah", () => {
    expect(nilaiRetur(2, 15000)).toBe(30000);
    expect(nilaiRetur(0.5, 20000)).toBe(10000);
  });

  it("membulatkan ke rupiah bulat", () => {
    expect(nilaiRetur(0.3, 5000)).toBe(1500);
    expect(Number.isInteger(nilaiRetur(1.7, 3333))).toBe(true);
  });
});

describe("arahStokRetur", () => {
  it("retur pelanggan menambah stok, retur pemasok mengurangi", () => {
    expect(arahStokRetur("pelanggan")).toBe(1);
    expect(arahStokRetur("pemasok")).toBe(-1);
  });
});
