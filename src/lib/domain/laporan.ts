/**
 * Perhitungan laba — BR-10 (F12 / FR-14).
 *
 * Fungsi murni: dipakai endpoint laporan dan unit test.
 * Laba kotor = Σ (harga satuan − harga beli saat transaksi) × jumlah.
 */

export type BarisLaba = {
  /** Harga jual saat transaksi (BR-01). */
  hargaSatuan: number;
  /** Harga beli yang tersimpan pada detail transaksi (BR-10). */
  hargaBeliSaatItu: number;
  jumlah: number;
};

/** Laba kotor satu baris detail, dibulatkan ke rupiah bulat. */
export function labaKotorBaris(b: BarisLaba): number {
  return Math.round((b.hargaSatuan - b.hargaBeliSaatItu) * b.jumlah);
}

/** Laba kotor seluruh baris. */
export function labaKotorTotal(baris: BarisLaba[]): number {
  return baris.reduce((t, b) => t + labaKotorBaris(b), 0);
}

/** Omzet (nilai penjualan) seluruh baris. */
export function omzetTotal(baris: BarisLaba[]): number {
  return baris.reduce((t, b) => t + Math.round(b.hargaSatuan * b.jumlah), 0);
}

/** Laba-rugi per lini = laba kotor lini − pengeluaran lini (BR-10). */
export function labaRugiLini(labaKotor: number, pengeluaran: number): number {
  return labaKotor - pengeluaran;
}

/** Laba bersih = laba kotor total − seluruh pengeluaran (BR-10). */
export function labaBersih(labaKotor: number, pengeluaranTotal: number): number {
  return labaKotor - pengeluaranTotal;
}

/** Margin (%) = (jual − beli) / jual × 100, dibulatkan 2 desimal. */
export function marginPersen(hargaJual: number, hargaBeli: number): number {
  if (hargaJual <= 0) return 0;
  return Math.round(((hargaJual - hargaBeli) / hargaJual) * 10_000) / 100;
}
