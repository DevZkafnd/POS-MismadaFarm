import { and, eq, sql } from "drizzle-orm";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, detailPenjualan, stokBatch, transaksiPenjualan } from "@/lib/db/schema";
import { alokasiFefo, hitungKembalian, hitungTotal } from "@/lib/domain/stok";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { nomorTransaksi, skemaPenjualan } from "@/lib/validasi/penjualan";

/**
 * POST /api/penjualan — catat satu transaksi penjualan (F03 / FR-03).
 *
 * Semua langkah dijalankan dalam SATU transaksi basis data: simpan transaksi,
 * simpan detail, kurangi stok per batch (FEFO, BR-03). Bila ada langkah gagal,
 * seluruhnya dibatalkan.
 *
 * - Idempotensi (F19): bila UUID transaksi sudah ada, kembalikan hasil lama
 *   tanpa menyimpan ulang.
 * - Stok kurang bukan penghalang: transaksi tetap tersimpan, kekurangan
 *   dilaporkan sebagai peringatan (Tabel 4.14).
 * - Item jasa tidak mengurangi stok (BR-11).
 * - Item jalur manual tidak mengubah harga master (BR-02).
 */
export async function POST(req: Request) {
  try {
    const sesi = await requireRole(SEMUA_PERAN);
    const db = butuhDb();
    const isi = skemaPenjualan.parse(await bacaJson(req));

    // Idempotensi: transaksi dengan UUID sama sudah pernah tersimpan.
    const [sudahAda] = await db
      .select()
      .from(transaksiPenjualan)
      .where(eq(transaksiPenjualan.idTransaksi, isi.idTransaksi));

    if (sudahAda) {
      const detail = await db
        .select()
        .from(detailPenjualan)
        .where(eq(detailPenjualan.idTransaksi, isi.idTransaksi));
      return Response.json({
        ulangan: true,
        idTransaksi: sudahAda.idTransaksi,
        noTransaksi: sudahAda.noTransaksi,
        total: sudahAda.total,
        kembalian: 0,
        peringatanStok: [],
        items: detail.map((d) => ({
          namaItem: d.namaItem,
          jumlah: Number(d.jumlah),
          hargaSatuan: d.hargaSatuan,
        })),
      });
    }

    const total = hitungTotal(isi.items);
    const waktu = new Date();
    const noTransaksi = nomorTransaksi(waktu, isi.idTransaksi);

    const { peringatanStok } = await db.transaction(async (tx) => {
      await tx.insert(transaksiPenjualan).values({
        idTransaksi: isi.idTransaksi,
        noTransaksi,
        waktu,
        idKasir: sesi.idPengguna,
        idPelanggan: isi.idPelanggan ?? null,
        metode: isi.metode,
        total,
      });

      const peringatan: string[] = [];

      for (const item of isi.items) {
        let idLini = item.idLini ?? null;
        let hargaBeli = 0;
        let tipeItem = "barang";

        if (item.idBarang) {
          const [master] = await tx
            .select()
            .from(barang)
            .where(eq(barang.idBarang, item.idBarang));
          if (!master) {
            throw new GalatHttp(404, "barang_tidak_ada", `Barang #${item.idBarang} tidak ditemukan.`);
          }
          idLini = master.idLini;
          hargaBeli = master.hargaBeliTerakhir;
          tipeItem = master.tipe;
        }

        if (!idLini) {
          throw new GalatHttp(400, "lini_kosong", "Item manual wajib memilih lini usaha.");
        }

        await tx.insert(detailPenjualan).values({
          idTransaksi: isi.idTransaksi,
          idBarang: item.idBarang ?? null,
          namaItem: item.namaItem,
          jumlah: String(item.jumlah),
          hargaSatuan: item.hargaSatuan,
          hargaBeliSaatItu: hargaBeli,
          idLini,
          jalurInput: item.jalurInput,
        });

        // BR-11: hanya 'barang' yang mengurangi stok; jasa tidak.
        if (item.idBarang && tipeItem === "barang") {
          const batches = await tx
            .select({
              idBatch: stokBatch.idBatch,
              jumlahSisa: stokBatch.jumlahSisa,
              tglKedaluwarsa: stokBatch.tglKedaluwarsa,
            })
            .from(stokBatch)
            .where(and(eq(stokBatch.idBarang, item.idBarang), sql`${stokBatch.jumlahSisa} > 0`));

          const { alokasi, kurang } = alokasiFefo(
            batches.map((b) => ({
              idBatch: b.idBatch,
              jumlahSisa: Number(b.jumlahSisa),
              tglKedaluwarsa: b.tglKedaluwarsa,
            })),
            item.jumlah,
          );

          for (const a of alokasi) {
            await tx
              .update(stokBatch)
              .set({ jumlahSisa: sql`${stokBatch.jumlahSisa} - ${a.jumlah}` })
              .where(eq(stokBatch.idBatch, a.idBatch));
          }

          if (kurang > 0) {
            peringatan.push(`${item.namaItem} kurang ${kurang} dari stok tercatat`);
          }
        }
      }

      return { peringatanStok: peringatan };
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "jual",
      objek: `transaksi#${noTransaksi}`,
      detail: `${isi.items.length} item; metode ${isi.metode}; total ${total}`,
    });

    const kembalian =
      isi.metode === "tunai" && isi.dibayar !== undefined ? hitungKembalian(total, isi.dibayar) : 0;

    return Response.json({
      ulangan: false,
      idTransaksi: isi.idTransaksi,
      noTransaksi,
      total,
      kembalian,
      peringatanStok,
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
