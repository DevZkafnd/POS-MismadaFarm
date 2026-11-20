import { describe, expect, it } from "vitest";
import { statusDariSaldo } from "@/lib/domain/saldo";

describe("statusDariSaldo", () => {
  it("belum bila saldo masih penuh", () => {
    expect(statusDariSaldo(100_000, 100_000)).toBe("belum");
  });

  it("sebagian bila sudah dicicil sebagian", () => {
    expect(statusDariSaldo(40_000, 100_000)).toBe("sebagian");
  });

  it("lunas bila saldo habis", () => {
    expect(statusDariSaldo(0, 100_000)).toBe("lunas");
    expect(statusDariSaldo(-1, 100_000)).toBe("lunas");
  });
});
