/**
 * Logika bisnis retur (F15 / FR-09, BR-06) — fungsi murni tanpa akses basis data.
 *
 * Aturan yang dipenuhi:
 * - BR-06: retur pelanggan dinilai dari harga satuan transaksi asal; retur ke
 *   pemasok dinilai dari harga beli penerimaan (atau riwayat harga).
 */

export const JENIS_RETUR = ["pelanggan", "pemasok"] as const;
export type JenisRetur = (typeof JENIS_RETUR)[number];

export const LABEL_JENIS_RETUR: Record<JenisRetur, string> = {
  pelanggan: "Retur Pelanggan",
  pemasok: "Retur ke Pemasok",
};

/** Nilai retur = jumlah × harga satuan asal, dibulatkan ke rupiah bulat. */
export function nilaiRetur(jumlah: number, hargaSatuan: number): number {
  return Math.round(hargaSatuan * jumlah);
}

/**
 * Arah perubahan stok:
 * - retur pelanggan menambah stok kembali (+1);
 * - retur ke pemasok mengurangi stok (−1).
 */
export function arahStokRetur(jenis: JenisRetur): 1 | -1 {
  return jenis === "pelanggan" ? 1 : -1;
}
