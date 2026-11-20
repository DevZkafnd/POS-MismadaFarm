import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { liniUsaha, pengeluaran } from "@/lib/db/schema";
import { bacaJson, butuhDb, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaPengeluaran } from "@/lib/validasi/kas";

/**
 * GET /api/pengeluaran — daftar pengeluaran terbaru (F14 / FR-12).
 * POST /api/pengeluaran — catat pengeluaran per lini (pemilik / penerus usaha).
 *
 * Pengeluaran yang tidak bisa dipisah dicatat di lini "Umum" dan hanya tampil
 * di laporan konsolidasi (BR-10).
 */
export async function GET() {
  await connection();
  try {
    await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const daftar = await db
      .select({
        idPengeluaran: pengeluaran.idPengeluaran,
        idLini: pengeluaran.idLini,
        namaLini: liniUsaha.namaLini,
        kategori: pengeluaran.kategori,
        jumlah: pengeluaran.jumlah,
        tanggal: pengeluaran.tanggal,
      })
      .from(pengeluaran)
      .innerJoin(liniUsaha, eq(pengeluaran.idLini, liniUsaha.idLini))
      .orderBy(desc(pengeluaran.tanggal), desc(pengeluaran.idPengeluaran))
      .limit(100);

    return Response.json({ pengeluaran: daftar });
  } catch (galat) {
    return responsGalat(galat);
  }
}

export async function POST(req: Request) {
  try {
    const sesi = await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();
    const isi = skemaPengeluaran.parse(await bacaJson(req));

    const [baru] = await db
      .insert(pengeluaran)
      .values({
        idLini: isi.idLini,
        kategori: isi.kategori,
        jumlah: isi.jumlah,
        tanggal: isi.tanggal ?? undefined,
        dicatatOleh: sesi.idPengguna,
      })
      .returning();

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "pengeluaran",
      objek: `pengeluaran#${baru.idPengeluaran}`,
      detail: `${isi.kategori}; ${isi.jumlah}`,
    });

    return Response.json({ pengeluaran: baru }, { status: 201 });
  } catch (galat) {
    return responsGalat(galat);
  }
}
