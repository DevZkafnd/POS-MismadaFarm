import { describe, expect, it } from "vitest";
import { cariBarcodeDuplikat, validasiBarisBarang } from "@/lib/validasi/barang";

const PETA_LINI = { kelontong: 1, "pupuk subsidi": 2, "sewa traktor": 4 };

describe("validasiBarisBarang", () => {
  it("menerima baris yang sah dan mengubah angka menjadi number", () => {
    const hasil = validasiBarisBarang(
      {
        kode_barcode: "8991000000001",
        nama_barang: "Beras Premium 5kg",
        lini: "Kelontong",
        tipe: "barang",
        satuan: "sak",
        harga_jual_aktif: "65000",
        harga_beli_terakhir: "58000",
        stok_minimum: "3",
        stok_awal: "20",
        favorit: "Ya",
        cepat_rusak: "tidak",
      },
      PETA_LINI,
    );

    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.data.idLini).toBe(1);
    expect(hasil.data.hargaJualAktif).toBe(65000);
    expect(hasil.data.stokAwal).toBe(20);
    expect(hasil.data.favorit).toBe(true);
    expect(hasil.data.cepatRusak).toBe(false);
  });

  it("menolak nama kosong, satuan tak dikenal, dan lini tak dikenal", () => {
    const hasil = validasiBarisBarang(
      {
        kode_barcode: "",
        nama_barang: "  ",
        lini: "elektronik",
        tipe: "barang",
        satuan: "kotak",
        harga_jual_aktif: "seribu",
      },
      PETA_LINI,
    );

    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.galat.join(" ")).toMatch(/nama_barang kosong/);
    expect(hasil.galat.join(" ")).toMatch(/satuan tidak dikenal/);
    expect(hasil.galat.join(" ")).toMatch(/lini tidak dikenal/);
    expect(hasil.galat.join(" ")).toMatch(/harga_jual_aktif tidak valid/);
  });

  it("menolak tipe yang tidak dikenal", () => {
    const hasil = validasiBarisBarang(
      { nama_barang: "X", lini: "kelontong", tipe: "produk", satuan: "pcs", harga_jual_aktif: "1" },
      PETA_LINI,
    );
    expect(hasil.ok).toBe(false);
    if (hasil.ok) return;
    expect(hasil.galat.join(" ")).toMatch(/tipe tidak dikenal/);
  });

  it("menerima harga jual 0 dan harga beli kosong (default 0)", () => {
    const hasil = validasiBarisBarang(
      {
        kode_barcode: "",
        nama_barang: "Jasa Sewa Traktor",
        lini: "Sewa Traktor",
        tipe: "jasa",
        satuan: "hari",
        harga_jual_aktif: "350000",
        harga_beli_terakhir: "",
      },
      PETA_LINI,
    );
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.data.hargaBeliTerakhir).toBe(0);
    expect(hasil.data.kodeBarcode).toBeNull();
  });
});

describe("cariBarcodeDuplikat", () => {
  it("menemukan barcode yang muncul lebih dari sekali dan mengabaikan yang kosong", () => {
    const duplikat = cariBarcodeDuplikat([
      { kode_barcode: "111" },
      { kode_barcode: "111" },
      { kode_barcode: "222" },
      { kode_barcode: "" },
      { kode_barcode: "" },
    ]);
    expect([...duplikat]).toEqual(["111"]);
  });
});
