import { connection } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { pelanggan, pelunasanPiutang, piutang } from "@/lib/db/schema";
import { statusDariSaldo } from "@/lib/domain/saldo";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";
import { skemaPelunasan } from "@/lib/validasi/kasbon";

/**
 * GET /api/kasbon — daftar piutang (kasbon) + total belum lunas (F09 / FR-07).
 * POST /api/kasbon — catat pelunasan penuh atau cicilan (BR-05).
 * Semua peran boleh mencatat karena kasir yang melayani pelanggan.
 */
export async function GET() {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();

    const daftar = await db
      .select({
        idPiutang: piutang.idPiutang,
        idTransaksi: piutang.idTransaksi,
        idPelanggan: piutang.idPelanggan,
        namaPelanggan: pelanggan.nama,
        noHp: pelanggan.noHp,
        nilaiAwal: piutang.nilaiAwal,
        saldo: piutang.saldo,
        jatuhTempo: piutang.jatuhTempo,
        status: piutang.status,
      })
      .from(piutang)
      .innerJoin(pelanggan, eq(piutang.idPelanggan, pelanggan.idPelanggan))
      .orderBy(asc(piutang.status), asc(piutang.jatuhTempo));

    const [ringkas] = await db
      .select({ totalBelumLunas: sql<number>`coalesce(sum(${piutang.saldo}),0)::float` })
      .from(piutang)
      .where(sql`${piutang.status} <> 'lunas'`);

    return Response.json({ kasbon: daftar, totalBelumLunas: Number(ringkas?.totalBelumLunas ?? 0) });
  } catch (galat) {
    return responsGalat(galat);
  }
}

export async function POST(req: Request) {
  try {
    const sesi = await requireRole(SEMUA_PERAN);
    const db = butuhDb();
    const isi = skemaPelunasan.parse(await bacaJson(req));

    const hasil = await db.transaction(async (tx) => {
      const [p] = await tx.select().from(piutang).where(eq(piutang.idPiutang, isi.idPiutang));
      if (!p) throw new GalatHttp(404, "piutang_tidak_ada", "Kasbon tidak ditemukan.");
      if (p.status === "lunas") {
        throw new GalatHttp(400, "sudah_lunas", "Kasbon ini sudah lunas.");
      }
      if (isi.jumlah > p.saldo) {
        throw new GalatHttp(400, "melebihi_saldo", "Jumlah pelunasan melebihi sisa kasbon.");
      }

      const saldoBaru = p.saldo - isi.jumlah;
      const status = statusDariSaldo(saldoBaru, p.nilaiAwal);

      await tx.update(piutang).set({ saldo: saldoBaru, status }).where(eq(piutang.idPiutang, p.idPiutang));
      await tx.insert(pelunasanPiutang).values({
        idPiutang: p.idPiutang,
        jumlah: isi.jumlah,
        idKasir: sesi.idPengguna,
      });

      return { saldoBaru, status };
    });

    await catatAktivitas(db, {
      idPengguna: sesi.idPengguna,
      aksi: "pelunasan_kasbon",
      objek: `piutang#${isi.idPiutang}`,
      detail: `bayar ${isi.jumlah}; sisa ${hasil.saldoBaru}; status ${hasil.status}`,
    });

    return Response.json({ idPiutang: isi.idPiutang, saldo: hasil.saldoBaru, status: hasil.status });
  } catch (galat) {
    return responsGalat(galat);
  }
}
