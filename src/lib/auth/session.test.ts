import { describe, expect, it, vi } from "vitest";

// `session.ts` mengimpor `next/headers` yang hanya tersedia di runtime Next.
// Bajai modulnya agar fungsi tanda tangan murni bisa diuji di lingkungan node.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

import { PERAN } from "@/lib/auth/peran";
import { bacaTokenSesi, buatTokenSesi, sesiBaru } from "@/lib/auth/session";

describe("token sesi (HMAC)", () => {
  it("bolak-balik: token yang dibuat bisa dibaca kembali", () => {
    const sesi = sesiBaru({
      idPengguna: 7,
      nama: "Penerus Usaha",
      username: "penerus",
      peran: PERAN.PENERUS_USAHA,
    });
    const token = buatTokenSesi(sesi);
    const dibaca = bacaTokenSesi(token);

    expect(dibaca).not.toBeNull();
    expect(dibaca?.idPengguna).toBe(7);
    expect(dibaca?.peran).toBe(PERAN.PENERUS_USAHA);
  });

  it("menolak token yang diubah (tanda tangan tidak cocok)", () => {
    const sesi = sesiBaru({
      idPengguna: 1,
      nama: "Pemilik Toko",
      username: "pemilik",
      peran: PERAN.PEMILIK,
    });
    const token = buatTokenSesi(sesi);

    expect(bacaTokenSesi(`${token}x`)).toBeNull();
    expect(bacaTokenSesi("bukan.token")).toBeNull();
    expect(bacaTokenSesi("")).toBeNull();
  });

  it("menolak sesi yang sudah kedaluwarsa", () => {
    const token = buatTokenSesi({
      idPengguna: 1,
      nama: "Kasir",
      username: "kasir",
      peran: PERAN.KASIR,
      kedaluwarsa: 1, // 1 Januari 1970
    });
    expect(bacaTokenSesi(token)).toBeNull();
  });
});
