/**
 * Logika bisnis titip jual (F17 / FR-09, BR-07) — fungsi murni.
 *
 * Aturan yang dipenuhi:
 * - BR-07: kewajiban bayar ke penitip = jumlah laku × harga titip, tanpa komisi.
 *   Kewajiban naik saat barang laku dan turun saat dibayar (pembayaran lewat
 *   alur hutang pemasok).
 */

export const STATUS_TITIP = ["aktif", "selesai"] as const;
export type StatusTitip = (typeof STATUS_TITIP)[number];

export const LABEL_STATUS_TITIP: Record<StatusTitip, string> = {
  aktif: "Aktif",
  selesai: "Selesai",
};

/** Bulatkan ke 3 desimal (skala kolom numeric(12,3)). */
export function bulatTiga(nilai: number): number {
  return Math.round(nilai * 1000) / 1000;
}

/** Kewajiban bayar = jumlah laku × harga titip (rupiah bulat, tanpa komisi). */
export function kewajibanTitip(jumlahLaku: number, hargaTitip: number): number {
  return Math.round(hargaTitip * jumlahLaku);
}

/** Tambah jumlah laku, tidak boleh melebihi jumlah titip (BR-07). */
export function tambahLaku(jumlahLaku: number, jumlahTitip: number, tambahan: number): number {
  const naik = Math.max(0, tambahan);
  return bulatTiga(Math.min(bulatTiga(jumlahTitip), bulatTiga(jumlahLaku) + naik));
}

/** Status titip menjadi 'selesai' bila seluruh jumlah titip sudah laku. */
export function statusTitipDari(jumlahLaku: number, jumlahTitip: number): StatusTitip {
  return bulatTiga(jumlahLaku) >= bulatTiga(jumlahTitip) ? "selesai" : "aktif";
}
