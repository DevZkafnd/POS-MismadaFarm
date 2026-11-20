import { connection } from "next/server";
import { and, asc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, pelanggan, piutang, stokBatch } from "@/lib/db/schema";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/notifikasi — stok ≤ minimum, hampir kedaluwarsa, kasbon jatuh tempo
 * (F10 / FR-08, BR-04).
 *
 * Ambang kedaluwarsa default 3 hari (sesuai panduan; perlu konfirmasi pengelola).
 */
const AMBANG_KEDALUWARSA_HARI = 3;

function tanggalJakarta(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

function tambahHari(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();

    const hariIni = tanggalJakarta();
    const batasKedaluwarsa = tambahHari(hariIni, AMBANG_KEDALUWARSA_HARI);

    // 1. Stok ≤ stok minimum (hanya barang, bukan jasa).
    // Pakai subquery agregat yang di-join — bukan correlated subquery: pada
    // query satu-tabel, Drizzle menulis referensi `barang.id_barang` tanpa
    // prefix sehingga bentrok dengan `stok_batch.id_barang` (selalu benar).
    const stokAgregat = db
      .select({
        idBarang: stokBatch.idBarang,
        stokTotal: sql<number>`sum(${stokBatch.jumlahSisa})::float`.as("stok_total"),
      })
      .from(stokBatch)
      .groupBy(stokBatch.idBarang)
      .as("sa");

    const stokRendah = await db
      .select({
        idBarang: barang.idBarang,
        namaBarang: barang.namaBarang,
        satuan: barang.satuan,
        stokMinimum: barang.stokMinimum,
        stokTotal: sql<number>`coalesce(${stokAgregat.stokTotal}, 0)`,
      })
      .from(barang)
      .leftJoin(stokAgregat, eq(stokAgregat.idBarang, barang.idBarang))
      .where(
        and(
          eq(barang.tipe, "barang"),
          sql`${barang.stokMinimum} > 0`,
          sql`coalesce(${stokAgregat.stokTotal}, 0) <= ${barang.stokMinimum}`,
        ),
      )
      .orderBy(asc(barang.namaBarang));

    // 2. Batch hampir kedaluwarsa (≤ hari ini + 3 hari) yang masih bersisa.
    const hampirKedaluwarsa = await db
      .select({
        idBatch: stokBatch.idBatch,
        idBarang: stokBatch.idBarang,
        namaBarang: barang.namaBarang,
        satuan: barang.satuan,
        jumlahSisa: stokBatch.jumlahSisa,
        tglKedaluwarsa: stokBatch.tglKedaluwarsa,
      })
      .from(stokBatch)
      .innerJoin(barang, eq(stokBatch.idBarang, barang.idBarang))
      .where(
        and(
          isNotNull(stokBatch.tglKedaluwarsa),
          sql`${stokBatch.jumlahSisa} > 0`,
          lte(stokBatch.tglKedaluwarsa, batasKedaluwarsa),
        ),
      )
      .orderBy(asc(stokBatch.tglKedaluwarsa));

    // 3. Kasbon (piutang) belum lunas yang jatuh tempo ≤ 3 hari.
    const kasbonJatuhTempo = await db
      .select({
        idPiutang: piutang.idPiutang,
        namaPelanggan: pelanggan.nama,
        noHp: pelanggan.noHp,
        saldo: piutang.saldo,
        jatuhTempo: piutang.jatuhTempo,
        status: piutang.status,
      })
      .from(piutang)
      .innerJoin(pelanggan, eq(piutang.idPelanggan, pelanggan.idPelanggan))
      .where(and(sql`${piutang.status} <> 'lunas'`, lte(piutang.jatuhTempo, batasKedaluwarsa)))
      .orderBy(asc(piutang.jatuhTempo));

    return Response.json({
      hariIni,
      ambangKedaluwarsaHari: AMBANG_KEDALUWARSA_HARI,
      stokRendah,
      hampirKedaluwarsa,
      kasbonJatuhTempo,
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
