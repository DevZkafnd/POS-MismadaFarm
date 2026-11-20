import { connection, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import {
  pembayaranHutang,
  pelunasanPiutang,
  pengeluaran,
  rekapHarian,
  transaksiPenjualan,
} from "@/lib/db/schema";
import { bolehKunciRekap, hitungKasSeharusnya, hitungSelisihKas } from "@/lib/domain/kas";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaRekap } from "@/lib/validasi/kas";

/**
 * Rekap harian + pembanding kas (F11 / FR-13, BR-09).
 * Kasir mengisi uang fisik; selisih wajib diberi keterangan sebelum dikunci.
 */

function tanggalJakarta(d = new Date()): string {
  // en-CA menghasilkan format YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

/** Hitung komponen kas seharusnya untuk satu tanggal (waktu Jakarta). */
async function komponenTanggal(db: Db, tanggal: string) {
  const [p] = await db
    .select({ nilai: sql<number>`coalesce(sum(${transaksiPenjualan.total}),0)::float` })
    .from(transaksiPenjualan)
    .where(
      and(
        eq(transaksiPenjualan.metode, "tunai"),
        eq(transaksiPenjualan.statusTransaksi, "aktif"),
        sql`(${transaksiPenjualan.waktu} at time zone 'Asia/Jakarta')::date = ${tanggal}`,
      ),
    );

  const [l] = await db
    .select({ nilai: sql<number>`coalesce(sum(${pelunasanPiutang.jumlah}),0)::float` })
    .from(pelunasanPiutang)
    .where(eq(pelunasanPiutang.tanggal, tanggal));

  const [g] = await db
    .select({ nilai: sql<number>`coalesce(sum(${pengeluaran.jumlah}),0)::float` })
    .from(pengeluaran)
    .where(eq(pengeluaran.tanggal, tanggal));

  const [h] = await db
    .select({ nilai: sql<number>`coalesce(sum(${pembayaranHutang.jumlah}),0)::float` })
    .from(pembayaranHutang)
    .where(eq(pembayaranHutang.tanggal, tanggal));

  return {
    penjualanTunai: Number(p?.nilai ?? 0),
    pelunasanPiutang: Number(l?.nilai ?? 0),
    pengeluaranTunai: Number(g?.nilai ?? 0),
    pembayaranPemasokTunai: Number(h?.nilai ?? 0),
  };
}

/** GET /api/rekap?tanggal= — komponen kas + rekap tersimpan bila ada. */
export async function GET(req: NextRequest) {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();
    const tanggal = req.nextUrl.searchParams.get("tanggal") ?? tanggalJakarta();

    const komponen = await komponenTanggal(db, tanggal);
    const [ada] = await db.select().from(rekapHarian).where(eq(rekapHarian.tanggal, tanggal));

    return Response.json({ tanggal, komponen, rekap: ada ?? null });
  } catch (galat) {
    return responsGalat(galat);
  }
}

/** POST /api/rekap — simpan / kunci rekap hari ini (BR-09). */
export async function POST(req: Request) {
  try {
    const sesi = await requireRole(SEMUA_PERAN);
    const db = butuhDb();
    const isi = skemaRekap.parse(await bacaJson(req));
    const tanggal = tanggalJakarta();

    const komponen = await komponenTanggal(db, tanggal);
    const kasSeharusnya = hitungKasSeharusnya({ kasAwal: isi.kasAwal, ...komponen });
    const selisih = hitungSelisihKas(isi.kasFisik, kasSeharusnya);

    if (isi.kunci && !bolehKunciRekap(selisih, isi.keterangan)) {
      throw new GalatHttp(
        400,
        "keterangan_wajib",
        "Selisih wajib diberi keterangan sebelum rekap dikunci.",
      );
    }

    const [ada] = await db.select().from(rekapHarian).where(eq(rekapHarian.tanggal, tanggal));
    if (ada?.statusKunci) {
      throw new GalatHttp(400, "rekap_terkunci", "Rekap hari ini sudah dikunci dan tidak bisa diubah.");
    }

    if (ada) {
      await db
        .update(rekapHarian)
        .set({
          kasSeharusnya,
          kasFisik: isi.kasFisik,
          selisih,
          keterangan: isi.keterangan ?? null,
          statusKunci: isi.kunci,
          kasAwal: isi.kasAwal,
          idKasir: sesi.idPengguna,
        })
        .where(eq(rekapHarian.idRekap, ada.idRekap));
    } else {
      await db.insert(rekapHarian).values({
        tanggal,
        kasSeharusnya,
        kasFisik: isi.kasFisik,
        selisih,
        keterangan: isi.keterangan ?? null,
        statusKunci: isi.kunci,
        kasAwal: isi.kasAwal,
        idKasir: sesi.idPengguna,
      });
    }

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "rekap",
      objek: `rekap#${tanggal}`,
      detail: `seharusnya ${kasSeharusnya}; fisik ${isi.kasFisik}; selisih ${selisih}${isi.kunci ? "; dikunci" : ""}`,
    });

    return Response.json({
      tanggal,
      kasSeharusnya,
      kasFisik: isi.kasFisik,
      selisih,
      terkunci: isi.kunci,
      komponen,
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
