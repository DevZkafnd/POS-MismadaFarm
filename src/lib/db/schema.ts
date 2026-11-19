/**
 * Skema Drizzle (Tabel 4.22) — cerminan dari `mismada_farm_schema.sql`.
 *
 * Sumber kebenaran skema tetap berkas SQL `mismada_farm_schema.sql` (diterapkan
 * manual ke PostgreSQL). Berkas ini adalah pemetaan ORM agar query TypeScript
 * bertipe. Bila keduanya berbeda, yang berlaku adalah berkas SQL.
 *
 * Konvensi:
 * - Uang: BIGINT rupiah bulat (bukan float) — Aturan Bagian 0 poin 8.
 * - Jumlah: NUMERIC(12,3) karena ada barang per kg (sayuran).
 * - Waktu: TIMESTAMPTZ; tanggal murni memakai DATE.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Pengguna & peran (Gambar 4.12, F01, FR-01, Tabel 4.10)
// ---------------------------------------------------------------------------

export const peran = pgTable("peran", {
  idPeran: smallint("id_peran").generatedAlwaysAsIdentity().primaryKey(),
  namaPeran: text("nama_peran").notNull().unique(),
});

export const pengguna = pgTable("pengguna", {
  idPengguna: bigint("id_pengguna", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  nama: text("nama").notNull(),
  username: text("username").notNull().unique(),
  // Hash PIN/kata sandi (argon2/bcrypt). Tidak pernah menyimpan nilai asli (NFR-03).
  passwordHash: text("password_hash").notNull(),
  idPeran: smallint("id_peran")
    .notNull()
    .references(() => peran.idPeran),
  aktif: boolean("aktif").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Data master & stok (Gambar 4.11, F02, F05, FR-02, FR-04)
// ---------------------------------------------------------------------------

export const liniUsaha = pgTable("lini_usaha", {
  idLini: smallint("id_lini").generatedAlwaysAsIdentity().primaryKey(),
  namaLini: text("nama_lini").notNull().unique(),
});

export const pemasok = pgTable("pemasok", {
  idPemasok: bigint("id_pemasok", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  nama: text("nama").notNull(),
  noHp: text("no_hp"),
  jenis: text("jenis"),
});

export const pelanggan = pgTable("pelanggan", {
  idPelanggan: bigint("id_pelanggan", { mode: "number" })
    .generatedAlwaysAsIdentity()
    .primaryKey(),
  nama: text("nama").notNull(),
  noHp: text("no_hp"),
});

export const barang = pgTable(
  "barang",
  {
    idBarang: bigint("id_barang", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    kodeBarcode: text("kode_barcode"),
    namaBarang: text("nama_barang").notNull(),
    idLini: smallint("id_lini")
      .notNull()
      .references(() => liniUsaha.idLini),
    // 'jasa' tidak mengurangi stok (BR-11).
    tipe: text("tipe").notNull().default("barang"),
    satuan: text("satuan").notNull(),
    // Satu harga aktif (BR-01).
    hargaJualAktif: bigint("harga_jual_aktif", { mode: "number" }).notNull().default(0),
    hargaBeliTerakhir: bigint("harga_beli_terakhir", { mode: "number" }).notNull().default(0),
    stokMinimum: numeric("stok_minimum", { precision: 12, scale: 3 }).notNull().default("0"),
    favorit: boolean("favorit").notNull().default(false),
    // Cepat rusak → dipakai FEFO (BR-03).
    cepatRusak: boolean("cepat_rusak").notNull().default(false),
  },
  (t) => [
    check("barang_tipe_check", sql`${t.tipe} in ('barang','jasa')`),
    check("barang_harga_jual_check", sql`${t.hargaJualAktif} >= 0`),
    check("barang_harga_beli_check", sql`${t.hargaBeliTerakhir} >= 0`),
    // Barcode unik bila ada; barang tanpa barcode boleh banyak (BR-02).
    uniqueIndex("uq_barang_barcode")
      .on(t.kodeBarcode)
      .where(sql`kode_barcode is not null`),
    index("ix_barang_lini").on(t.idLini),
    index("ix_barang_favorit")
      .on(t.favorit)
      .where(sql`favorit`),
  ],
);

// Setiap perubahan harga = baris baru, tidak menimpa data lama (BR-01).
export const riwayatHarga = pgTable(
  "riwayat_harga",
  {
    idRiwayat: bigint("id_riwayat", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idBarang: bigint("id_barang", { mode: "number" })
      .notNull()
      .references(() => barang.idBarang),
    hargaJual: bigint("harga_jual", { mode: "number" }).notNull(),
    hargaBeli: bigint("harga_beli", { mode: "number" }).notNull().default(0),
    berlakuMulai: timestamp("berlaku_mulai", { withTimezone: true }).notNull().defaultNow(),
    diubahOleh: bigint("diubah_oleh", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
  },
  (t) => [index("ix_riwayat_harga_barang").on(t.idBarang, t.berlakuMulai.desc())],
);

// ---------------------------------------------------------------------------
// Penerimaan, titip jual, hutang pemasok (Gambar 4.14, F06, F17, F18)
// ---------------------------------------------------------------------------

export const penerimaanBarang = pgTable(
  "penerimaan_barang",
  {
    idPenerimaan: bigint("id_penerimaan", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    idPemasok: bigint("id_pemasok", { mode: "number" })
      .notNull()
      .references(() => pemasok.idPemasok),
    tanggal: date("tanggal").notNull().default(sql`CURRENT_DATE`),
    jenis: text("jenis").notNull(),
    idPenerima: bigint("id_penerima", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
    total: bigint("total", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    check("penerimaan_jenis_check", sql`${t.jenis} in ('tunai','kredit','titipan')`),
    index("ix_penerimaan_pemasok").on(t.idPemasok, t.tanggal.desc()),
  ],
);

export const detailPenerimaan = pgTable(
  "detail_penerimaan",
  {
    idDetail: bigint("id_detail", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idPenerimaan: bigint("id_penerimaan", { mode: "number" })
      .notNull()
      .references(() => penerimaanBarang.idPenerimaan),
    idBarang: bigint("id_barang", { mode: "number" })
      .notNull()
      .references(() => barang.idBarang),
    jumlah: numeric("jumlah", { precision: 12, scale: 3 }).notNull(),
    hargaBeli: bigint("harga_beli", { mode: "number" }).notNull(),
    tglKedaluwarsa: date("tgl_kedaluwarsa"),
  },
  (t) => [
    index("ix_detail_penerimaan_penerimaan").on(t.idPenerimaan),
    index("ix_detail_penerimaan_barang").on(t.idBarang),
  ],
);

export const stokBatch = pgTable(
  "stok_batch",
  {
    idBatch: bigint("id_batch", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idBarang: bigint("id_barang", { mode: "number" })
      .notNull()
      .references(() => barang.idBarang),
    // Boleh kosong untuk stok awal / migrasi.
    idDetailPenerimaan: bigint("id_detail_penerimaan", { mode: "number" }).references(
      () => detailPenerimaan.idDetail,
    ),
    jumlahSisa: numeric("jumlah_sisa", { precision: 12, scale: 3 }).notNull().default("0"),
    tglKedaluwarsa: date("tgl_kedaluwarsa"),
    statusMilik: text("status_milik").notNull().default("sendiri"),
    idPemasok: bigint("id_pemasok", { mode: "number" }).references(() => pemasok.idPemasok),
  },
  (t) => [
    check("stok_batch_status_milik_check", sql`${t.statusMilik} in ('sendiri','titipan')`),
    // Mendukung FEFO: batch dengan kedaluwarsa terdekat lebih dulu (BR-03).
    index("ix_stok_batch_fefo")
      .on(t.idBarang, sql`tgl_kedaluwarsa asc nulls last`, t.idBatch)
      .where(sql`jumlah_sisa > 0`),
    index("ix_stok_batch_pemasok").on(t.idPemasok),
  ],
);

// Kewajiban bayar ke penitip = jumlah_laku x harga_titip (BR-07).
export const titipJual = pgTable(
  "titip_jual",
  {
    idTitip: bigint("id_titip", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idPemasok: bigint("id_pemasok", { mode: "number" })
      .notNull()
      .references(() => pemasok.idPemasok),
    idBarang: bigint("id_barang", { mode: "number" })
      .notNull()
      .references(() => barang.idBarang),
    tglTitip: date("tgl_titip").notNull().default(sql`CURRENT_DATE`),
    jumlahTitip: numeric("jumlah_titip", { precision: 12, scale: 3 }).notNull(),
    hargaTitip: bigint("harga_titip", { mode: "number" }).notNull(),
    jumlahLaku: numeric("jumlah_laku", { precision: 12, scale: 3 }).notNull().default("0"),
    status: text("status").notNull().default("aktif"),
    idPencatat: bigint("id_pencatat", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
  },
  (t) => [
    check("titip_jual_status_check", sql`${t.status} in ('aktif','selesai')`),
    check("titip_jual_laku_check", sql`${t.jumlahLaku} <= ${t.jumlahTitip}`),
    index("ix_titip_jual_pemasok").on(t.idPemasok, t.status),
  ],
);

export const hutangPemasok = pgTable(
  "hutang_pemasok",
  {
    idHutang: bigint("id_hutang", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    // Kosong jika berasal dari titip jual.
    idPenerimaan: bigint("id_penerimaan", { mode: "number" }).references(
      () => penerimaanBarang.idPenerimaan,
    ),
    // Kosong jika berasal dari penerimaan.
    idTitip: bigint("id_titip", { mode: "number" }).references(() => titipJual.idTitip),
    idPemasok: bigint("id_pemasok", { mode: "number" })
      .notNull()
      .references(() => pemasok.idPemasok),
    saldo: bigint("saldo", { mode: "number" }).notNull(),
    jatuhTempo: date("jatuh_tempo"),
    status: text("status").notNull().default("belum"),
  },
  (t) => [
    check("hutang_saldo_check", sql`${t.saldo} >= 0`),
    check("hutang_status_check", sql`${t.status} in ('belum','sebagian','lunas')`),
    // Harus punya asal: penerimaan atau titip jual.
    check("hutang_asal_check", sql`${t.idPenerimaan} is not null or ${t.idTitip} is not null`),
    index("ix_hutang_pemasok").on(t.idPemasok, t.status),
    index("ix_hutang_jatuh_tempo")
      .on(t.jatuhTempo)
      .where(sql`status <> 'lunas'`),
  ],
);

export const pembayaranHutang = pgTable(
  "pembayaran_hutang",
  {
    idPembayaran: bigint("id_pembayaran", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    idHutang: bigint("id_hutang", { mode: "number" })
      .notNull()
      .references(() => hutangPemasok.idHutang),
    jumlah: bigint("jumlah", { mode: "number" }).notNull(),
    tanggal: date("tanggal").notNull().default(sql`CURRENT_DATE`),
    idPencatat: bigint("id_pencatat", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
  },
  (t) => [index("ix_pembayaran_hutang").on(t.idHutang)],
);

// ---------------------------------------------------------------------------
// Penjualan (Gambar 4.12, F03, F07, F19, FR-03, FR-18)
// ---------------------------------------------------------------------------

export const transaksiPenjualan = pgTable(
  "transaksi_penjualan",
  {
    // UUID dibuat di HP agar pengiriman ulang dari antrean offline tidak
    // membuat transaksi ganda (F19 / Cuplikan Kode 4.2).
    idTransaksi: uuid("id_transaksi").primaryKey().defaultRandom(),
    noTransaksi: text("no_transaksi").notNull().unique(),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().defaultNow(),
    idKasir: bigint("id_kasir", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
    idPelanggan: bigint("id_pelanggan", { mode: "number" }).references(
      () => pelanggan.idPelanggan,
    ),
    metode: text("metode").notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
    statusSinkron: boolean("status_sinkron").notNull().default(true),
    // Transaksi tidak boleh dihapus, hanya dibatalkan (BR-13/FR-17).
    statusTransaksi: text("status_transaksi").notNull().default("aktif"),
    alasanBatal: text("alasan_batal"),
    dibatalkanOleh: bigint("dibatalkan_oleh", { mode: "number" }).references(
      () => pengguna.idPengguna,
    ),
    dibatalkanPada: timestamp("dibatalkan_pada", { withTimezone: true }),
  },
  (t) => [
    check("transaksi_metode_check", sql`${t.metode} in ('tunai','kasbon')`),
    check("transaksi_total_check", sql`${t.total} >= 0`),
    check("transaksi_status_check", sql`${t.statusTransaksi} in ('aktif','dibatalkan')`),
    // BR-05: kasbon wajib pelanggan.
    check("transaksi_kasbon_pelanggan_check", sql`${t.metode} <> 'kasbon' or ${t.idPelanggan} is not null`),
    check(
      "transaksi_batal_check",
      sql`${t.statusTransaksi} <> 'dibatalkan' or (${t.alasanBatal} is not null and ${t.dibatalkanOleh} is not null)`,
    ),
    index("ix_transaksi_waktu").on(t.waktu.desc()),
    index("ix_transaksi_kasir").on(t.idKasir, t.waktu.desc()),
    index("ix_transaksi_pelanggan").on(t.idPelanggan),
  ],
);

export const detailPenjualan = pgTable(
  "detail_penjualan",
  {
    idDetail: bigint("id_detail", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idTransaksi: uuid("id_transaksi")
      .notNull()
      .references(() => transaksiPenjualan.idTransaksi),
    // Kosong jika item manual.
    idBarang: bigint("id_barang", { mode: "number" }).references(() => barang.idBarang),
    namaItem: text("nama_item").notNull(),
    jumlah: numeric("jumlah", { precision: 12, scale: 3 }).notNull(),
    // Harga saat transaksi (BR-01).
    hargaSatuan: bigint("harga_satuan", { mode: "number" }).notNull(),
    // Dasar perhitungan laba (BR-10).
    hargaBeliSaatItu: bigint("harga_beli_saat_itu", { mode: "number" }).notNull().default(0),
    idLini: smallint("id_lini")
      .notNull()
      .references(() => liniUsaha.idLini),
    jalurInput: text("jalur_input").notNull(),
  },
  (t) => [
    check("detail_penjualan_jalur_check", sql`${t.jalurInput} in ('scan','favorit','manual')`),
    check("detail_penjualan_jumlah_check", sql`${t.jumlah} > 0`),
    check("detail_penjualan_harga_check", sql`${t.hargaSatuan} >= 0`),
    check("detail_penjualan_barang_check", sql`${t.idBarang} is not null or ${t.jalurInput} = 'manual'`),
    index("ix_detail_penjualan_transaksi").on(t.idTransaksi),
    index("ix_detail_penjualan_barang").on(t.idBarang),
    index("ix_detail_penjualan_lini").on(t.idLini),
  ],
);

// ---------------------------------------------------------------------------
// Piutang (Gambar 4.13, F09, FR-07, BR-05)
// ---------------------------------------------------------------------------

export const piutang = pgTable(
  "piutang",
  {
    idPiutang: bigint("id_piutang", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idTransaksi: uuid("id_transaksi")
      .unique()
      .references(() => transaksiPenjualan.idTransaksi),
    idPelanggan: bigint("id_pelanggan", { mode: "number" })
      .notNull()
      .references(() => pelanggan.idPelanggan),
    nilaiAwal: bigint("nilai_awal", { mode: "number" }).notNull(),
    saldo: bigint("saldo", { mode: "number" }).notNull(),
    // Wajib (BR-05).
    jatuhTempo: date("jatuh_tempo").notNull(),
    status: text("status").notNull().default("belum"),
  },
  (t) => [
    check("piutang_nilai_awal_check", sql`${t.nilaiAwal} > 0`),
    check("piutang_saldo_check", sql`${t.saldo} >= 0 and ${t.saldo} <= ${t.nilaiAwal}`),
    check("piutang_status_check", sql`${t.status} in ('belum','sebagian','lunas')`),
    index("ix_piutang_pelanggan").on(t.idPelanggan, t.status),
    index("ix_piutang_jatuh_tempo")
      .on(t.jatuhTempo)
      .where(sql`status <> 'lunas'`),
  ],
);

export const pelunasanPiutang = pgTable(
  "pelunasan_piutang",
  {
    idPelunasan: bigint("id_pelunasan", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    idPiutang: bigint("id_piutang", { mode: "number" })
      .notNull()
      .references(() => piutang.idPiutang),
    jumlah: bigint("jumlah", { mode: "number" }).notNull(),
    tanggal: date("tanggal").notNull().default(sql`CURRENT_DATE`),
    idKasir: bigint("id_kasir", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
  },
  (t) => [index("ix_pelunasan_piutang").on(t.idPiutang)],
);

// ---------------------------------------------------------------------------
// Opname, retur, rekap harian, pengeluaran, log aktivitas (Gambar 4.15)
// ---------------------------------------------------------------------------

export const stokOpname = pgTable("stok_opname", {
  idOpname: bigint("id_opname", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  tanggal: date("tanggal").notNull().default(sql`CURRENT_DATE`),
  idPetugas: bigint("id_petugas", { mode: "number" })
    .notNull()
    .references(() => pengguna.idPengguna),
  // Kosong sampai disetujui penerus usaha.
  idPenyetuju: bigint("id_penyetuju", { mode: "number" }).references(() => pengguna.idPengguna),
});

export const detailOpname = pgTable(
  "detail_opname",
  {
    idDetail: bigint("id_detail", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idOpname: bigint("id_opname", { mode: "number" })
      .notNull()
      .references(() => stokOpname.idOpname),
    idBarang: bigint("id_barang", { mode: "number" })
      .notNull()
      .references(() => barang.idBarang),
    stokSistem: numeric("stok_sistem", { precision: 12, scale: 3 }).notNull(),
    stokFisik: numeric("stok_fisik", { precision: 12, scale: 3 }).notNull(),
    selisih: numeric("selisih", { precision: 12, scale: 3 }).notNull(),
    alasan: text("alasan"),
  },
  (t) => [
    // Alasan selisih wajib (BR-08).
    check(
      "detail_opname_selisih_check",
      sql`${t.selisih} = ${t.stokFisik} - ${t.stokSistem} and (${t.selisih} = 0 or ${t.alasan} is not null)`,
    ),
    check("detail_opname_stok_fisik_check", sql`${t.stokFisik} >= 0`),
    index("ix_detail_opname_opname").on(t.idOpname),
  ],
);

export const retur = pgTable(
  "retur",
  {
    idRetur: bigint("id_retur", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    jenis: text("jenis").notNull(),
    idBarang: bigint("id_barang", { mode: "number" })
      .notNull()
      .references(() => barang.idBarang),
    // Rujukan harga asal (retur pelanggan).
    idDetailPenjualan: bigint("id_detail_penjualan", { mode: "number" }).references(
      () => detailPenjualan.idDetail,
    ),
    // Rujukan harga asal (retur pemasok).
    idPenerimaan: bigint("id_penerimaan", { mode: "number" }).references(
      () => penerimaanBarang.idPenerimaan,
    ),
    jumlah: numeric("jumlah", { precision: 12, scale: 3 }).notNull(),
    nilai: bigint("nilai", { mode: "number" }).notNull(),
    alasan: text("alasan").notNull(),
    tanggal: date("tanggal").notNull().default(sql`CURRENT_DATE`),
    idPencatat: bigint("id_pencatat", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
  },
  (t) => [
    check("retur_jenis_check", sql`${t.jenis} in ('pelanggan','pemasok')`),
    check("retur_jumlah_check", sql`${t.jumlah} > 0 and ${t.nilai} >= 0`),
    index("ix_retur_barang").on(t.idBarang, t.tanggal.desc()),
  ],
);

export const rekapHarian = pgTable(
  "rekap_harian",
  {
    idRekap: bigint("id_rekap", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    // Satu rekap per hari.
    tanggal: date("tanggal").notNull().unique(),
    kasSeharusnya: bigint("kas_seharusnya", { mode: "number" }).notNull(),
    kasFisik: bigint("kas_fisik", { mode: "number" }).notNull(),
    selisih: bigint("selisih", { mode: "number" }).notNull(),
    keterangan: text("keterangan"),
    statusKunci: boolean("status_kunci").notNull().default(false),
    idKasir: bigint("id_kasir", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
    // Rumus BR-09 memakai kas awal.
    kasAwal: bigint("kas_awal", { mode: "number" }),
  },
  (t) => [
    check("rekap_selisih_check", sql`${t.selisih} = ${t.kasFisik} - ${t.kasSeharusnya}`),
    check("rekap_kas_fisik_check", sql`${t.kasFisik} >= 0`),
    // Selisih wajib keterangan sebelum kunci (BR-09).
    check(
      "rekap_kunci_check",
      sql`${t.selisih} = 0 or not ${t.statusKunci} or ${t.keterangan} is not null`,
    ),
  ],
);

export const pengeluaran = pgTable(
  "pengeluaran",
  {
    idPengeluaran: bigint("id_pengeluaran", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    idLini: smallint("id_lini")
      .notNull()
      .references(() => liniUsaha.idLini),
    kategori: text("kategori").notNull(),
    jumlah: bigint("jumlah", { mode: "number" }).notNull(),
    tanggal: date("tanggal").notNull().default(sql`CURRENT_DATE`),
    dicatatOleh: bigint("dicatat_oleh", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
  },
  (t) => [
    check("pengeluaran_jumlah_check", sql`${t.jumlah} > 0`),
    index("ix_pengeluaran_lini_tanggal").on(t.idLini, t.tanggal),
  ],
);

export const logAktivitas = pgTable(
  "log_aktivitas",
  {
    idLog: bigint("id_log", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    idPengguna: bigint("id_pengguna", { mode: "number" })
      .notNull()
      .references(() => pengguna.idPengguna),
    aksi: text("aksi").notNull(),
    objek: text("objek").notNull(),
    // [TAMBAHAN] dipakai helper logAktivitas(userId, aksi, objek, detail).
    detail: text("detail"),
    waktu: timestamp("waktu", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_log_pengguna_waktu").on(t.idPengguna, t.waktu.desc()),
    index("ix_log_waktu").on(t.waktu.desc()),
  ],
);
