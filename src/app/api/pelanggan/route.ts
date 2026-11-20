import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { pelanggan } from "@/lib/db/schema";
import { bacaJson, butuhDb, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaPelangganBaru } from "@/lib/validasi/kasbon";

/**
 * GET /api/pelanggan — daftar pelanggan (dipakai form kasbon, F09).
 * POST /api/pelanggan — tambah pelanggan baru (semua peran yang sudah masuk,
 * karena kasir sering menerima kasbon pelanggan baru).
 */
export async function GET() {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();

    const daftar = await db.select().from(pelanggan).orderBy(asc(pelanggan.nama));
    return Response.json({ pelanggan: daftar });
  } catch (galat) {
    return responsGalat(galat);
  }
}

export async function POST(req: Request) {
  try {
    const sesi = await requireRole(SEMUA_PERAN);
    const db = butuhDb();
    const isi = skemaPelangganBaru.parse(await bacaJson(req));

    const [baru] = await db
      .insert(pelanggan)
      .values({ nama: isi.nama, noHp: isi.noHp ?? null })
      .returning();

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "tambah_pelanggan",
      objek: `pelanggan#${baru.idPelanggan}`,
      detail: baru.nama,
    });

    return Response.json({ pelanggan: baru }, { status: 201 });
  } catch (galat) {
    return responsGalat(galat);
  }
}
