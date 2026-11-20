import { connection } from "next/server";
import { desc, eq, isNotNull } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import { barang, hutangPemasok, pemasok, titipJual } from "@/lib/db/schema";
import { kewajibanTitip } from "@/lib/domain/titip";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/titip — daftar titip jual beserta kewajiban bayar ke penitip
 * (F17 / FR-09, BR-07). Kewajiban = jumlah laku × harga titip; sisa saldo
 * berasal dari tabel hutang pemasok (berkurang saat dibayar).
 */
export async function GET() {
  await connection();
  try {
    await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const daftar = await db
      .select({
        idTitip: titipJual.idTitip,
        idPemasok: titipJual.idPemasok,
        namaPemasok: pemasok.nama,
        idBarang: titipJual.idBarang,
        namaBarang: barang.namaBarang,
        satuan: barang.satuan,
        tglTitip: titipJual.tglTitip,
        jumlahTitip: titipJual.jumlahTitip,
        hargaTitip: titipJual.hargaTitip,
        jumlahLaku: titipJual.jumlahLaku,
        status: titipJual.status,
      })
      .from(titipJual)
      .innerJoin(pemasok, eq(titipJual.idPemasok, pemasok.idPemasok))
      .innerJoin(barang, eq(titipJual.idBarang, barang.idBarang))
      .orderBy(desc(titipJual.idTitip))
      .limit(100);

    const hutang = await db
      .select({
        idTitip: hutangPemasok.idTitip,
        saldo: hutangPemasok.saldo,
        status: hutangPemasok.status,
      })
      .from(hutangPemasok)
      .where(isNotNull(hutangPemasok.idTitip));

    const saldoPerTitip = new Map(hutang.map((h) => [h.idTitip, h]));

    return Response.json({
      titip: daftar.map((t) => {
        const jumlahLaku = Number(t.jumlahLaku);
        const kewajiban = kewajibanTitip(jumlahLaku, t.hargaTitip);
        const hutangBaris = saldoPerTitip.get(t.idTitip);
        const sisaKewajiban = hutangBaris?.saldo ?? 0;
        return {
          idTitip: t.idTitip,
          namaPemasok: t.namaPemasok,
          namaBarang: t.namaBarang,
          satuan: t.satuan,
          tglTitip: t.tglTitip,
          jumlahTitip: Number(t.jumlahTitip),
          jumlahLaku,
          hargaTitip: t.hargaTitip,
          kewajiban,
          dibayar: kewajiban - sisaKewajiban,
          sisaKewajiban,
          status: t.status,
        };
      }),
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
