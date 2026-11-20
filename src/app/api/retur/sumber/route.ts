import { type NextRequest, connection } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { SEMUA_PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { detailPenerimaan, detailPenjualan, penerimaanBarang, transaksiPenjualan } from "@/lib/db/schema";
import { JENIS_RETUR, type JenisRetur } from "@/lib/domain/retur";
import { butuhDb, GalatHttp, responsGalat } from "@/lib/http";

/**
 * GET /api/retur/sumber?jenis=&idBarang= — daftar transaksi asal untuk
 * penelusuran harga (F15 / FR-09, BR-06).
 *
 * - jenis=pelanggan → item penjualan (harga satuan asal).
 * - jenis=pemasok   → item penerimaan (harga beli asal).
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    await requireRole(SEMUA_PERAN);
    const db = butuhDb();

    const jenis = req.nextUrl.searchParams.get("jenis") as JenisRetur | null;
    const idBarang = Number(req.nextUrl.searchParams.get("idBarang") ?? 0);

    if (!jenis || !JENIS_RETUR.includes(jenis)) {
      throw new GalatHttp(400, "jenis_tidak_valid", "Jenis retur tidak valid.");
    }
    if (!Number.isInteger(idBarang) || idBarang <= 0) {
      throw new GalatHttp(400, "barang_tidak_valid", "Barang tidak valid.");
    }

    if (jenis === "pelanggan") {
      const sumber = await db
        .select({
          idDetail: detailPenjualan.idDetail,
          noTransaksi: transaksiPenjualan.noTransaksi,
          waktu: transaksiPenjualan.waktu,
          hargaSatuan: detailPenjualan.hargaSatuan,
          jumlah: detailPenjualan.jumlah,
        })
        .from(detailPenjualan)
        .innerJoin(transaksiPenjualan, eq(detailPenjualan.idTransaksi, transaksiPenjualan.idTransaksi))
        .where(
          and(
            eq(detailPenjualan.idBarang, idBarang),
            eq(transaksiPenjualan.statusTransaksi, "aktif"),
          ),
        )
        .orderBy(desc(transaksiPenjualan.waktu))
        .limit(20);

      return Response.json({
        sumber: sumber.map((s) => ({
          idDetailPenjualan: s.idDetail,
          label: `${s.noTransaksi} · ${s.waktu.toISOString().slice(0, 10)}`,
          hargaSatuan: s.hargaSatuan,
          jumlah: Number(s.jumlah),
        })),
      });
    }

    const sumber = await db
      .select({
        idPenerimaan: detailPenerimaan.idPenerimaan,
        idDetail: detailPenerimaan.idDetail,
        tanggal: penerimaanBarang.tanggal,
        hargaBeli: detailPenerimaan.hargaBeli,
        jumlah: detailPenerimaan.jumlah,
      })
      .from(detailPenerimaan)
      .innerJoin(penerimaanBarang, eq(detailPenerimaan.idPenerimaan, penerimaanBarang.idPenerimaan))
      .where(eq(detailPenerimaan.idBarang, idBarang))
      .orderBy(desc(penerimaanBarang.tanggal), desc(detailPenerimaan.idDetail))
      .limit(20);

    return Response.json({
      sumber: sumber.map((s) => ({
        idPenerimaan: s.idPenerimaan,
        label: `Terima #${s.idPenerimaan} · ${s.tanggal}`,
        hargaBeli: s.hargaBeli,
        jumlah: Number(s.jumlah),
      })),
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
