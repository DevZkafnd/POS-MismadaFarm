import { dbAntrean } from "./db";
import { ambilBelumSinkron } from "./tipe";

/** Nama event internal agar indikator memperbarui jumlah antrean. */
export const EVENT_ANTREAN = "mismada-antrean";

function beritahu() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_ANTREAN));
}

/** Simpan transaksi ke antrean lokal; UUID dipakai sebagai kunci (idempotensi). */
export async function simpanKeAntrean(muatan: unknown): Promise<string> {
  const db = dbAntrean();
  const id = (muatan as { idTransaksi?: string }).idTransaksi ?? crypto.randomUUID();
  if (db) {
    await db.antrean.put({ id, muatan, dibuatPada: Date.now(), status: "belum_sinkron" });
  }
  beritahu();
  return id;
}

/** Hitung transaksi yang belum terkirim. */
export async function hitungAntrean(): Promise<number> {
  const db = dbAntrean();
  if (!db) return 0;
  return db.antrean.where("status").equals("belum_sinkron").count();
}

/**
 * Kirim antrean secara berurutan. Berhenti pada kegagalan pertama agar urutan
 * transaksi tetap terjaga; item gagal tetap tersimpan untuk dicoba lagi.
 */
export async function kirimAntrean(): Promise<{ terkirim: number; sisa: number }> {
  const db = dbAntrean();
  if (!db) return { terkirim: 0, sisa: 0 };

  const semua = await db.antrean.toArray();
  const urut = ambilBelumSinkron(semua);
  let terkirim = 0;

  for (const item of urut) {
    try {
      const res = await fetch("/api/penjualan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.muatan),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db.antrean.delete(item.id);
      terkirim += 1;
    } catch (e) {
      const pesan = e instanceof Error ? e.message : "gagal";
      await db.antrean.update(item.id, { status: "belum_sinkron", galat: pesan });
      break;
    }
  }

  beritahu();
  return { terkirim, sisa: await hitungAntrean() };
}
