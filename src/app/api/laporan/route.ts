import { connection, type NextRequest } from "next/server";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { PERAN } from "@/lib/auth/peran";
import { requireRole } from "@/lib/auth/rbac";
import {
  barang,
  detailPenjualan,
  liniUsaha,
  pengeluaran,
  transaksiPenjualan,
} from "@/lib/db/schema";
import {
  labaBersih,
  labaKotorBaris,
  labaRugiLini,
  marginPersen,
} from "@/lib/domain/laporan";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/laporan?dari=&sampai= — laporan laba-rugi (F12 / FR-14, BR-10).
 *
 * Laba kotor = Σ (harga satuan − harga beli saat transaksi) × jumlah.
 * Laba-rugi per lini = laba kotor lini − pengeluaran lini.
 * Kasir TIDAK boleh mengakses (Tabel 4.10: kasir tidak melihat laba-rugi).
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    await requireRole([PERAN.PEMILIK, PERAN.PENERUS_USAHA]);
    const db = butuhDb();

    const dari = req.nextUrl.searchParams.get("dari");
    const sampai = req.nextUrl.searchParams.get("sampai");

    const syaratWaktu: SQL[] = [eq(transaksiPenjualan.statusTransaksi, "aktif")];
    if (dari) {
      syaratWaktu.push(sql`(${transaksiPenjualan.waktu} at time zone 'Asia/Jakarta')::date >= ${dari}`);
    }
    if (sampai) {
      syaratWaktu.push(sql`(${transaksiPenjualan.waktu} at time zone 'Asia/Jakarta')::date <= ${sampai}`);
    }

    const baris = await db
      .select({
        idBarang: detailPenjualan.idBarang,
        namaItem: detailPenjualan.namaItem,
        idLini: detailPenjualan.idLini,
        namaLini: liniUsaha.namaLini,
        jumlah: detailPenjualan.jumlah,
        hargaSatuan: detailPenjualan.hargaSatuan,
        hargaBeliSatuan: detailPenjualan.hargaBeliSaatItu,
      })
      .from(detailPenjualan)
      .innerJoin(
        transaksiPenjualan,
        eq(detailPenjualan.idTransaksi, transaksiPenjualan.idTransaksi),
      )
      .innerJoin(liniUsaha, eq(detailPenjualan.idLini, liniUsaha.idLini))
      .where(and(...syaratWaktu));

    const syaratTanggal: SQL[] = [];
    if (dari) syaratTanggal.push(sql`${pengeluaran.tanggal} >= ${dari}`);
    if (sampai) syaratTanggal.push(sql`${pengeluaran.tanggal} <= ${sampai}`);
    const pengeluaranPerLini = await db
      .select({
        idLini: pengeluaran.idLini,
        total: sql<number>`coalesce(sum(${pengeluaran.jumlah}),0)::float`,
      })
      .from(pengeluaran)
      .where(syaratTanggal.length > 0 ? and(...syaratTanggal) : undefined)
      .groupBy(pengeluaran.idLini);

    const petaPengeluaran = new Map(pengeluaranPerLini.map((p) => [p.idLini, Number(p.total)]));
    const petaLini = new Map<number, { idLini: number; namaLini: string; omzet: number; labaKotor: number }>();
    const petaBarang = new Map<
      number,
      { idBarang: number; namaItem: string; terjual: number; omzet: number; labaKotor: number }
    >();

    let totalOmzet = 0;
    let totalLabaKotor = 0;

    for (const b of baris) {
      const jumlah = Number(b.jumlah);
      const omzet = Math.round(b.hargaSatuan * jumlah);
      const laba = labaKotorBaris({
        hargaSatuan: b.hargaSatuan,
        hargaBeliSaatItu: b.hargaBeliSatuan,
        jumlah,
      });
      totalOmzet += omzet;
      totalLabaKotor += laba;

      const l = petaLini.get(b.idLini) ?? { idLini: b.idLini, namaLini: b.namaLini, omzet: 0, labaKotor: 0 };
      l.omzet += omzet;
      l.labaKotor += laba;
      petaLini.set(b.idLini, l);

      if (b.idBarang !== null) {
        const k = petaBarang.get(b.idBarang) ?? {
          idBarang: b.idBarang,
          namaItem: b.namaItem,
          terjual: 0,
          omzet: 0,
          labaKotor: 0,
        };
        k.terjual += jumlah;
        k.omzet += omzet;
        k.labaKotor += laba;
        petaBarang.set(b.idBarang, k);
      }
    }

    // Per lini (lini "Umum" dikecualikan; hanya tampil di konsolidasi — BR-10).
    const daftarLini = await db.select().from(liniUsaha);
    const perLini = daftarLini
      .filter((l) => l.namaLini.trim().toLowerCase() !== "umum")
      .map((l) => {
        const omzet = petaLini.get(l.idLini)?.omzet ?? 0;
        const labaKotor = petaLini.get(l.idLini)?.labaKotor ?? 0;
        const pengeluaranLini = petaPengeluaran.get(l.idLini) ?? 0;
        return {
          idLini: l.idLini,
          namaLini: l.namaLini,
          omzet,
          labaKotor,
          pengeluaran: pengeluaranLini,
          labaRugi: labaRugiLini(labaKotor, pengeluaranLini),
        };
      });

    const totalPengeluaran = [...petaPengeluaran.values()].reduce((t, v) => t + v, 0);

    // Margin per barang memakai harga master saat ini.
    const daftarBarang = await db
      .select({
        idBarang: barang.idBarang,
        namaBarang: barang.namaBarang,
        hargaJualAktif: barang.hargaJualAktif,
        hargaBeliTerakhir: barang.hargaBeliTerakhir,
      })
      .from(barang);
    const petaMaster = new Map(daftarBarang.map((b) => [b.idBarang, b]));

    const marginBarang = [...petaBarang.values()]
      .map((b) => {
        const master = petaMaster.get(b.idBarang);
        const hargaJual = master?.hargaJualAktif ?? 0;
        const hargaBeli = master?.hargaBeliTerakhir ?? 0;
        return {
          idBarang: b.idBarang,
          namaBarang: master?.namaBarang ?? b.namaItem,
          hargaJual,
          hargaBeli,
          marginPersen: marginPersen(hargaJual, hargaBeli),
          terjual: b.terjual,
          omzet: b.omzet,
          labaKotor: b.labaKotor,
        };
      })
      .sort((a, b) => b.labaKotor - a.labaKotor);

    return Response.json({
      periode: { dari: dari ?? null, sampai: sampai ?? null },
      konsolidasi: {
        omzet: totalOmzet,
        labaKotor: totalLabaKotor,
        pengeluaran: totalPengeluaran,
        labaBersih: labaBersih(totalLabaKotor, totalPengeluaran),
      },
      perLini,
      marginBarang,
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
