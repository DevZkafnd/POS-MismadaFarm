/**
 * Perhitungan kas harian — BR-09 (F11 / FR-13).
 *
 * Fungsi murni tanpa akses basis data agar mudah diuji (panduan: logika bisnis
 * diletakkan di `lib/domain/`).
 */

export type KomponenKas = {
  /** Uang di laci saat mulai berjualan. */
  kasAwal: number;
  /** Total transaksi penjualan metode tunai. */
  penjualanTunai: number;
  /** Total pelunasan piutang/kasbon yang dibayar hari itu. */
  pelunasanPiutang: number;
  /** Pengeluaran yang dibayar tunai. */
  pengeluaranTunai: number;
  /** Pembayaran tunai ke pemasok (hutang). */
  pembayaranPemasokTunai: number;
};

/**
 * Kas seharusnya (BR-09):
 * kas awal + penjualan tunai + pelunasan piutang − pengeluaran tunai − pembayaran tunai ke pemasok.
 *
 * Catatan: penjualan kasbon TIDAK menambah kas seharusnya sampai dilunasi.
 */
export function hitungKasSeharusnya(k: KomponenKas): number {
  return (
    k.kasAwal + k.penjualanTunai + k.pelunasanPiutang - k.pengeluaranTunai - k.pembayaranPemasokTunai
  );
}

/** Selisih = uang fisik yang dihitung kasir − kas seharusnya (bisa negatif). */
export function hitungSelisihKas(kasFisik: number, kasSeharusnya: number): number {
  return Math.round(kasFisik - kasSeharusnya);
}

/** BR-09: bila ada selisih, keterangan wajib diisi sebelum rekap dikunci. */
export function bolehKunciRekap(selisih: number, keterangan?: string | null): boolean {
  return selisih === 0 || (keterangan ?? "").trim().length > 0;
}
