import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { butuhSesi, requireRole } from "@/lib/auth/rbac";
import { pemasok } from "@/lib/db/schema";
import { bacaJson, butuhDb, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaPemasokBaru } from "@/lib/validasi/penerimaan";

/**
 * GET /api/pemasok — daftar pemasok untuk form penerimaan (F06).
 * POST /api/pemasok — tambah pemasok baru (pemilik / penerus usaha).
 */

export async function GET() {
  await connection();
  try {
    await butuhSesi();
    const db = butuhDb();

    const daftar = await db
      .select()
      .from(pemasok)
      .orderBy(asc(pemasok.nama));

    return Response.json({ pemasok: daftar });
  } catch (galat) {
    return responsGalat(galat);
  }
}

export async function POST(req: Request) {
  try {
    const sesi = await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();
    const isi = skemaPemasokBaru.parse(await bacaJson(req));

    const [baru] = await db
      .insert(pemasok)
      .values({ nama: isi.nama, noHp: isi.noHp ?? null, jenis: isi.jenis ?? null })
      .returning();

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "tambah_pemasok",
      objek: `pemasok#${baru.idPemasok}`,
      detail: baru.nama,
    });

    return Response.json({ pemasok: baru }, { status: 201 });
  } catch (galat) {
    return responsGalat(galat);
  }
}
