import { connection } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { PERAN, SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, detailPenerimaan, detailPenjualan, retur, stokBatch, transaksiPenjualan } from "@/lib/db/schema";
import { nilaiRetur } from "@/lib/domain/retur";
import { alokasiFefo } from "@/lib/domain/stok";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaRetur } from "@/lib/validasi/retur";

/**
 * GET /api/retur — daftar retur terbaru (F15 / FR-09).
 */
export async function GET() {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();

    const daftar = await db
      .select({
        idRetur: retur.idRetur,
        jenis: retur.jenis,
        idBarang: retur.idBarang,
        namaBarang: barang.namaBarang,
        satuan: barang.satuan,
        jumlah: retur.jumlah,
        nilai: retur.nilai,
        alasan: retur.alasan,
        tanggal: retur.tanggal,
      })
      .from(retur)
      .innerJoin(barang, eq(retur.idBarang, barang.idBarang))
      .orderBy(desc(retur.tanggal), desc(retur.idRetur))
      .limit(50);

    return Response.json({
      retur: daftar.map((r) => ({ ...r, jumlah: Number(r.jumlah) })),
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}

/**
 * POST /api/retur — catat retur (F15 / FR-09, BR-06).
 *
 * - Retur pelanggan: nilai dari harga satuan transaksi asal; stok bertambah.
 * - Retur pemasok: nilai dari harga beli penerimaan (atau riwayat harga);
 *   stok berkurang mengikuti FEFO. Kasir tidak boleh mencatat retur pemasok.
 */
export async function POST(req: Request) {
  try {
    const sesi = await requireRole(SEMUA_PERAN);
    const db = butuhDb();
    const isi = skemaRetur.parse(await bacaJson(req));

    if (isi.jenis === "pemasok" && sesi.peran === PERAN.KASIR) {
      throw new GalatHttp(403, "akses_ditolak", "Kasir tidak boleh mencatat retur ke pemasok.");
    }

    const hasil = await db.transaction(async (tx) => {
      const [master] = await tx.select().from(barang).where(eq(barang.idBarang, isi.idBarang));
      if (!master) {
        throw new GalatHttp(404, "barang_tidak_ada", "Barang tidak ditemukan.");
      }

      let nilai: number;
      let idDetailPenjualan: number | null = null;
      let idPenerimaan: number | null = null;

      if (isi.jenis === "pelanggan") {
        const [detail] = await tx
          .select({
            idDetail: detailPenjualan.idDetail,
            idBarang: detailPenjualan.idBarang,
            hargaSatuan: detailPenjualan.hargaSatuan,
          })
          .from(detailPenjualan)
          .innerJoin(transaksiPenjualan, eq(detailPenjualan.idTransaksi, transaksiPenjualan.idTransaksi))
          .where(eq(detailPenjualan.idDetail, isi.idDetailPenjualan as number));

        if (!detail) {
          throw new GalatHttp(404, "detail_tidak_ada", "Item penjualan asal tidak ditemukan.");
        }
        if (detail.idBarang !== isi.idBarang) {
          throw new GalatHttp(400, "barang_tidak_cocok", "Barang tidak cocok dengan penjualan asal.");
        }

        // BR-06: harga mengikuti harga satuan transaksi asal.
        nilai = nilaiRetur(isi.jumlah, detail.hargaSatuan);
        idDetailPenjualan = detail.idDetail;

        // Stok kembali bertambah.
        await tx.insert(stokBatch).values({
          idBarang: isi.idBarang,
          jumlahSisa: String(isi.jumlah),
          statusMilik: "sendiri",
        });
      } else {
        let hargaBeli = master.hargaBeliTerakhir;

        if (isi.idPenerimaan) {
          const [detail] = await tx
            .select({ hargaBeli: detailPenerimaan.hargaBeli })
            .from(detailPenerimaan)
            .where(
              and(
                eq(detailPenerimaan.idPenerimaan, isi.idPenerimaan),
                eq(detailPenerimaan.idBarang, isi.idBarang),
              ),
            );
          if (detail) hargaBeli = detail.hargaBeli;
          idPenerimaan = isi.idPenerimaan;
        }

        nilai = nilaiRetur(isi.jumlah, hargaBeli);

        // Stok berkurang mengikuti FEFO.
        const batches = await tx
          .select({
            idBatch: stokBatch.idBatch,
            jumlahSisa: stokBatch.jumlahSisa,
            tglKedaluwarsa: stokBatch.tglKedaluwarsa,
          })
          .from(stokBatch)
          .where(and(eq(stokBatch.idBarang, isi.idBarang), sql`${stokBatch.jumlahSisa} > 0`));

        const { alokasi } = alokasiFefo(
          batches.map((b) => ({
            idBatch: b.idBatch,
            jumlahSisa: Number(b.jumlahSisa),
            tglKedaluwarsa: b.tglKedaluwarsa,
          })),
          isi.jumlah,
        );

        for (const a of alokasi) {
          await tx
            .update(stokBatch)
            .set({ jumlahSisa: sql`${stokBatch.jumlahSisa} - ${a.jumlah}` })
            .where(eq(stokBatch.idBatch, a.idBatch));
        }
      }

      const [baru] = await tx
        .insert(retur)
        .values({
          jenis: isi.jenis,
          idBarang: isi.idBarang,
          idDetailPenjualan,
          idPenerimaan,
          jumlah: String(isi.jumlah),
          nilai,
          alasan: isi.alasan,
          tanggal: isi.tanggal ?? undefined,
          idPencatat: sesi.idPengguna,
        })
        .returning();

      return { idRetur: baru.idRetur, nilai };
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "retur",
      objek: `retur#${hasil.idRetur}`,
      detail: `jenis ${isi.jenis}; barang#${isi.idBarang}; jumlah ${isi.jumlah}; nilai ${hasil.nilai}`,
    });

    return Response.json({ idRetur: hasil.idRetur, nilai: hasil.nilai, jenis: isi.jenis }, { status: 201 });
  } catch (galat) {
    return responsGalat(galat);
  }
}
