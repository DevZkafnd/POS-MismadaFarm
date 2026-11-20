import { connection } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { hutangPemasok, pembayaranHutang, pemasok } from "@/lib/db/schema";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaBayarHutang } from "@/lib/validasi/hutang";

/**
 * GET /api/hutang — daftar hutang ke pemasok + total belum lunas (F18 / FR-16).
 * POST /api/hutang — catat pembayaran hutang (pemilik / penerus usaha).
 */
export async function GET() {
  await connection();
  try {
    await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const daftar = await db
      .select({
        idHutang: hutangPemasok.idHutang,
        idPemasok: hutangPemasok.idPemasok,
        namaPemasok: pemasok.nama,
        idPenerimaan: hutangPemasok.idPenerimaan,
        idTitip: hutangPemasok.idTitip,
        saldo: hutangPemasok.saldo,
        jatuhTempo: hutangPemasok.jatuhTempo,
        status: hutangPemasok.status,
      })
      .from(hutangPemasok)
      .innerJoin(pemasok, eq(hutangPemasok.idPemasok, pemasok.idPemasok))
      .orderBy(asc(hutangPemasok.status), asc(hutangPemasok.jatuhTempo));

    const [ringkas] = await db
      .select({ totalBelumLunas: sql<number>`coalesce(sum(${hutangPemasok.saldo}),0)::float` })
      .from(hutangPemasok)
      .where(sql`${hutangPemasok.status} <> 'lunas'`);

    return Response.json({ hutang: daftar, totalBelumLunas: Number(ringkas?.totalBelumLunas ?? 0) });
  } catch (galat) {
    return responsGalat(galat);
  }
}

export async function POST(req: Request) {
  try {
    const sesi = await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();
    const isi = skemaBayarHutang.parse(await bacaJson(req));

    const hasil = await db.transaction(async (tx) => {
      const [h] = await tx
        .select()
        .from(hutangPemasok)
        .where(eq(hutangPemasok.idHutang, isi.idHutang));
      if (!h) throw new GalatHttp(404, "hutang_tidak_ada", "Hutang tidak ditemukan.");
      if (h.status === "lunas") throw new GalatHttp(400, "sudah_lunas", "Hutang ini sudah lunas.");
      if (isi.jumlah > h.saldo) {
        throw new GalatHttp(400, "melebihi_saldo", "Jumlah bayar melebihi sisa hutang.");
      }

      const saldoBaru = h.saldo - isi.jumlah;
      // Hutang tidak menyimpan nilai awal; status cukup dari sisa saldo.
      const status = saldoBaru <= 0 ? "lunas" : "sebagian";

      await tx.update(hutangPemasok).set({ saldo: saldoBaru, status }).where(eq(hutangPemasok.idHutang, h.idHutang));
      await tx.insert(pembayaranHutang).values({
        idHutang: h.idHutang,
        jumlah: isi.jumlah,
        tanggal: isi.tanggal ?? undefined,
        idPencatat: sesi.idPengguna,
      });

      return { saldoBaru, status };
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "bayar_hutang",
      objek: `hutang#${isi.idHutang}`,
      detail: `bayar ${isi.jumlah}; sisa ${hasil.saldoBaru}; status ${hasil.status}`,
    });

    return Response.json({ idHutang: isi.idHutang, saldo: hasil.saldoBaru, status: hasil.status });
  } catch (galat) {
    return responsGalat(galat);
  }
}
