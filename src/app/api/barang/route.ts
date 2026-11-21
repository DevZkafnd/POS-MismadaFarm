import { type NextRequest, connection } from "next/server";
import { type SQL, and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { butuhSesi } from "@/lib/auth/rbac";
import { PERAN } from "@/lib/auth/peran";
import { barang, liniUsaha } from "@/lib/db/schema";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/barang?q=&limit= — cari data master barang (F02 / FR-02).
 * Semua peran yang sudah masuk boleh mencari (kasir butuh saat melayani).
 * Harga beli disembunyikan dari kasir (Tabel 4.10: kasir tidak melihat laba-rugi).
 */
export async function GET(req: NextRequest) {
  // Selalu dirender saat permintaan (bukan saat build): bergantung sesi & DB.
  await connection();
  try {
    const sesi = await butuhSesi();
    const db = butuhDb();

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const hanyaFavorit = req.nextUrl.searchParams.get("favorit") === "1";
    const limitDiminta = Number(req.nextUrl.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitDiminta) ? Math.min(Math.max(limitDiminta, 1), 200) : 50;

    // PENTING: Barcode dicari dengan exact match dulu, baru fallback ke ILIKE untuk nama
    // Ini mempertahankan nol di depan (0899...) dan mendukung pencarian partial nama
    const pola = `%${q}%`;
    const syarat: (SQL | undefined)[] = [];
    if (q) {
      // Prioritas: exact match barcode, kemudian partial match nama atau barcode
      syarat.push(
        or(
          eq(barang.kodeBarcode, q), // Exact match untuk barcode (termasuk nol di depan)
          ilike(barang.namaBarang, pola), // Partial match untuk nama
          ilike(barang.kodeBarcode, pola) // Partial match untuk barcode
        )
      );
    }
    // Jalur "Favorit" di layar Jual (F03) memakai penyaring ini.
    if (hanyaFavorit) syarat.push(eq(barang.favorit, true));
    const kondisi = syarat.length > 0 ? and(...syarat) : undefined;

    const daftar = await db
      .select({
        idBarang: barang.idBarang,
        kodeBarcode: barang.kodeBarcode,
        namaBarang: barang.namaBarang,
        idLini: barang.idLini,
        namaLini: liniUsaha.namaLini,
        tipe: barang.tipe,
        satuan: barang.satuan,
        hargaJualAktif: barang.hargaJualAktif,
        hargaBeliTerakhir: barang.hargaBeliTerakhir,
        stokMinimum: barang.stokMinimum,
        favorit: barang.favorit,
        cepatRusak: barang.cepatRusak,
        stokTotal: sql<number>`coalesce((select sum(sb.jumlah_sisa) from stok_batch sb where sb.id_barang = ${barang.idBarang}), 0)::float`,
      })
      .from(barang)
      .innerJoin(liniUsaha, eq(barang.idLini, liniUsaha.idLini))
      .where(kondisi)
      .orderBy(asc(barang.namaBarang))
      .limit(limit);

    const bolehLihatHargaBeli = sesi.peran !== PERAN.KASIR;

    return Response.json({
      barang: daftar.map((b) => ({
        ...b,
        hargaBeliTerakhir: bolehLihatHargaBeli ? b.hargaBeliTerakhir : null,
      })),
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
