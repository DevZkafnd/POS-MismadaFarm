import { type NextRequest, connection } from "next/server";
import { desc, eq } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { logAktivitas, pengguna } from "@/lib/db/schema";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/log?limit= — riwayat aktivitas (F08 / FR-17).
 * Tampilan riwayat aktivitas untuk pemilik (Tabel 4.10).
 */
export async function GET(req: NextRequest) {
  // Selalu dirender saat permintaan (bukan saat build): bergantung sesi & DB.
  await connection();
  try {
    await requireRole([PERAN.PEMILIK]);
    const db = butuhDb();

    const limitDiminta = Number(req.nextUrl.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(limitDiminta) ? Math.min(Math.max(limitDiminta, 1), 500) : 100;

    const daftar = await db
      .select({
        idLog: logAktivitas.idLog,
        waktu: logAktivitas.waktu,
        aksi: logAktivitas.aksi,
        objek: logAktivitas.objek,
        detail: logAktivitas.detail,
        namaPengguna: pengguna.nama,
      })
      .from(logAktivitas)
      .innerJoin(pengguna, eq(logAktivitas.idPengguna, pengguna.idPengguna))
      .orderBy(desc(logAktivitas.waktu))
      .limit(limit);

    return Response.json({ log: daftar });
  } catch (galat) {
    return responsGalat(galat);
  }
}
