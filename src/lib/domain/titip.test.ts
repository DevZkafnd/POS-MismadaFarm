import { describe, expect, it } from "vitest";
import { kewajibanTitip, statusTitipDari, tambahLaku } from "@/lib/domain/titip";

describe("kewajibanTitip", () => {
  it("menghitung jumlah laku × harga titip tanpa komisi (BR-07)", () => {
    expect(kewajibanTitip(0, 5000)).toBe(0);
    expect(kewajibanTitip(3, 5000)).toBe(15000);
    expect(kewajibanTitip(1.5, 4000)).toBe(6000);
  });
});

describe("tambahLaku", () => {
  it("menambah jumlah laku", () => {
    expect(tambahLaku(0, 10, 3)).toBe(3);
    expect(tambahLaku(2, 10, 4)).toBe(6);
  });

  it("tidak melebihi jumlah titip", () => {
    expect(tambahLaku(9, 10, 5)).toBe(10);
    expect(tambahLaku(10, 10, 1)).toBe(10);
  });

  it("mengabaikan tambahan negatif", () => {
    expect(tambahLaku(3, 10, -2)).toBe(3);
  });
});

describe("statusTitipDari", () => {
  it("selesai bila seluruh jumlah titip sudah laku", () => {
    expect(statusTitipDari(0, 10)).toBe("aktif");
    expect(statusTitipDari(9, 10)).toBe("aktif");
    expect(statusTitipDari(10, 10)).toBe("selesai");
  });
});
