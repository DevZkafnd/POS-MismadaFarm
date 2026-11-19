-- =============================================================================
--  MISMADA FARM - Skema Basis Data PostgreSQL
--  Sumber : ERD pada proposal Capstone (Gambar 4.11 s.d. 4.15) + Tabel 4.9 (BR)
--  Target : PostgreSQL 13+ (Neon / Supabase / lokal). gen_random_uuid() bawaan.
--  Cara   : psql "$DATABASE_URL" -f mismada_farm_schema.sql
--           (atau tempel ke SQL Editor Neon/Supabase)
--
--  Konvensi
--   * Nama tabel dan kolom PERSIS mengikuti ERD (huruf kecil, snake_case).
--   * Uang   : BIGINT rupiah bulat (BR / catatan agen: tidak pakai float).
--   * Jumlah : NUMERIC(12,3) karena ada barang per kg (sayuran).
--   * Waktu  : TIMESTAMPTZ; tanggal murni memakai DATE.
--   * Nilai terbatas (tunai/kasbon dst.) memakai CHECK, bukan tipe ENUM,
--     supaya mudah diubah saat iterasi.
--
--  Bagian bertanda [TAMBAHAN] TIDAK ada di gambar ERD, tetapi dibutuhkan oleh
--  aturan bisnis / fitur proposal. Hapus bila tim memutuskan tidak memakainya,
--  dan catat perubahannya di Tabel 4.22 (perbandingan skema dengan ERD).
-- =============================================================================

BEGIN;

-- Bersihkan bila dijalankan ulang (hati-hati: MENGHAPUS SEMUA DATA).
-- Hapus komentar blok di bawah hanya untuk reset di lingkungan pengembangan.
/*
DROP VIEW  IF EXISTS v_stok_barang;
DROP TABLE IF EXISTS log_aktivitas, pengeluaran, rekap_harian, retur,
  detail_opname, stok_opname, pelunasan_piutang, piutang, detail_penjualan,
  transaksi_penjualan, pembayaran_hutang, hutang_pemasok, titip_jual,
  stok_batch, detail_penerimaan, penerimaan_barang, riwayat_harga, barang,
  pelanggan, pemasok, lini_usaha, pengguna, peran CASCADE;
*/


-- =============================================================================
--  GAMBAR 4.12 (bagian) : PERAN dan PENGGUNA  (F01, FR-01, Tabel 4.10)
-- =============================================================================

CREATE TABLE peran (
    id_peran    SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_peran  TEXT NOT NULL UNIQUE
);
COMMENT ON TABLE peran IS 'Peran RBAC: pemilik, kasir, penerus_usaha (Tabel 4.10).';

CREATE TABLE pengguna (
    id_pengguna    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama           TEXT    NOT NULL,
    username       TEXT    NOT NULL UNIQUE,
    password_hash  TEXT    NOT NULL,   -- isi: hash PIN/kata sandi (argon2/bcrypt), JANGAN teks asli (NFR-03)
    id_peran       SMALLINT NOT NULL REFERENCES peran(id_peran),
    aktif          BOOLEAN NOT NULL DEFAULT TRUE
);
COMMENT ON COLUMN pengguna.password_hash IS 'Hash PIN/kata sandi. Tidak pernah menyimpan nilai asli (NFR-03).';


-- =============================================================================
--  GAMBAR 4.11 : DATA MASTER DAN STOK  (F02, F05, FR-02, FR-04)
-- =============================================================================

CREATE TABLE lini_usaha (
    id_lini     SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_lini   TEXT NOT NULL UNIQUE
);
COMMENT ON TABLE lini_usaha IS 'Kelontong, Pupuk Subsidi, Kerupuk Kulit, Sewa Traktor, Pasca Panen.';

CREATE TABLE pemasok (
    id_pemasok  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama        TEXT NOT NULL,
    no_hp       TEXT,
    jenis       TEXT          -- ERD tidak merinci nilai; isi bebas (mis. distributor, penitip)
);

CREATE TABLE pelanggan (
    id_pelanggan  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama          TEXT NOT NULL,
    no_hp         TEXT
);
COMMENT ON TABLE pelanggan IS 'Data pribadi: akses dibatasi sesuai peran (NFR-04, UU PDP).';

CREATE TABLE barang (
    id_barang            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_barcode         TEXT,
    nama_barang          TEXT     NOT NULL,
    id_lini              SMALLINT NOT NULL REFERENCES lini_usaha(id_lini),
    tipe                 TEXT     NOT NULL DEFAULT 'barang'
                         CHECK (tipe IN ('barang','jasa')),          -- jasa tidak mengurangi stok (BR-11)
    satuan               TEXT     NOT NULL,
    harga_jual_aktif     BIGINT   NOT NULL DEFAULT 0 CHECK (harga_jual_aktif >= 0),   -- satu harga aktif (BR-01)
    harga_beli_terakhir  BIGINT   NOT NULL DEFAULT 0 CHECK (harga_beli_terakhir >= 0),
    stok_minimum         NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (stok_minimum >= 0),  -- BR-04
    favorit              BOOLEAN  NOT NULL DEFAULT FALSE,
    cepat_rusak          BOOLEAN  NOT NULL DEFAULT FALSE             -- FEFO (BR-03)
);
-- Barcode unik bila ada; barang tanpa barcode boleh banyak (BR-02).
CREATE UNIQUE INDEX uq_barang_barcode ON barang (kode_barcode) WHERE kode_barcode IS NOT NULL;
CREATE INDEX ix_barang_lini     ON barang (id_lini);
CREATE INDEX ix_barang_favorit  ON barang (favorit) WHERE favorit;

CREATE TABLE riwayat_harga (
    id_riwayat     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_barang      BIGINT      NOT NULL REFERENCES barang(id_barang),
    harga_jual     BIGINT      NOT NULL CHECK (harga_jual >= 0),
    harga_beli     BIGINT      NOT NULL DEFAULT 0 CHECK (harga_beli >= 0),
    berlaku_mulai  TIMESTAMPTZ NOT NULL DEFAULT now(),
    diubah_oleh    BIGINT      NOT NULL REFERENCES pengguna(id_pengguna)
);
CREATE INDEX ix_riwayat_harga_barang ON riwayat_harga (id_barang, berlaku_mulai DESC);
COMMENT ON TABLE riwayat_harga IS 'Setiap perubahan harga = baris baru, tidak menimpa data lama (BR-01).';


-- =============================================================================
--  GAMBAR 4.14 : PENERIMAAN BARANG, TITIP JUAL, HUTANG PEMASOK  (F06, F17, F18)
--  Dibuat sebelum STOK_BATCH karena STOK_BATCH merujuk DETAIL_PENERIMAAN.
-- =============================================================================

CREATE TABLE penerimaan_barang (
    id_penerimaan  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pemasok     BIGINT NOT NULL REFERENCES pemasok(id_pemasok),
    tanggal        DATE   NOT NULL DEFAULT CURRENT_DATE,
    jenis          TEXT   NOT NULL CHECK (jenis IN ('tunai','kredit','titipan')),
    id_penerima    BIGINT NOT NULL REFERENCES pengguna(id_pengguna),
    total          BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0)
);
CREATE INDEX ix_penerimaan_pemasok ON penerimaan_barang (id_pemasok, tanggal DESC);

CREATE TABLE detail_penerimaan (
    id_detail        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_penerimaan    BIGINT NOT NULL REFERENCES penerimaan_barang(id_penerimaan),
    id_barang        BIGINT NOT NULL REFERENCES barang(id_barang),
    jumlah           NUMERIC(12,3) NOT NULL CHECK (jumlah > 0),
    harga_beli       BIGINT        NOT NULL CHECK (harga_beli >= 0),
    tgl_kedaluwarsa  DATE
);
CREATE INDEX ix_detail_penerimaan_penerimaan ON detail_penerimaan (id_penerimaan);
CREATE INDEX ix_detail_penerimaan_barang     ON detail_penerimaan (id_barang);

-- Stok per batch (Gambar 4.11); tabel ini disusun di sini agar urutan FK benar.
CREATE TABLE stok_batch (
    id_batch             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_barang            BIGINT NOT NULL REFERENCES barang(id_barang),
    id_detail_penerimaan BIGINT REFERENCES detail_penerimaan(id_detail),   -- boleh kosong (stok awal / migrasi)
    jumlah_sisa          NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (jumlah_sisa >= 0),
    tgl_kedaluwarsa      DATE,
    status_milik         TEXT   NOT NULL DEFAULT 'sendiri' CHECK (status_milik IN ('sendiri','titipan')),
    id_pemasok           BIGINT REFERENCES pemasok(id_pemasok)
);
-- Mendukung FEFO: ambil batch dengan kedaluwarsa terdekat lebih dulu (BR-03).
CREATE INDEX ix_stok_batch_fefo ON stok_batch (id_barang, tgl_kedaluwarsa NULLS LAST, id_batch)
    WHERE jumlah_sisa > 0;
CREATE INDEX ix_stok_batch_pemasok ON stok_batch (id_pemasok);

CREATE TABLE titip_jual (
    id_titip      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pemasok    BIGINT NOT NULL REFERENCES pemasok(id_pemasok),     -- penitip
    id_barang     BIGINT NOT NULL REFERENCES barang(id_barang),
    tgl_titip     DATE   NOT NULL DEFAULT CURRENT_DATE,
    jumlah_titip  NUMERIC(12,3) NOT NULL CHECK (jumlah_titip > 0),
    harga_titip   BIGINT        NOT NULL CHECK (harga_titip >= 0),
    jumlah_laku   NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (jumlah_laku >= 0),
    status        TEXT   NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','selesai')),  -- ERD tidak merinci nilai; sesuaikan
    id_pencatat   BIGINT NOT NULL REFERENCES pengguna(id_pengguna),
    CHECK (jumlah_laku <= jumlah_titip)
);
COMMENT ON TABLE titip_jual IS 'Kewajiban bayar ke penitip = jumlah_laku x harga_titip (BR-07).';
CREATE INDEX ix_titip_jual_pemasok ON titip_jual (id_pemasok, status);

CREATE TABLE hutang_pemasok (
    id_hutang      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_penerimaan  BIGINT REFERENCES penerimaan_barang(id_penerimaan),  -- kosong jika berasal dari titip jual
    id_titip       BIGINT REFERENCES titip_jual(id_titip),              -- kosong jika berasal dari penerimaan
    id_pemasok     BIGINT NOT NULL REFERENCES pemasok(id_pemasok),
    saldo          BIGINT NOT NULL CHECK (saldo >= 0),
    jatuh_tempo    DATE,
    status         TEXT   NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','sebagian','lunas')),
    CHECK (id_penerimaan IS NOT NULL OR id_titip IS NOT NULL)           -- harus punya asal
);
CREATE INDEX ix_hutang_pemasok       ON hutang_pemasok (id_pemasok, status);
CREATE INDEX ix_hutang_jatuh_tempo   ON hutang_pemasok (jatuh_tempo) WHERE status <> 'lunas';

CREATE TABLE pembayaran_hutang (
    id_pembayaran  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_hutang      BIGINT NOT NULL REFERENCES hutang_pemasok(id_hutang),
    jumlah         BIGINT NOT NULL CHECK (jumlah > 0),
    tanggal        DATE   NOT NULL DEFAULT CURRENT_DATE,
    id_pencatat    BIGINT NOT NULL REFERENCES pengguna(id_pengguna)
);
CREATE INDEX ix_pembayaran_hutang ON pembayaran_hutang (id_hutang);


-- =============================================================================
--  GAMBAR 4.12 : PENJUALAN  (F03, F07, F19, FR-03, FR-18)
-- =============================================================================

CREATE TABLE transaksi_penjualan (
    -- UUID dibuat di HP sehingga pengiriman ulang dari antrean offline tidak
    -- membuat transaksi ganda (F19 / Cuplikan Kode 4.2). Tipe PK tidak
    -- ditentukan di ERD; di sini dipilih UUID.
    id_transaksi   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_transaksi   TEXT NOT NULL UNIQUE,
    waktu          TIMESTAMPTZ NOT NULL DEFAULT now(),
    id_kasir       BIGINT NOT NULL REFERENCES pengguna(id_pengguna),
    id_pelanggan   BIGINT REFERENCES pelanggan(id_pelanggan),            -- boleh kosong
    metode         TEXT   NOT NULL CHECK (metode IN ('tunai','kasbon')),
    total          BIGINT NOT NULL CHECK (total >= 0),
    status_sinkron BOOLEAN NOT NULL DEFAULT TRUE,

    -- [TAMBAHAN] pembatalan transaksi, dibutuhkan BR-13 / FR-17:
    -- transaksi tidak boleh dihapus, hanya dibatalkan penerus usaha dengan alasan.
    status_transaksi TEXT NOT NULL DEFAULT 'aktif' CHECK (status_transaksi IN ('aktif','dibatalkan')),
    alasan_batal     TEXT,
    dibatalkan_oleh  BIGINT REFERENCES pengguna(id_pengguna),
    dibatalkan_pada  TIMESTAMPTZ,

    CHECK (metode <> 'kasbon' OR id_pelanggan IS NOT NULL),              -- BR-05: kasbon wajib pelanggan
    CHECK (status_transaksi <> 'dibatalkan' OR (alasan_batal IS NOT NULL AND dibatalkan_oleh IS NOT NULL))
);
CREATE INDEX ix_transaksi_waktu     ON transaksi_penjualan (waktu DESC);
CREATE INDEX ix_transaksi_kasir     ON transaksi_penjualan (id_kasir, waktu DESC);
CREATE INDEX ix_transaksi_pelanggan ON transaksi_penjualan (id_pelanggan);

CREATE TABLE detail_penjualan (
    id_detail           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_transaksi        UUID     NOT NULL REFERENCES transaksi_penjualan(id_transaksi),
    id_barang           BIGINT   REFERENCES barang(id_barang),            -- kosong jika item manual
    nama_item           TEXT     NOT NULL,
    jumlah              NUMERIC(12,3) NOT NULL CHECK (jumlah > 0),
    harga_satuan        BIGINT   NOT NULL CHECK (harga_satuan >= 0),      -- harga saat transaksi (BR-01)
    harga_beli_saat_itu BIGINT   NOT NULL DEFAULT 0 CHECK (harga_beli_saat_itu >= 0),  -- dasar laba (BR-10)
    id_lini             SMALLINT NOT NULL REFERENCES lini_usaha(id_lini),
    jalur_input         TEXT     NOT NULL CHECK (jalur_input IN ('scan','favorit','manual')),
    CHECK (id_barang IS NOT NULL OR jalur_input = 'manual')
);
CREATE INDEX ix_detail_penjualan_transaksi ON detail_penjualan (id_transaksi);
CREATE INDEX ix_detail_penjualan_barang    ON detail_penjualan (id_barang);
CREATE INDEX ix_detail_penjualan_lini      ON detail_penjualan (id_lini);


-- =============================================================================
--  GAMBAR 4.13 : PIUTANG  (F09, FR-07, BR-05)
-- =============================================================================

CREATE TABLE piutang (
    id_piutang    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_transaksi  UUID   UNIQUE REFERENCES transaksi_penjualan(id_transaksi),   -- relasi 0..1 : 1
    id_pelanggan  BIGINT NOT NULL REFERENCES pelanggan(id_pelanggan),
    nilai_awal    BIGINT NOT NULL CHECK (nilai_awal > 0),
    saldo         BIGINT NOT NULL CHECK (saldo >= 0),
    jatuh_tempo   DATE   NOT NULL,                                              -- wajib (BR-05)
    status        TEXT   NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','sebagian','lunas')),
    CHECK (saldo <= nilai_awal)
);
CREATE INDEX ix_piutang_pelanggan    ON piutang (id_pelanggan, status);
CREATE INDEX ix_piutang_jatuh_tempo  ON piutang (jatuh_tempo) WHERE status <> 'lunas';

CREATE TABLE pelunasan_piutang (
    id_pelunasan  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_piutang    BIGINT NOT NULL REFERENCES piutang(id_piutang),
    jumlah        BIGINT NOT NULL CHECK (jumlah > 0),
    tanggal       DATE   NOT NULL DEFAULT CURRENT_DATE,
    id_kasir      BIGINT NOT NULL REFERENCES pengguna(id_pengguna)
);
CREATE INDEX ix_pelunasan_piutang ON pelunasan_piutang (id_piutang);


-- =============================================================================
--  GAMBAR 4.15 : OPNAME, RETUR, REKAP HARIAN, PENGELUARAN, LOG AKTIVITAS
-- =============================================================================

-- ---- Stok opname (F16, FR-11, BR-08) ----------------------------------------
CREATE TABLE stok_opname (
    id_opname     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tanggal       DATE   NOT NULL DEFAULT CURRENT_DATE,
    id_petugas    BIGINT NOT NULL REFERENCES pengguna(id_pengguna),
    id_penyetuju  BIGINT REFERENCES pengguna(id_pengguna)       -- kosong sampai disetujui penerus usaha
);

CREATE TABLE detail_opname (
    id_detail    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_opname    BIGINT NOT NULL REFERENCES stok_opname(id_opname),
    id_barang    BIGINT NOT NULL REFERENCES barang(id_barang),
    stok_sistem  NUMERIC(12,3) NOT NULL,
    stok_fisik   NUMERIC(12,3) NOT NULL CHECK (stok_fisik >= 0),
    selisih      NUMERIC(12,3) NOT NULL,                        -- stok_fisik - stok_sistem
    alasan       TEXT,
    CHECK (selisih = stok_fisik - stok_sistem),
    CHECK (selisih = 0 OR alasan IS NOT NULL)                   -- alasan selisih wajib (BR-08)
);
CREATE INDEX ix_detail_opname_opname ON detail_opname (id_opname);

-- ---- Retur (F15, FR-09, BR-06) ----------------------------------------------
CREATE TABLE retur (
    id_retur            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jenis               TEXT   NOT NULL CHECK (jenis IN ('pelanggan','pemasok')),
    id_barang           BIGINT NOT NULL REFERENCES barang(id_barang),
    id_detail_penjualan BIGINT REFERENCES detail_penjualan(id_detail),     -- rujukan harga asal (retur pelanggan)
    id_penerimaan       BIGINT REFERENCES penerimaan_barang(id_penerimaan),-- rujukan harga asal (retur pemasok)
    jumlah              NUMERIC(12,3) NOT NULL CHECK (jumlah > 0),
    nilai               BIGINT NOT NULL CHECK (nilai >= 0),
    alasan              TEXT   NOT NULL,
    tanggal             DATE   NOT NULL DEFAULT CURRENT_DATE,
    id_pencatat         BIGINT NOT NULL REFERENCES pengguna(id_pengguna)
);
CREATE INDEX ix_retur_barang ON retur (id_barang, tanggal DESC);

-- ---- Rekap harian (F11, FR-13, BR-09) ---------------------------------------
CREATE TABLE rekap_harian (
    id_rekap        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tanggal         DATE   NOT NULL UNIQUE,                     -- satu rekap per hari
    kas_seharusnya  BIGINT NOT NULL,
    kas_fisik       BIGINT NOT NULL CHECK (kas_fisik >= 0),
    selisih         BIGINT NOT NULL,                            -- kas_fisik - kas_seharusnya
    keterangan      TEXT,
    status_kunci    BOOLEAN NOT NULL DEFAULT FALSE,
    id_kasir        BIGINT NOT NULL REFERENCES pengguna(id_pengguna),
    kas_awal        BIGINT,                                     -- [TAMBAHAN] rumus BR-09 memakai kas awal
    CHECK (selisih = kas_fisik - kas_seharusnya),
    CHECK (selisih = 0 OR NOT status_kunci OR keterangan IS NOT NULL)  -- selisih wajib keterangan sebelum kunci (BR-09)
);

-- ---- Pengeluaran (F14, FR-12) -----------------------------------------------
CREATE TABLE pengeluaran (
    id_pengeluaran  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_lini         SMALLINT NOT NULL REFERENCES lini_usaha(id_lini),
    kategori        TEXT   NOT NULL,
    jumlah          BIGINT NOT NULL CHECK (jumlah > 0),
    tanggal         DATE   NOT NULL DEFAULT CURRENT_DATE,
    dicatat_oleh    BIGINT NOT NULL REFERENCES pengguna(id_pengguna)
);
CREATE INDEX ix_pengeluaran_lini_tanggal ON pengeluaran (id_lini, tanggal);
COMMENT ON TABLE pengeluaran IS
  'Pengeluaran yang tidak bisa dipisah per lini dicatat pada lini umum (BR-10); '
  'tambahkan baris lini "Umum" bila tim memutuskan memakainya.';

-- ---- Log aktivitas (F08, FR-17) ---------------------------------------------
CREATE TABLE log_aktivitas (
    id_log       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pengguna  BIGINT NOT NULL REFERENCES pengguna(id_pengguna),
    aksi         TEXT   NOT NULL,
    objek        TEXT   NOT NULL,
    waktu        TIMESTAMPTZ NOT NULL DEFAULT now(),
    detail       TEXT
);
CREATE INDEX ix_log_pengguna_waktu ON log_aktivitas (id_pengguna, waktu DESC);
CREATE INDEX ix_log_waktu          ON log_aktivitas (waktu DESC);


-- =============================================================================
--  [TAMBAHAN] PENGAMAN ATURAN BISNIS (opsional, bisa dihapus)
--  Menegakkan di tingkat database hal yang sudah ditetapkan di Tabel 4.9.
-- =============================================================================

-- BR-13: transaksi tidak boleh dihapus, hanya dibatalkan.
CREATE FUNCTION fn_tolak_hapus() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Data pada tabel % tidak boleh dihapus (BR-13). Gunakan pembatalan dengan alasan.', TG_TABLE_NAME;
END $$;

CREATE TRIGGER trg_tolak_hapus_transaksi
    BEFORE DELETE ON transaksi_penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_tolak_hapus();

CREATE TRIGGER trg_tolak_hapus_detail_penjualan
    BEFORE DELETE ON detail_penjualan
    FOR EACH ROW EXECUTE FUNCTION fn_tolak_hapus();

-- BR-01: riwayat harga hanya bertambah, tidak boleh diubah atau dihapus.
CREATE FUNCTION fn_riwayat_harga_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'riwayat_harga bersifat tambah-saja (BR-01). Tambahkan baris baru untuk perubahan harga.';
END $$;

CREATE TRIGGER trg_riwayat_harga_append_only
    BEFORE UPDATE OR DELETE ON riwayat_harga
    FOR EACH ROW EXECUTE FUNCTION fn_riwayat_harga_append_only();

-- BR-09: rekap yang sudah dikunci tidak bisa diubah/dihapus.
CREATE FUNCTION fn_rekap_terkunci() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status_kunci THEN
        RAISE EXCEPTION 'Rekap harian % sudah dikunci dan tidak dapat diubah (BR-09).', OLD.tanggal;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_rekap_terkunci
    BEFORE UPDATE OR DELETE ON rekap_harian
    FOR EACH ROW EXECUTE FUNCTION fn_rekap_terkunci();


-- =============================================================================
--  [TAMBAHAN] VIEW BANTU
-- =============================================================================

-- Stok total per barang dari seluruh batch (barang bertipe jasa tidak punya stok).
CREATE VIEW v_stok_barang AS
SELECT  b.id_barang,
        b.kode_barcode,
        b.nama_barang,
        b.id_lini,
        b.satuan,
        b.stok_minimum,
        COALESCE(SUM(sb.jumlah_sisa), 0)                          AS stok_total,
        COALESCE(SUM(sb.jumlah_sisa), 0) <= b.stok_minimum        AS stok_menipis,
        MIN(sb.tgl_kedaluwarsa) FILTER (WHERE sb.jumlah_sisa > 0) AS kedaluwarsa_terdekat
FROM    barang b
LEFT JOIN stok_batch sb ON sb.id_barang = b.id_barang
WHERE   b.tipe = 'barang'
GROUP BY b.id_barang;


-- =============================================================================
--  DATA AWAL (seed)
-- =============================================================================

INSERT INTO peran (nama_peran) VALUES
    ('pemilik'),
    ('kasir'),
    ('penerus_usaha');

INSERT INTO lini_usaha (nama_lini) VALUES
    ('Kelontong'),
    ('Pupuk Subsidi'),
    ('Kerupuk Kulit'),
    ('Sewa Traktor'),
    ('Pasca Panen');

-- Akun awal TIDAK dibuat di sini karena password_hash harus dihasilkan aplikasi
-- (argon2/bcrypt). Buat lewat skrip seed aplikasi: 1 pemilik, 1 penerus_usaha, 1 kasir.

COMMIT;

-- =============================================================================
--  PEMERIKSAAN CEPAT SETELAH IMPORT
-- =============================================================================
--  SELECT count(*) FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_type = 'BASE TABLE';   -- harus 23
--  SELECT * FROM peran;        -- 3 baris
--  SELECT * FROM lini_usaha;   -- 5 baris
-- =============================================================================
