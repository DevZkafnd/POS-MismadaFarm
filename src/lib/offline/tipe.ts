/**
 * Antrean transaksi saat sinyal lemah (F19 / FR-18) — tipe & fungsi murni.
 * Bagian yang menyentuh IndexedDB ada di `db.ts` dan `sinkron.ts`.
 *
 * Prinsip (F19): UUID dibuat di HP, transaksi disimpan lokal dengan status
 * `belum_sinkron`, dikirim berurutan saat online, dan server idempoten sehingga
 * pengiriman ulang tidak menggandakan transaksi.
 */

export const STATUS_ANTREAN = ["belum_sinkron", "tersinkron", "gagal"] as const;
export type StatusAntrean = (typeof STATUS_ANTREAN)[number];

export type ItemAntrean = {
  id: string;
  muatan: unknown;
  dibuatPada: number;
  status: StatusAntrean;
  galat?: string | null;
};

/** Ambil item yang masih perlu dikirim, terurut sesuai waktu dibuat. */
export function ambilBelumSinkron(items: ItemAntrean[]): ItemAntrean[] {
  return items
    .filter((i) => i.status === "belum_sinkron")
    .sort((a, b) => a.dibuatPada - b.dibuatPada);
}

/** Teks status antrean untuk indikator di layar. */
export function pesanAntrean(jumlah: number): string {
  return jumlah > 0 ? `Tersimpan di HP, menunggu sinyal (${jumlah})` : "Semua transaksi tersinkron";
}
