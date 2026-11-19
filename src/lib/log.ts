import type { Db } from "@/lib/db";
import { logAktivitas } from "@/lib/db/schema";

/**
 * Catat perubahan data ke `log_aktivitas` (F08, FR-17).
 * Dipanggil dari setiap endpoint yang mengubah data (harga, barang, dst.).
 */
export async function catatAktivitas(
  db: Db,
  data: { idPengguna: number; aksi: string; objek: string; detail?: string | null },
): Promise<void> {
  await db.insert(logAktivitas).values({
    idPengguna: data.idPengguna,
    aksi: data.aksi,
    objek: data.objek,
    detail: data.detail ?? null,
  });
}
