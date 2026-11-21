/**
 * Pencocokan barcode ke data master (Cuplikan Kode 4.1).
 * Fungsi murni: diberi kode hasil pindai dan daftar barang, kembalikan hasilnya.
 * Tidak menambah barang otomatis — kode tak dikenal hanya dilaporkan.
 */

export type BarangRingkas = {
  idBarang: number;
  kodeBarcode: string | null;
  namaBarang: string;
  satuan: string;
  tipe: string;
  hargaJualAktif: number;
  idLini: number;
  namaLini?: string;
};

export type HasilCocokBarcode =
  | { jenis: "ditemukan"; barang: BarangRingkas }
  | { jenis: "tidak_ditemukan"; kode: string }
  | { jenis: "kode_kosong" };

/**
 * Cari barang yang barcodenya sama persis dengan hasil pindai.
 * Barcode kosong/whitespace dianggap tidak sah (kode_kosong).
 * PENTING: Pencocokan case-sensitive dan mempertahankan nol di depan.
 */
export function cocokkanBarcode(kodeMentah: string, daftar: BarangRingkas[]): HasilCocokBarcode {
  const kode = (kodeMentah ?? "").trim();
  if (kode === "") return { jenis: "kode_kosong" };

  // Cocokkan string barcode secara persis (termasuk nol di depan)
  const barang = daftar.find((b) => {
    const barcodeBarang = (b.kodeBarcode ?? "").trim();
    return barcodeBarang === kode;
  });
  
  if (!barang) return { jenis: "tidak_ditemukan", kode };
  return { jenis: "ditemukan", barang };
}

/** Pesan siap tampil untuk hasil pindai (Bahasa Indonesia sederhana, NFR-01). */
export function pesanHasilBarcode(hasil: HasilCocokBarcode): string {
  switch (hasil.jenis) {
    case "ditemukan":
      return `Ditemukan: ${hasil.barang.namaBarang}`;
    case "tidak_ditemukan":
      return `Barcode ${hasil.kode} belum terdaftar. Cari manual atau pakai harga manual.`;
    case "kode_kosong":
      return "Barcode tidak terbaca. Coba dekatkan lagi ke kamera.";
  }
}
