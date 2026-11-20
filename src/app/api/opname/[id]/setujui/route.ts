import { and, eq, sql } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { detailOpname, stokBatch, stokOpname } from "@/lib/db/schema";
import { alokasiFefo } from "@/lib/domain/stok";
import { butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";

/**
 * POST /api/opname/:id/setujui — setujui opname (F16 / FR-11, BR-08).
 *
 * Hanya peran Penerus Usaha yang boleh menyetujui. Saat disetujui, selisih
 * diterapkan ke stok nyata:
 * - selisih positif → tambah batch penyesuaian;
 * - selisih negatif → kurangi batch FEFO sebanyak kekurangan.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  void req;
  try {
    const sesi = await requireRole([PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const { id } = await ctx.params;
    const idOpname = Number(id);
    if (!Number.isInteger(idOpname) || idOpname <= 0) {
      throw new GalatHttp(400, "id_tidak_valid", "ID opname tidak valid.");
    }

    const jumlahBaris = await db.transaction(async (tx) => {
      const [opname] = await tx.select().from(stokOpname).where(eq(stokOpname.idOpname, idOpname));
      if (!opname) throw new GalatHttp(404, "opname_tidak_ada", "Opname tidak ditemukan.");
      if (opname.idPenyetuju) {
        throw new GalatHttp(400, "sudah_disetujui", "Opname ini sudah disetujui.");
      }

      const rincian = await tx
        .select()
        .from(detailOpname)
        .where(eq(detailOpname.idOpname, idOpname));

      for (const baris of rincian) {
        const selisih = Number(baris.selisih);
        if (selisih === 0) continue;

        if (selisih > 0) {
          // Stok fisik lebih banyak: tambah batch penyesuaian tanpa kedaluwarsa.
          await tx.insert(stokBatch).values({
            idBarang: baris.idBarang,
            jumlahSisa: String(selisih),
            statusMilik: "sendiri",
          });
          continue;
        }

        // Stok fisik lebih sedikit: kurangi batch FEFO sebanyak kekurangan.
        const batches = await tx
          .select({
            idBatch: stokBatch.idBatch,
            jumlahSisa: stokBatch.jumlahSisa,
            tglKedaluwarsa: stokBatch.tglKedaluwarsa,
          })
          .from(stokBatch)
          .where(and(eq(stokBatch.idBarang, baris.idBarang), sql`${stokBatch.jumlahSisa} > 0`));

        const { alokasi } = alokasiFefo(
          batches.map((b) => ({
            idBatch: b.idBatch,
            jumlahSisa: Number(b.jumlahSisa),
            tglKedaluwarsa: b.tglKedaluwarsa,
          })),
          Math.abs(selisih),
        );

        for (const a of alokasi) {
          await tx
            .update(stokBatch)
            .set({ jumlahSisa: sql`${stokBatch.jumlahSisa} - ${a.jumlah}` })
            .where(eq(stokBatch.idBatch, a.idBatch));
        }
      }

      await tx
        .update(stokOpname)
        .set({ idPenyetuju: sesi.idPengguna })
        .where(eq(stokOpname.idOpname, idOpname));

      return rincian.length;
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "opname_disetujui",
      objek: `opname#${idOpname}`,
      detail: `disetujui; ${jumlahBaris} barang diterapkan ke stok`,
    });

    return Response.json({ idOpname, status: "disetujui" });
  } catch (galat) {
    return responsGalat(galat);
  }
}
