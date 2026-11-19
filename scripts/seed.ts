/**
 * CAPST-43 — Skrip impor data master (F02 / FR-02).
 *
 * Membaca berkas CSV → tabel `barang` + `stok_batch` awal + `riwayat_harga` awal,
 * sekaligus membuat 3 akun uji (satu per peran).
 *
 * Pakai:
 *   npm run seed                              # impor data/barang.csv
 *   npm run seed -- --file data/barang_tidak_valid.csv --cek
 *   npm run seed -- --reset                   # kosongkan master lalu impor ulang
 *
 * Aturan yang dipatuhi:
 * - Uang disimpan sebagai bilangan bulat rupiah (Bagian 0 poin 8).
 * - Item bertipe `jasa` tidak dibuatkan stok_batch (BR-11).
 * - Barcode duplikat / harga kosong / satuan tidak dikenal dilaporkan, tidak dimuat.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { barang, liniUsaha, pengguna, peran, riwayatHarga, stokBatch } from "@/lib/db/schema";
import { PERAN, type NamaPeran } from "@/lib/auth/peran";
import { cariBarcodeDuplikat, validasiBarisBarang, type BarangImpor } from "@/lib/validasi/barang";

const DAFTAR_LINI = ["Kelontong", "Pupuk Subsidi", "Kerupuk Kulit", "Sewa Traktor", "Pasca Panen"];

/** Akun uji, satu per peran. PIN default 123456 (prototipe). */
const AKUN_UJI: { username: string; nama: string; peran: NamaPeran; pin: string }[] = [
  { username: "pemilik", nama: "Pemilik Toko", peran: PERAN.PEMILIK, pin: "123456" },
  { username: "penerus", nama: "Penerus Usaha", peran: PERAN.PENERUS_USAHA, pin: "123456" },
  { username: "kasir", nama: "Kasir Toko", peran: PERAN.KASIR, pin: "123456" },
];

type BarisGagal = { baris: number; barcode: string; galat: string[] };

function argNilai(nama: string): string | undefined {
  const prefiks = `${nama}=`;
  const samaDengan = process.argv.find((a) => a.startsWith(prefiks));
  if (samaDengan) return samaDengan.slice(prefiks.length);
  const idx = process.argv.indexOf(nama);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

/** Parser CSV sederhana (tanpa tanda kutip; data master tidak memuat koma di dalam kolom). */
function parseCsv(teks: string): Record<string, string>[] {
  const baris = teks
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((b) => b.trim() !== "");
  if (baris.length === 0) return [];

  const header = baris[0].split(",").map((h) => h.trim());
  const hasil: Record<string, string>[] = [];
  for (let i = 1; i < baris.length; i++) {
    const kolom = baris[i].split(",");
    const row: Record<string, string> = {};
    header.forEach((nama, idx) => {
      row[nama] = (kolom[idx] ?? "").trim();
    });
    hasil.push(row);
  }
  return hasil;
}

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");
  const dryRun = process.argv.includes("--cek");
  const berkas = argNilai("--file") ?? "data/barang.csv";

  const { getDb } = await import("@/lib/db");
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL belum diatur. Isi .env.local lalu jalankan ulang.");
    process.exit(1);
  }

  // 1. Pastikan peran dan lini usaha tersedia.
  await db
    .insert(peran)
    .values(Object.values(PERAN).map((namaPeran) => ({ namaPeran })))
    .onConflictDoNothing();
  await db
    .insert(liniUsaha)
    .values(DAFTAR_LINI.map((namaLini) => ({ namaLini })))
    .onConflictDoNothing();

  const barisPeran = await db.select().from(peran);
  const barisLini = await db.select().from(liniUsaha);
  const petaPeran = new Map(barisPeran.map((p) => [p.namaPeran, p.idPeran]));
  const petaLini = new Map(barisLini.map((l) => [l.namaLini.toLowerCase(), l.idLini]));

  // 2. Akun uji (hash PIN baru dibuat bila akun belum ada).
  let akunDibuat = 0;
  for (const akun of AKUN_UJI) {
    const ada = await db.select().from(pengguna).where(eq(pengguna.username, akun.username));
    if (ada.length > 0) continue;
    const idPeran = petaPeran.get(akun.peran);
    if (!idPeran) throw new Error(`Peran "${akun.peran}" tidak ditemukan di tabel peran.`);
    await db.insert(pengguna).values({
      nama: akun.nama,
      username: akun.username,
      passwordHash: await bcrypt.hash(akun.pin, 10),
      idPeran,
    });
    akunDibuat++;
  }

  const [pemilik] = await db.select().from(pengguna).where(eq(pengguna.username, "pemilik"));
  if (!pemilik) throw new Error("Akun pemilik tidak ditemukan; tidak bisa mencatat riwayat harga.");

  // 3. Baca dan validasi CSV.
  const teks = await readFile(resolve(process.cwd(), berkas), "utf8");
  const rows = parseCsv(teks);
  const petaLiniSederhana: Record<string, number> = {};
  for (const [nama, id] of petaLini) petaLiniSederhana[nama] = id;

  const duplikat = cariBarcodeDuplikat(rows);
  const valid: BarangImpor[] = [];
  const gagal: BarisGagal[] = [];

  rows.forEach((row, i) => {
    const nomor = i + 2; // 1 header + basis 1
    const barcode = (row.kode_barcode ?? "").trim();
    if (barcode && duplikat.has(barcode)) {
      gagal.push({ baris: nomor, barcode, galat: ["kode_barcode duplikat di dalam berkas"] });
      return;
    }
    const hasil = validasiBarisBarang(row, petaLiniSederhana);
    if (hasil.ok) valid.push(hasil.data);
    else gagal.push({ baris: nomor, barcode, galat: hasil.galat });
  });

  // 4. Mode --cek: laporkan validasi saja, tanpa menyimpan.
  if (dryRun) {
    console.log(`\nBerkas          : ${berkas} (mode cek, tidak menyimpan)`);
    console.log(`Baris dibaca    : ${rows.length}`);
    console.log(`Valid           : ${valid.length}`);
    console.log(`Gagal           : ${gagal.length}`);
    if (gagal.length > 0) {
      console.log("\n--- Baris yang gagal ---");
      for (const g of gagal) {
        console.log(`  baris ${g.baris} (barcode: ${g.barcode || "-"}): ${g.galat.join("; ")}`);
      }
    }
    return;
  }

  // 5. Cek kondisi master sebelum menyimpan.
  const [{ jumlahBarang }] = await db
    .select({ jumlahBarang: sql<number>`count(*)::int` })
    .from(barang);

  if (jumlahBarang > 0 && !reset) {
    console.error(
      `Tabel barang sudah berisi ${jumlahBarang} baris. Jalankan dengan --reset untuk mengosongkan master lalu impor ulang, atau --cek untuk hanya memeriksa berkas.`,
    );
    process.exit(1);
  }
  if (reset) {
    await db.execute(sql`TRUNCATE TABLE stok_batch, riwayat_harga, barang RESTART IDENTITY CASCADE`);
    console.log("Master dikosongkan (--reset).");
  }

  // 6. Simpan dalam satu transaksi: semua berhasil atau semua dibatalkan.
  await db.transaction(async (tx) => {
    for (const item of valid) {
      const [barisBaru] = await tx
        .insert(barang)
        .values({
          kodeBarcode: item.kodeBarcode,
          namaBarang: item.namaBarang,
          idLini: item.idLini,
          tipe: item.tipe,
          satuan: item.satuan,
          hargaJualAktif: item.hargaJualAktif,
          hargaBeliTerakhir: item.hargaBeliTerakhir,
          stokMinimum: String(item.stokMinimum),
          favorit: item.favorit,
          cepatRusak: item.cepatRusak,
        })
        .returning({ idBarang: barang.idBarang });

      await tx.insert(riwayatHarga).values({
        idBarang: barisBaru.idBarang,
        hargaJual: item.hargaJualAktif,
        hargaBeli: item.hargaBeliTerakhir,
        diubahOleh: pemilik.idPengguna,
      });

      // BR-11: item jasa tidak punya stok.
      if (item.tipe === "barang" && item.stokAwal > 0) {
        await tx.insert(stokBatch).values({
          idBarang: barisBaru.idBarang,
          jumlahSisa: String(item.stokAwal),
          statusMilik: "sendiri",
        });
      }
    }
  });

  // 6. Laporan.
  console.log(`\nBerkas          : ${berkas}`);
  console.log(`Baris dibaca    : ${rows.length}`);
  console.log(`Berhasil dimuat : ${valid.length}`);
  console.log(`Gagal           : ${gagal.length}`);
  if (akunDibuat > 0) console.log(`Akun uji dibuat : ${akunDibuat} (PIN default 123456)`);

  if (gagal.length > 0) {
    console.log("\n--- Baris yang gagal ---");
    for (const g of gagal) {
      console.log(`  baris ${g.baris} (barcode: ${g.barcode || "-"}): ${g.galat.join("; ")}`);
    }
  }

  const ringkasanLini = await db
    .select({ lini: liniUsaha.namaLini, jumlah: sql<number>`count(${barang.idBarang})::int` })
    .from(liniUsaha)
    .leftJoin(barang, eq(barang.idLini, liniUsaha.idLini))
    .groupBy(liniUsaha.namaLini)
    .orderBy(liniUsaha.namaLini);
  console.log("\n--- Jumlah barang per lini usaha ---");
  for (const r of ringkasanLini) console.log(`  ${r.lini}: ${r.jumlah}`);

  console.log(`\nTotal barang di basis data: ${jumlahBarang + valid.length}`);
}

main().catch((galat) => {
  console.error("Seed gagal:", galat);
  process.exit(1);
});
