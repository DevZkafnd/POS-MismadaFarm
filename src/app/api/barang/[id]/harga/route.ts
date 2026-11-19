import { eq } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, riwayatHarga } from "@/lib/db/schema";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaUbahHarga } from "@/lib/validasi/barang";

/**
 * PATCH /api/barang/:id/harga — ubah harga (F05 / FR-04 / BR-01).
 *
 * Hanya peran penerus usaha (Tabel 4.10). Perubahan harga menambah baris baru
 * pada `riwayat_harga`, tidak menimpa riwayat lama (BR-01), dan dicatat di
 * `log_aktivitas` (F08 / FR-17).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const sesi = await requireRole([PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const { id } = await ctx.params;
    const idBarang = Number(id);
    if (!Number.isInteger(idBarang) || idBarang <= 0) {
      throw new GalatHttp(400, "id_tidak_valid", "ID barang tidak valid.");
    }

    const isi = skemaUbahHarga.parse(await bacaJson(req));

    const { lama, baru } = await db.transaction(async (tx) => {
      const [sebelum] = await tx.select().from(barang).where(eq(barang.idBarang, idBarang));
      if (!sebelum) {
        throw new GalatHttp(404, "barang_tidak_ada", "Barang tidak ditemukan.");
      }

      await tx.insert(riwayatHarga).values({
        idBarang,
        hargaJual: isi.hargaJual,
        hargaBeli: isi.hargaBeli,
        diubahOleh: sesi.idPengguna,
      });

      const [sesudah] = await tx
        .update(barang)
        .set({ hargaJualAktif: isi.hargaJual, hargaBeliTerakhir: isi.hargaBeli })
        .where(eq(barang.idBarang, idBarang))
        .returning();

      return { lama: sebelum, baru: sesudah };
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "ubah_harga",
      objek: `barang#${idBarang}`,
      detail: `harga jual ${lama.hargaJualAktif} -> ${baru.hargaJualAktif}; harga beli ${lama.hargaBeliTerakhir} -> ${baru.hargaBeliTerakhir}`,
    });

    return Response.json({
      barang: {
        idBarang,
        hargaJualAktif: baru.hargaJualAktif,
        hargaBeliTerakhir: baru.hargaBeliTerakhir,
      },
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
