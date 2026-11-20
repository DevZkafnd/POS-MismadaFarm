import { connection } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, detailOpname, stokBatch, stokOpname } from "@/lib/db/schema";
import { bulatTiga, hitungSelisihOpname, perluAlasan } from "@/lib/domain/opname";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaOpname } from "@/lib/validasi/opname";

/**
 * Stok opname (F16 / FR-11, BR-08).
 *
 * GET  /api/opname — daftar opname + rinciannya.
 * POST /api/opname — catat hasil hitung fisik. Stok BELUM berubah; perubahan
 *   hanya terjadi setelah disetujui penerus usaha (lihat /setujui).
 */

export async function GET() {
  await connection();
  try {
    await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const daftar = await db
      .select({
        idOpname: stokOpname.idOpname,
        tanggal: stokOpname.tanggal,
        idPetugas: stokOpname.idPetugas,
        idPenyetuju: stokOpname.idPenyetuju,
      })
      .from(stokOpname)
      .orderBy(desc(stokOpname.idOpname))
      .limit(50);

    const ids = daftar.map((d) => d.idOpname);
    const detail =
      ids.length > 0
        ? await db
            .select({
              idOpname: detailOpname.idOpname,
              idBarang: detailOpname.idBarang,
              namaBarang: barang.namaBarang,
              satuan: barang.satuan,
              stokSistem: detailOpname.stokSistem,
              stokFisik: detailOpname.stokFisik,
              selisih: detailOpname.selisih,
              alasan: detailOpname.alasan,
            })
            .from(detailOpname)
            .innerJoin(barang, eq(detailOpname.idBarang, barang.idBarang))
            .where(inArray(detailOpname.idOpname, ids))
        : [];

    return Response.json({
      opname: daftar.map((d) => ({
        idOpname: d.idOpname,
        tanggal: d.tanggal,
        status: d.idPenyetuju ? "disetujui" : "menunggu",
        items: detail
          .filter((x) => x.idOpname === d.idOpname)
          .map((x) => ({
            idBarang: x.idBarang,
            namaBarang: x.namaBarang,
            satuan: x.satuan,
            stokSistem: Number(x.stokSistem),
            stokFisik: Number(x.stokFisik),
            selisih: Number(x.selisih),
            alasan: x.alasan,
          })),
      })),
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}

export async function POST(req: Request) {
  try {
    const sesi = await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();
    const isi = skemaOpname.parse(await bacaJson(req));

    const idOpname = await db.transaction(async (tx) => {
      const [opname] = await tx
        .insert(stokOpname)
        .values({ idPetugas: sesi.idPengguna })
        .returning();

      for (const item of isi.items) {
        const [master] = await tx.select().from(barang).where(eq(barang.idBarang, item.idBarang));
        if (!master) {
          throw new GalatHttp(404, "barang_tidak_ada", `Barang #${item.idBarang} tidak ditemukan.`);
        }

        const [stok] = await tx
          .select({ total: sql<number>`coalesce(sum(${stokBatch.jumlahSisa}),0)::float` })
          .from(stokBatch)
          .where(eq(stokBatch.idBarang, item.idBarang));
        const stokSistem = bulatTiga(Number(stok?.total ?? 0));
        const stokFisik = bulatTiga(item.stokFisik);
        const selisih = hitungSelisihOpname(stokSistem, stokFisik);
        const alasan = item.alasan?.trim() || null;

        // BR-08: alasan wajib bila ada selisih.
        if (perluAlasan(selisih) && !alasan) {
          throw new GalatHttp(
            400,
            "alasan_wajib",
            `Alasan wajib diisi untuk ${master.namaBarang} (selisih ${selisih}).`,
          );
        }

        await tx.insert(detailOpname).values({
          idOpname: opname.idOpname,
          idBarang: item.idBarang,
          stokSistem: String(stokSistem),
          stokFisik: String(stokFisik),
          selisih: String(selisih),
          alasan,
        });
      }

      return opname.idOpname;
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "opname",
      objek: `opname#${idOpname}`,
      detail: `${isi.items.length} barang; menunggu persetujuan`,
    });

    return Response.json({ idOpname, status: "menunggu" }, { status: 201 });
  } catch (galat) {
    return responsGalat(galat);
  }
}
