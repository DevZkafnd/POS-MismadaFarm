import { connection } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, liniUsaha } from "@/lib/db/schema";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/belanja — daftar belanja: barang yang stoknya ≤ stok minimum
 * (F20). Menjadi bantuan sederhana untuk menentukan barang yang perlu dibeli.
 */
export async function GET() {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();

    const stokTotal = sql<number>`coalesce((select sum(sb.jumlah_sisa) from stok_batch sb where sb.id_barang = ${barang.idBarang}), 0)::float`;

    const daftar = await db
      .select({
        idBarang: barang.idBarang,
        namaBarang: barang.namaBarang,
        namaLini: liniUsaha.namaLini,
        satuan: barang.satuan,
        stokMinimum: barang.stokMinimum,
        stokTotal,
      })
      .from(barang)
      .innerJoin(liniUsaha, eq(barang.idLini, liniUsaha.idLini))
      .where(and(eq(barang.tipe, "barang"), sql`${stokTotal} <= ${barang.stokMinimum}`))
      .orderBy(asc(barang.namaBarang));

    return Response.json({
      belanja: daftar.map((b) => {
        const stokMinimum = Number(b.stokMinimum);
        return {
          idBarang: b.idBarang,
          namaBarang: b.namaBarang,
          namaLini: b.namaLini,
          satuan: b.satuan,
          stokMinimum,
          stokTotal: b.stokTotal,
          kekurangan: Math.max(0, stokMinimum - b.stokTotal),
        };
      }),
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
