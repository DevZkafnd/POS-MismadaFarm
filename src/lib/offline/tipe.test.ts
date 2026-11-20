import { describe, expect, it } from "vitest";
import { ambilBelumSinkron, pesanAntrean, type ItemAntrean } from "@/lib/offline/tipe";

function item(id: string, dibuatPada: number, status: ItemAntrean["status"]): ItemAntrean {
  return { id, muatan: {}, dibuatPada, status };
}

describe("ambilBelumSinkron", () => {
  it("hanya mengambil status belum_sinkron dan mengurutkan berdasarkan waktu", () => {
    const hasil = ambilBelumSinkron([
      item("b", 200, "belum_sinkron"),
      item("a", 100, "belum_sinkron"),
      item("c", 300, "tersinkron"),
      item("d", 150, "gagal"),
    ]);
    expect(hasil.map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("pesanAntrean", () => {
  it("memberi tahu jumlah antrean atau status tersinkron", () => {
    expect(pesanAntrean(0)).toBe("Semua transaksi tersinkron");
    expect(pesanAntrean(3)).toContain("3");
  });
});
