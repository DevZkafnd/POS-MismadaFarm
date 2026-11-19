/**
 * Logika bisnis stok & uang — fungsi murni tanpa akses basis data
 * (menjadi Cuplikan Kode 4.4). Mudah diuji karena hanya bergantung pada argumen.
 *
 * Aturan yang dipenuhi:
 * - BR-03 FEFO: batch dengan kedaluwarsa terdekat diambil lebih dulu; batch
 *   tanpa kedaluwarsa diambil paling akhir. Jika kedaluwarsa sama, pakai
 *   idBatch terkecil supaya urutannya tetap (deterministik).
 * - Bagian 0 poin 8: uang selalu bilangan bulat rupiah, bukan pecahan.
 */

export type BatchStok = {
  idBatch: number;
  /** Sisa stok batch (bisa pecahan untuk barang per kg). */
  jumlahSisa: number;
  /** Format 'YYYY-MM-DD'; null berarti tanpa kedaluwarsa. */
  tglKedaluwarsa: string | null;
};

export type AlokasiBatch = { idBatch: number; jumlah: number };

export type HasilAlokasi = {
  /** Potongan per batch, sudah urut FEFO. */
  alokasi: AlokasiBatch[];
  /** Sisa permintaan yang belum tercukupi (0 bila stok cukup). */
  kurang: number;
};

/**
 * Urutkan batch sesuai FEFO: kedaluwarsa terdekat dulu, "tanpa kedaluwarsa"
 * paling akhir, lalu berdasarkan idBatch agar stabil.
 */
export function urutkanFefo(batches: BatchStok[]): BatchStok[] {
  return [...batches].sort((a, b) => {
    if (a.tglKedaluwarsa === b.tglKedaluwarsa) return a.idBatch - b.idBatch;
    if (a.tglKedaluwarsa === null) return 1;
    if (b.tglKedaluwarsa === null) return -1;
    return a.tglKedaluwarsa < b.tglKedaluwarsa ? -1 : 1;
  });
}

/**
 * Bagi `jumlahDiminta` ke batch secara FEFO. Bila stok tidak cukup, kembalikan
 * apa yang bisa diambil dan sisa `kurang` — pemanggil yang memutuskan apakah
 * kurang tersebut menjadi peringatan (bukan blokir, sesuai Tabel 4.14) atau
 * penolakan.
 */
export function alokasiFefo(batches: BatchStok[], jumlahDiminta: number): HasilAlokasi {
  const alokasi: AlokasiBatch[] = [];
  let sisa = jumlahDiminta;

  for (const batch of urutkanFefo(batches)) {
    if (sisa <= 0) break;
    if (batch.jumlahSisa <= 0) continue;

    const ambil = Math.min(batch.jumlahSisa, sisa);
    alokasi.push({ idBatch: batch.idBatch, jumlah: ambil });
    sisa -= ambil;
  }

  return { alokasi, kurang: sisa > 0 ? sisa : 0 };
}

/** Jumlahkan nilai keranjang; tiap baris dibulatkan ke rupiah bulat. */
export function hitungTotal(items: { hargaSatuan: number; jumlah: number }[]): number {
  return items.reduce((total, item) => total + Math.round(item.hargaSatuan * item.jumlah), 0);
}

/** Kembalian tunai; tidak pernah negatif (uang kurang tetap 0). */
export function hitungKembalian(total: number, dibayar: number): number {
  return Math.max(0, Math.round(dibayar) - Math.round(total));
}
