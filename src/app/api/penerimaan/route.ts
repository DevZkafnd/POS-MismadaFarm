import { eq } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import {
  barang,
  detailPenerimaan,
  hutangPemasok,
  pemasok,
  penerimaanBarang,
  stokBatch,
  titipJual,
} from "@/lib/db/schema";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaPenerimaan } from "@/lib/validasi/penerimaan";

/**
 * POST /api/penerimaan — catat penerimaan barang dari pemasok (F06 / FR-06).
 *
 * - tunai   : barang dibayar langsung.
 * - kredit  : membuat entri `hutang_pemasok` (tampilan menyusul Minggu 3).
 * - titipan : membuat `stok_batch` bermilik 'titipan' + baris `titip_jual` (BR-07).
 *
 * Setiap barang yang diterima menambah satu baris `stok_batch` beserta tanggal
 * kedaluwarsa (bahan FEFO, BR-03) dan memperbarui harga beli terakhir master.
 * Semua langkah dalam satu transaksi basis data.
 */
export async function POST(req: Request) {
  try {
    const sesi = await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();
    const isi = skemaPenerimaan.parse(await bacaJson(req));

    const hasil = await db.transaction(async (tx) => {
      const [supplier] = await tx.select().from(pemasok).where(eq(pemasok.idPemasok, isi.idPemasok));
      if (!supplier) {
        throw new GalatHttp(404, "pemasok_tidak_ada", "Pemasok tidak ditemukan.");
      }

      const total = isi.items.reduce(
        (t, item) => t + Math.round(item.hargaBeli * item.jumlah),
        0,
      );

      const [terima] = await tx
        .insert(penerimaanBarang)
        .values({
          idPemasok: isi.idPemasok,
          jenis: isi.jenis,
          idPenerima: sesi.idPengguna,
          total,
        })
        .returning();

      for (const item of isi.items) {
        const [master] = await tx.select().from(barang).where(eq(barang.idBarang, item.idBarang));
        if (!master) {
          throw new GalatHttp(404, "barang_tidak_ada", `Barang #${item.idBarang} tidak ditemukan.`);
        }

        const [detail] = await tx
          .insert(detailPenerimaan)
          .values({
            idPenerimaan: terima.idPenerimaan,
            idBarang: item.idBarang,
            jumlah: String(item.jumlah),
            hargaBeli: item.hargaBeli,
            tglKedaluwarsa: item.tglKedaluwarsa ?? null,
          })
          .returning();

        // Jasa tidak menambah stok (BR-11).
        if (master.tipe === "barang") {
          await tx.insert(stokBatch).values({
            idBarang: item.idBarang,
            idDetailPenerimaan: detail.idDetail,
            jumlahSisa: String(item.jumlah),
            tglKedaluwarsa: item.tglKedaluwarsa ?? null,
            statusMilik: isi.jenis === "titipan" ? "titipan" : "sendiri",
            idPemasok: isi.idPemasok,
          });
        }

        await tx
          .update(barang)
          .set({ hargaBeliTerakhir: item.hargaBeli })
          .where(eq(barang.idBarang, item.idBarang));

        if (isi.jenis === "titipan") {
          await tx.insert(titipJual).values({
            idPemasok: isi.idPemasok,
            idBarang: item.idBarang,
            jumlahTitip: String(item.jumlah),
            hargaTitip: item.hargaBeli,
            idPencatat: sesi.idPengguna,
          });
        }
      }

      if (isi.jenis === "kredit") {
        await tx.insert(hutangPemasok).values({
          idPenerimaan: terima.idPenerimaan,
          idPemasok: isi.idPemasok,
          saldo: total,
          jatuhTempo: isi.jatuhTempo ?? null,
          status: "belum",
        });
      }

      return { idPenerimaan: terima.idPenerimaan, total };
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "penerimaan",
      objek: `penerimaan#${hasil.idPenerimaan}`,
      detail: `${isi.items.length} item; jenis ${isi.jenis}; total ${hasil.total}`,
    });

    return Response.json({ idPenerimaan: hasil.idPenerimaan, total: hasil.total, jenis: isi.jenis });
  } catch (galat) {
    return responsGalat(galat);
  }
}
