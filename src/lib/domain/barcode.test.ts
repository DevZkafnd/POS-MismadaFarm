import { describe, expect, it } from "vitest";
import { cocokkanBarcode, pesanHasilBarcode, type BarangRingkas } from "@/lib/domain/barcode";

const DAFTAR: BarangRingkas[] = [
  {
    idBarang: 1,
    kodeBarcode: "8991000000001",
    namaBarang: "Beras Premium 5kg",
    satuan: "sak",
    tipe: "barang",
    hargaJualAktif: 66000,
    idLini: 1,
  },
  {
    idBarang: 2,
    kodeBarcode: null,
    namaBarang: "Jasa Sewa Traktor",
    satuan: "hari",
    tipe: "jasa",
    hargaJualAktif: 350000,
    idLini: 4,
  },
];

describe("cocokkanBarcode", () => {
  it("menemukan barang dengan barcode sama", () => {
    const hasil = cocokkanBarcode("8991000000001", DAFTAR);
    expect(hasil.jenis).toBe("ditemukan");
    if (hasil.jenis !== "ditemukan") return;
    expect(hasil.barang.namaBarang).toBe("Beras Premium 5kg");
  });

  it("mengabaikan spasi di ujung kode", () => {
    expect(cocokkanBarcode("  8991000000001 ", DAFTAR).jenis).toBe("ditemukan");
  });

  it("melaporkan kode tak dikenal tanpa menambah barang", () => {
    const hasil = cocokkanBarcode("0000000000000", DAFTAR);
    expect(hasil.jenis).toBe("tidak_ditemukan");
    if (hasil.jenis !== "tidak_ditemukan") return;
    expect(hasil.kode).toBe("0000000000000");
  });

  it("menganggap kode kosong sebagai tidak sah", () => {
    expect(cocokkanBarcode("   ", DAFTAR).jenis).toBe("kode_kosong");
  });

  it("memberi pesan siap tampil untuk tiap hasil", () => {
    expect(pesanHasilBarcode({ jenis: "kode_kosong" })).toMatch(/tidak terbaca/);
    expect(pesanHasilBarcode({ jenis: "tidak_ditemukan", kode: "123" })).toMatch(/belum terdaftar/);
    expect(pesanHasilBarcode({ jenis: "ditemukan", barang: DAFTAR[0] })).toMatch(/Ditemukan/);
  });
});
