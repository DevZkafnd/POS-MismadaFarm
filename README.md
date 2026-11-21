# POS Mismada Farm — Prototipe POS Warung Serba Usaha

Berkas ini adalah README proyek sekaligus bahan laporan **Bab IV.3 (Pengembangan)** dan
**IV.4 (Pengujian)**. Semua angka yang berasal dari repositori bersifat nyata (hasil
build/uji tanggal 2026-11-20). Sel bertanda **`[PERLU DIISI]`** adalah data yang hanya bisa
diisi oleh tim (hasil demo ke pengguna, spek HP pengujian, aplikasi pembanding, dsb.).

- Repositori: `https://github.com/DevZkafnd/POS-MismadaFarm.git` (branch utama `main`)
- Fitur proposal: F01–F20 (F21 tidak dikerjakan, BR-11/BR-12 di luar ruang lingkup)
- Hasil uji otomatis terkini: **65 tes lulus**, `next build` sukses (42 rute)
- Konfigurasi rinci: lihat [konfigurasi.md](file:///d:/projekan/POS%20mismada%20farm/docs/konfigurasi.md)

---

# IV.3 PENGEMBANGAN

## Tabel 4.16 — Keputusan teknologi

Versi dan pustaka diambil apa adanya dari `package.json` repositori.

| Komponen | Keputusan | Versi (dari `package.json`) | Tanggal keputusan |
|---|---|---|---|
| Kerangka aplikasi | **Next.js (App Router) + TypeScript** | `next` **16.4.6**, `react`/`react-dom` **19.3.0**, `typescript` **^5** | 2026-11-19 (fondasi Minggu 0) |
| Server / API | **Route Handler Next.js** (gaya REST, serverless di Vercel) | menyatu dengan `next` 16.4.6 | 2026-11-19 |
| Penyedia basis data | **PostgreSQL** (lokal 18 untuk dev; **Neon/Supabase** untuk produksi) | driver `postgres` **^4.1.1** | 2026-11-19 |
| ORM / akses data | **Drizzle ORM** + migrasi SQL | `drizzle-orm` **^0.45.4**, `drizzle-kit` **^0.31.11** | 2026-11-19 |
| Validasi masukan | **Zod** di setiap endpoint | `zod` **^4.6.7** | 2026-11-19 |
| Basis data lokal HP | **IndexedDB via Dexie** + Service Worker (khusus antrean penjualan F19) | `dexie` **^4.4.7** | 2026-11-20 |
| Styling | **Tailwind CSS** (mobile-first) | `tailwindcss` **4.3.3**, `@tailwindcss/turbopack` **4.3.3** | 2026-11-19 |
| Scan barcode | **BarcodeDetector API**, cadangan **@zxing/browser** | `@zxing/browser` **^0.2.1** | 2026-11-19 |
| Hash PIN & sesi | **bcryptjs** + cookie sesi httpOnly bertanda tangan | `bcryptjs` **^3.0.3** | 2026-11-19 |
| Ekspor laporan | **pdf-lib** (PDF), **exceljs** (Excel), Web Share API (WhatsApp) | `pdf-lib` **^1.17.1**, `exceljs` **^4.4.0** | 2026-11-20 |
| Uji otomatis | **Vitest** | `vitest` **^5.1.1** | 2026-11-19 |
| Hosting | **Vercel** (Hobby untuk demo; Pro untuk pemakaian nyata) | — | `[PERLU DIISI]` |

### Lampiran `package.json` (tempelan dari agen)

```json
"dependencies": {
  "@zxing/browser": "^0.2.1",
  "bcryptjs": "^3.0.3",
  "dexie": "^4.4.7",
  "drizzle-orm": "^0.45.4",
  "exceljs": "^4.4.0",
  "next": "16.4.6",
  "pdf-lib": "^1.17.1",
  "postgres": "^4.1.1",
  "react": "19.3.0",
  "react-dom": "19.3.0",
  "zod": "^4.6.7"
},
"devDependencies": {
  "@tailwindcss/turbopack": "4.3.3",
  "@types/node": "^22.20.5",
  "@types/react": "^19",
  "drizzle-kit": "^0.31.11",
  "eslint": "^9",
  "eslint-config-next": "16.4.6",
  "prettier": "^3.10.1",
  "tailwindcss": "4.3.3",
  "tsx": "^4.23.15",
  "typescript": "^5",
  "vitest": "^5.1.1"
}
```

> Catatan konsistensi: Tabel 4.7 / Gambar 4.3 proposal masih menulis **Flutter/SQLite/VPS**.
> Perubahan menuju **PWA/Next.js/PostgreSQL** dicatat pada Tabel 4.16 di atas. Dokumen lama
> tidak diubah; hanya dijembatani di sini.

---

## Tabel 4.17 — Fitur selesai per iterasi, tanggal demo, dan keputusan G2

Jumlah fitur & tanggal commit diambil dari `git log` branch `main`.

| Iterasi | Minggu coding | Commit (branch `main`) | Fitur selesai | Jml fitur | Tanggal demo | Keputusan G2 |
|---|---|---|---|---|---|---|
| Iterasi 1 (bagian A) | Minggu 1 | `f5cd676` | F01, F02, F05, F07, F08 | 5 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Iterasi 1 (bagian B) | Minggu 2 | `f2c5885` | F02 (scan), F03, F06 | 3 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Iterasi 2 | Minggu 3 | `c054793` | F09, F10, F11, F12, F13, F14, F18 | 7 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Iterasi 3 | Minggu 4 | `0a74f1d` | F15, F16, F17, F19, F20 | 5 | `[PERLU DIISI]` | `[PERLU DIISI]` |

Total fitur proposal yang selesai: **20 dari 20** (F01–F20). F21 tidak dikerjakan sesuai
Bagian 0 butir 3.

Bukti pengujian internal tiap iterasi disimpan di `docs/bukti/iterasi-N/`
(iterasi 1 sudah terisi: lihat [uji-blackbox.md](file:///d:/projekan/POS%20mismada%20farm/docs/bukti/iterasi-1/uji-blackbox.md)).

---

## Tabel 4.18 / 4.19 / 4.20 — Temuan demo per iterasi

Kolom: **Pemberi** (siapa yang menemukan), **Isi temuan**, **Prioritas (Tinggi/Rendah)**,
**Tindak lanjut**. Definisi prioritas mengikuti panduan: *Tinggi* = menghambat transaksi inti,
data salah/hilang, atau melanggar hak akses; *Rendah* = kenyamanan/tampilan.

### Tabel 4.18 — Temuan Demo 1 (Iterasi 1)

| No | Pemberi | Isi temuan | Prioritas | Tindak lanjut |
|---|---|---|---|---|
| 1 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| 2 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |

### Tabel 4.19 — Temuan Demo 2 (Iterasi 2)

| No | Pemberi | Isi temuan | Prioritas | Tindak lanjut |
|---|---|---|---|---|
| 1 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| 2 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |

### Tabel 4.20 — Temuan Demo 3 (Iterasi 3)

| No | Pemberi | Isi temuan | Prioritas | Tindak lanjut |
|---|---|---|---|---|
| 1 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| 2 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |

> Contoh pengisian yang sudah punya bukti di repositori (boleh dipakai/diperluas): temuan
> "kasir masih bisa menekan tombol ubah harga" → Prioritas **Tinggi** → tindak lanjut:
> menu disembunyikan di UI **dan** server menolak dengan HTTP 403 (bukti: U-08/U-13 pada
> [uji-blackbox.md](file:///d:/projekan/POS%20mismada%20farm/docs/bukti/iterasi-1/uji-blackbox.md)).

---

## Tabel 4.21 — Status fitur bersyarat (Minggu 4)

Urutan ini sekaligus urutan pemotongan bila waktu mepet (F16 → F15 → F17 → F19 → F20).
Semua berstatus **Selesai** pada commit `0a74f1d` dan lolos uji otomatis.

| Fitur | Nama | Status | Alasan |
|---|---|---|---|
| **F16** | Stok opname | **Selesai** | Selisih fisik vs sistem; stok baru berubah setelah disetujui Penerus Usaha, alasan wajib (BR-08). Logika murni + trigger DB. |
| **F15** | Retur | **Selesai** | Retur pelanggan memakai harga satuan transaksi asal; retur pemasok memakai harga beli penerimaan (BR-06). |
| **F17** | Titip jual (dasar) | **Selesai** | Stok titipan; kewajiban bayar naik saat laku, turun saat dibayar; tanpa komisi (BR-07). |
| **F19** | Antrean sinyal lemah | **Selesai** | Hanya penjualan; Dexie + Service Worker + UUID idempotensi. Lulus uji otomatis; uji mode pesawat di perangkat: `[PERLU DIISI]`. |
| **F20** | Daftar belanja | **Selesai** | Tampilan filter stok ≤ minimum, memakai view `v_stok_barang`. |

---

## Komponen kunci

Empat cuplikan kode diambil dari **logika bisnis murni** di `src/lib/domain/` dan
`src/lib/offline/` (tanpa akses DB langsung, sehingga mudah diuji).

### Cuplikan Kode 4.1 — Pencocokan barcode

Sumber: [barcode.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/domain/barcode.ts)

```ts
export function cocokkanBarcode(kodeMentah: string, daftar: BarangRingkas[]): HasilCocokBarcode {
  const kode = (kodeMentah ?? "").trim();
  if (kode === "") return { jenis: "kode_kosong" };

  const barang = daftar.find((b) => (b.kodeBarcode ?? "").trim() === kode);
  if (!barang) return { jenis: "tidak_ditemukan", kode };
  return { jenis: "ditemukan", barang };
}
```

### Cuplikan Kode 4.2 — Antrean offline (F19)

Sumber: [sinkron.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/offline/sinkron.ts)

```ts
export async function simpanKeAntrean(muatan: unknown): Promise<string> {
  const db = dbAntrean();
  const id = (muatan as { idTransaksi?: string }).idTransaksi ?? crypto.randomUUID();
  if (db) {
    await db.antrean.put({ id, muatan, dibuatPada: Date.now(), status: "belum_sinkron" });
  }
  beritahu();
  return id;
}

export async function kirimAntrean(): Promise<{ terkirim: number; sisa: number }> {
  const db = dbAntrean();
  if (!db) return { terkirim: 0, sisa: 0 };
  const semua = await db.antrean.toArray();
  const urut = ambilBelumSinkron(semua);
  let terkirim = 0;
  for (const item of urut) {
    try {
      const res = await fetch("/api/penjualan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.muatan),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db.antrean.delete(item.id);
      terkirim += 1;
    } catch (e) {
      const pesan = e instanceof Error ? e.message : "gagal";
      await db.antrean.update(item.id, { status: "belum_sinkron", galat: pesan });
      break; // berhenti pada kegagalan pertama agar urutan terjaga
    }
  }
  beritahu();
  return { terkirim, sisa: await hitungAntrean() };
}
```

### Cuplikan Kode 4.3 — Perhitungan kas harian (BR-09)

Sumber: [kas.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/domain/kas.ts)

```ts
export function hitungKasSeharusnya(k: KomponenKas): number {
  return (
    k.kasAwal + k.penjualanTunai + k.pelunasanPiutang - k.pengeluaranTunai - k.pembayaranPemasokTunai
  );
}

export function hitungSelisihKas(kasFisik: number, kasSeharusnya: number): number {
  return Math.round(kasFisik - kasSeharusnya);
}

export function bolehKunciRekap(selisih: number, keterangan?: string | null): boolean {
  return selisih === 0 || (keterangan ?? "").trim().length > 0;
}
```

### Cuplikan Kode 4.4 — Alokasi stok FEFO + total & kembalian

Sumber: [stok.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/domain/stok.ts)

```ts
export function urutkanFefo(batches: BatchStok[]): BatchStok[] {
  return [...batches].sort((a, b) => {
    if (a.tglKedaluwarsa === b.tglKedaluwarsa) return a.idBatch - b.idBatch;
    if (a.tglKedaluwarsa === null) return 1;
    if (b.tglKedaluwarsa === null) return -1;
    return a.tglKedaluwarsa < b.tglKedaluwarsa ? -1 : 1;
  });
}

export function alokasiFefo(batches: BatchStok[], jumlahDiminta: number): HasilAlokasi {
  const alokasi: AlokasiBatch[] = [];
  let sisa = jumlahDiminta;
  for (const batch of urutkanFefo(batches)) {
    if (sisa <= 0) break;
    if (batch.jumlahSisa <= 0) continue;
    const ambil = Math.min(batch.jumlahSisa, sisa);
    alokasi.push({ idBatch: batch.idBatch, jumlah: ambil });
    sisa -= ambil;
  }
  return { alokasi, kurang: sisa > 0 ? sisa : 0 };
}

export function hitungTotal(items: { hargaSatuan: number; jumlah: number }[]): number {
  return items.reduce((total, item) => total + Math.round(item.hargaSatuan * item.jumlah), 0);
}

export function hitungKembalian(total: number, dibayar: number): number {
  return Math.max(0, Math.round(dibayar) - Math.round(total));
}
```

### Cara aplikasi menangani barcode yang tidak ditemukan

Fungsi pencocokan mengembalikan tiga kemungkinan: `ditemukan`, `tidak_ditemukan`, atau
`kode_kosong`. **Kode tak dikenal tidak pernah menambah barang otomatis** — hanya
menampilkan pesan dan menawarkan alternatif:

```ts
export function pesanHasilBarcode(hasil: HasilCocokBarcode): string {
  switch (hasil.jenis) {
    case "ditemukan":
      return `Ditemukan: ${hasil.barang.namaBarang}`;
    case "tidak_ditemukan":
      return `Barcode ${hasil.kode} belum terdaftar. Cari manual atau pakai harga manual.`;
    case "kode_kosong":
      return "Barcode tidak terbaca. Coba dekatkan lagi ke kamera.";
  }
}
```

Perilaku di layar Jual: kasir diberi pilihan **cari manual** atau **pakai harga manual**
(harga manual hanya berlaku untuk transaksi itu dan **tidak** mengubah harga master, BR-02).
Bukti uji: U-03 pada [uji-blackbox.md](file:///d:/projekan/POS%20mismada%20farm/docs/bukti/iterasi-1/uji-blackbox.md).

### Konfirmasi server benar-benar menolak aksi di luar peran

Penegakan RBAC dilakukan di **dua lapisan**: menu disembunyikan di UI **dan** server
menolak permintaan. Helper `requireRole([...])` dipanggil di setiap Route Handler:

Sumber: [rbac.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/auth/rbac.ts)

```ts
export async function butuhSesi(): Promise<Sesi> {
  const sesi = await getSesi();
  if (!sesi) throw new GalatHttp(401, "belum_masuk", "Anda belum masuk. Silakan login dulu.");
  return sesi;
}

export async function requireRole(diizinkan: NamaPeran[]): Promise<Sesi> {
  const sesi = await butuhSesi();
  if (!diizinkan.includes(sesi.peran))
    throw new GalatHttp(403, "akses_ditolak", "Anda tidak punya hak akses untuk tindakan ini.");
  return sesi;
}
```

Bukti nyata (tidak hanya UI):

| Aksi yang dicoba kasir | Endpoint | Respons server | Bukti |
|---|---|---|---|
| Mengubah harga barang | `PATCH /api/barang/:id/harga` | **HTTP 403** `akses_ditolak` | U-08 |
| Membuat penerimaan barang | `POST /api/penerimaan` | **HTTP 403** `akses_ditolak` | U-13 |
| Menambah pemasok | `POST /api/pemasok` | **HTTP 403** `akses_ditolak` | U-13 |
| Tanpa sesi sama sekali | endpoint apa pun | **HTTP 401** `belum_masuk` | — |

---

## Tabel 4.22 — Skema basis data akhir

Sumber kebenaran skema: [mismada_farm_schema.sql](file:///d:/projekan/POS%20mismada%20farm/mismada_farm_schema.sql).
File ini yang dibandingkan dengan **19 kelompok entitas** pada ERD (Gambar 4.11–4.15).

**Ringkasan:** **23 tabel basis** + 1 view (`v_stok_barang`) + 3 trigger pengaman BR.

| No | Tabel | Kelompok | Sumber gambar ERD | Catatan |
|---|---|---|---|---|
| 1 | `peran` | Pengguna | Gbr 4.12 | RBAC (pemilik/kasir/penerus_usaha) |
| 2 | `pengguna` | Pengguna | Gbr 4.12 | `password_hash` bcrypt (NFR-03) |
| 3 | `lini_usaha` | Data master | Gbr 4.11 | seed 5 lini |
| 4 | `pemasok` | Data master | Gbr 4.14 | kolom `jenis` tidak dirinci di ERD |
| 5 | `pelanggan` | Data master | Gbr 4.13 | data pribadi, dibatasi (NFR-04) |
| 6 | `barang` | Data master & stok | Gbr 4.11 | barcode unik parsial, `tipe` barang/jasa |
| 7 | `riwayat_harga` | Data master & stok | Gbr 4.11 | append-only (BR-01) |
| 8 | `penerimaan_barang` | Penerimaan | Gbr 4.14 | tunai/kredit/titipan |
| 9 | `detail_penerimaan` | Penerimaan | Gbr 4.14 | harga beli + tgl kedaluwarsa |
| 10 | `stok_batch` | Data master & stok | Gbr 4.11 | dasar FEFO (BR-03) |
| 11 | `titip_jual` | Penerimaan/hutang | Gbr 4.14 | F17 (BR-07) |
| 12 | `hutang_pemasok` | Penerimaan/hutang | Gbr 4.14 | asal: penerimaan atau titip |
| 13 | `pembayaran_hutang` | Penerimaan/hutang | Gbr 4.14 | — |
| 14 | `transaksi_penjualan` | Penjualan | Gbr 4.12 | PK **UUID** (idempotensi F19) |
| 15 | `detail_penjualan` | Penjualan | Gbr 4.12 | simpan `harga_satuan` + `harga_beli_saat_itu` (BR-01/BR-10) |
| 16 | `piutang` | Piutang | Gbr 4.13 | kasbon (BR-05) |
| 17 | `pelunasan_piutang` | Piutang | Gbr 4.13 | cicilan/penuh |
| 18 | `stok_opname` | Opname/retur/rekap | Gbr 4.15 | F16 (BR-08) |
| 19 | `detail_opname` | Opname/retur/rekap | Gbr 4.15 | selisih wajib alasan (BR-08) |
| 20 | `retur` | Opname/retur/rekap | Gbr 4.15 | F15 (BR-06) |
| 21 | `rekap_harian` | Opname/retur/rekap | Gbr 4.15 | terkunci tidak bisa diubah (BR-09) |
| 22 | `pengeluaran` | Opname/retur/rekap | Gbr 4.15 | lini "umum" untuk biaya tak terpisah (BR-10) |
| 23 | `log_aktivitas` | Opname/retur/rekap | Gbr 4.15 | F08 (FR-17) |

**Deviasi terhadap ERD (kolom/tabel tambahan, sudah ditandai `[TAMBAHAN]` di file SQL):**

| Deviasi | Alasan (aturan bisnis) |
|---|---|
| Kolom `status_transaksi`, `alasan_batal`, `dibatalkan_oleh`, `dibatalkan_pada` pada `transaksi_penjualan` | BR-13/FR-17: transaksi tidak boleh dihapus, hanya dibatalkan |
| Kolom `kas_awal` pada `rekap_harian` | Rumus BR-09 memakai kas awal |
| Kolom `jenis` pada `pemasok`; `status` pada `titip_jual` | Nilai tidak dirinci di ERD, diisi bebas |
| Trigger `fn_tolak_hapus` (BR-13), `fn_riwayat_harga_append_only` (BR-01), `fn_rekap_terkunci` (BR-09) | Penegakan aturan bisnis di tingkat database |
| View `v_stok_barang` | Memudahkan notifikasi stok menipis & F20 |

> **Silakan bandingkan** tabel di atas dengan **19 kelompok entitas** pada ERD Bab III, lalu
> lengkapi kolom "Kelompok" bila penamaan kelompok di ERD berbeda. Jumlah tabel final
> (23 basis) dapat melebihi 19 karena ada penormalan (mis. `detail_penerimaan`,
> `detail_penjualan`, `detail_opname` dipisah dari entitas induknya).

---

## Gambar 4.22 — Log skenario kasbon (uji integrasi tiga fungsi)

Bahan mentah log tersimpan di [jual_kasbon.json](file:///d:/projekan/POS%20mismada%20farm/.uji/jual_kasbon.json):

```json
{
  "idTransaksi": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "metode": "kasbon",
  "idPelanggan": 1,
  "jatuhTempo": "2026-12-01",
  "items": [
    { "idBarang": 2, "namaItem": "Beras Medium 10 kg", "jumlah": 1, "hargaSatuan": 115000, "jalurInput": "scan" }
  ]
}
```

Alur verifikasi yang diamati (stok → notifikasi → piutang → kas → laba → pelunasan):

| Langkah | Yang diperiksa | Hasil | Bukti |
|---|---|---|---|
| 1 | Penjualan kasbon disimpan | tersimpan, `ulangan=false` | `POST /api/penjualan` |
| 2 | Stok berkurang (FEFO) | batch exp terdekat diambil lebih dulu | `stok_batch` |
| 3 | Piutang bertambah | `piutang.nilai_awal` = total, status `belum` | tabel `piutang` |
| 4 | Kas seharusnya **tidak** bertambah | kasbon belum menambah kas | `hitungKasSeharusnya` |
| 5 | Saat dibayar: piutang berkurang, kas bertambah | status → `sebagian`/`lunas` | `pelunasan_piutang` |
| 6 | Notifikasi stok minimum bila tercapai | kartu berwarna + label | `v_stok_barang.stok_menipis` |

Screenshot nyata untuk Gambar 4.22 tersimpan di: `docs/bukti/iterasi-3/` `[PERLU DIISI]`.

---

## Tabel 4.23 — Konfigurasi & serah terima

| Item | Nilai |
|---|---|
| Region Vercel | `[PERLU DIISI]` |
| Penyedia basis data (produksi) | Neon atau Supabase `[PERLU DIISI pilih salah satu]` |
| Nama variabel konfigurasi (**tanpa nilai**) | `DATABASE_URL`, `SESSION_SECRET` |
| Akun awal (**tanpa PIN**) | `pemilik` (Pemilik), `penerus` (Penerus Usaha), `kasir` (Kasir) |
| Jadwal cadangan (backup) basis data | `[PERLU DIISI]` |
| Nomor Lampiran | `[PERLU DIISI]` |

Catatan: PIN default ketiga akun uji = `123456` (dihasilkan oleh skrip seed, **di-hash**
sebelum disimpan). Nilai PIN **tidak** ditulis di README ini sesuai permintaan. Rincian
pemasangan lengkap ada di [konfigurasi.md](file:///d:/projekan/POS%20mismada%20farm/docs/konfigurasi.md).

---

## Tabel 4.24 — Deviasi layar terhadap mockup

Daftar layar nyata (16 halaman): Login, Dasbor, Jual, Kasbon, Barang, Penerimaan, Opname,
Retur, Titip Jual, Belanja, Keuangan, Rekap, Notifikasi, Laporan, Log Aktivitas, Pilih Akun.

| Layar | Rencana pada mockup | Deviasi implementasi | Alasan deviasi | Masukan Bu Santi (sesi coba mockup minggu ke-8) |
|---|---|---|---|---|
| Login | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Dasbor | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Jual | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Kasbon | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Barang | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Penerimaan | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Opname | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Retur | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Titip Jual | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Belanja | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Keuangan | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Rekap | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Notifikasi | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Laporan | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Log Aktivitas | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Pilih Akun | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |

> Deviasi implementasi yang sudah diketahui dari repositori: navigasi utama diubah dari
> **bar atas menjadi sidebar kiri** (gaya dasbor) dan antarmuka **dikunci mode terang**
> (`color-scheme: light`) agar kontras teks aman dari preferensi dark mode sistem.

---

## Tabel 4.25 — Pengamatan aplikasi pembanding

Aspek pembanding: kepraktisan transaksi, mode luring (offline), pencatatan kasbon, ekspor
laporan, harga, dan kemudahan pemasangan.

| Aspek | Aplikasi A | Aplikasi B | Aplikasi C |
|---|---|---|---|
| Nama aplikasi | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Versi yang dicoba | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Tanggal mencoba | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Biaya paket | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Transaksi 3 jalur | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Mode luring | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Kasbon | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Ekspor PDF/Excel | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |

---

# IV.4 PENGUJIAN

## Tabel 4.26 — Lingkungan pengujian

| Item | Nilai |
|---|---|
| Merek & tipe HP | `[PERLU DIISI]` |
| Versi Android | `[PERLU DIISI]` |
| Versi Chrome | `[PERLU DIISI]` |
| Spesifikasi kamera | `[PERLU DIISI]` |
| Jumlah HP diuji | `[PERLU DIISI]` |
| Versi build yang diuji | commit `0a74f1d` (`CAPST-42`) |
| Server uji | PostgreSQL 18 lokal (`mismada_farm`), `npm run dev` (diperluas ke URL Vercel saat demo: `[PERLU DIISI]`) |
| Jumlah item data master | **121 barang** (dari `data/barang.csv`), 5 lini usaha |
| Nama penguji | `[PERLU DIISI]` |
| Tanggal | `[PERLU DIISI]` |

Perkakas uji: `curl.exe` (uji HTTP), `psql.exe` (verifikasi DB), `npm test` (Vitest).

---

## Tabel 4.27 — Hasil skenario uji TC-01 s.d. TC-29

Kolom: **ID**, **FR/BR**, **Langkah**, **Hasil diharapkan**, **Hasil aktual**, **Status
(Lulus/Gagal)**. Tabel ini paling nyaman diisi di **Excel/CSV** (lihat lampiran).

> Status sampai saat ini: **65 tes otomatis lulus**; uji black-box iterasi 1 (U-01–U-14)
> sudah **semua Lulus** (lihat [uji-blackbox.md](file:///d:/projekan/POS%20mismada%20farm/docs/bukti/iterasi-1/uji-blackbox.md)).

| ID | FR/BR | Hasil aktual | Status |
|---|---|---|---|
| TC-01 | FR-01 | Lihat U-01 (login 3 peran) | Lulus |
| TC-02 | FR-02 | Lihat U-02 (barcode terdaftar) | Lulus |
| TC-03 | FR-02 | Lihat U-03 (barcode tak terdaftar) | Lulus |
| TC-04 | FR-03 | Lihat U-04 (penjualan tunai) | Lulus |
| TC-05 | FR-03 | Lihat U-05 (stok berkurang) | Lulus |
| TC-06 | BR-03 | Lihat U-06 (FEFO) | Lulus |
| TC-07 | BR-02 | Lihat U-07 (harga manual) | Lulus |
| TC-08 | FR-04 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-09 | FR-05 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-10 | FR-06 | Lihat U-11 (penerimaan kredit) | Lulus |
| TC-11 | FR-07 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-12 | FR-08 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| **TC-13** | FR-07 | **Nilai piutang** setelah skenario kasbon = `[PERLU DIISI]` | `[PERLU DIISI]` |
| **TC-14** | BR-04 | **Stok minimum N** pada data uji = `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-15 | FR-09 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-16 | FR-10 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-17 | FR-11 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-18 | FR-12 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-19 | FR-13 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-20 | FR-14 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-21 | FR-15 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-22 | FR-16 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-23 | FR-17 | Lihat U-14 (log aktivitas) | Lulus |
| TC-24 | FR-18 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| **TC-25** | BR-13 | Lihat bagian **TC-25** di bawah | `[PERLU DIISI]` |
| TC-26 | FR-19 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| TC-27 | NFR-01 | `[PERLU DIISI]` (SUS ≥ 68) | `[PERLU DIISI]` |
| TC-28 | NFR-03 | Kasir akses endpoint terlarang → 403 (U-08/U-13) | Lulus |
| TC-29 | NFR-08 | `[PERLU DIISI]` (batas waktu perlu disepakati) | `[PERLU DIISI]` |

**Dua nilai yang wajib diisi khusus:** nilai **piutang pada TC-13** dan **stok minimum N
pada TC-14**.

---

## Tabel 4.29 — Kesesuaian fitur (Sesuai/Tidak)

| No | Fitur | Sesuai kebutuhan? | Catatan |
|---|---|---|---|
| 1 | F01 Login + RBAC | `[PERLU DIISI]` | server menolak 403 terbukti |
| 2 | F02 Data master + scan | `[PERLU DIISI]` | 121 barang termuat |
| 3 | F03 Penjualan 3 jalur | `[PERLU DIISI]` | — |
| 4 | F04 Transaksi → stok | `[PERLU DIISI]` | — |
| 5 | F05 Harga + riwayat | `[PERLU DIISI]` | append-only |
| 6 | F06 Penerimaan barang | `[PERLU DIISI]` | — |
| 7 | F07 Label lini usaha | `[PERLU DIISI]` | — |
| 8 | F08 Log aktivitas | `[PERLU DIISI]` | — |
| 9 | F09 Kasbon/piutang | `[PERLU DIISI]` | — |
| 10 | F10 Notifikasi | `[PERLU DIISI]` | — |
| 11 | F11 Rekap harian | `[PERLU DIISI]` | selisih wajib keterangan |
| 12 | F12 Laba-rugi | `[PERLU DIISI]` | — |
| 13 | F13 Ekspor PDF/Excel | `[PERLU DIISI]` | — |
| 14 | F14 Pengeluaran per lini | `[PERLU DIISI]` | — |
| 15 | F15 Retur | `[PERLU DIISI]` | — |
| 16 | F16 Stok opname | `[PERLU DIISI]` | — |
| 17 | F17 Titip jual | `[PERLU DIISI]` | — |
| 18 | F18 Hutang pemasok | `[PERLU DIISI]` | — |
| 19 | F19 Antrean offline | `[PERLU DIISI]` | — |
| 20 | F20 Daftar belanja | `[PERLU DIISI]` | — |

---

## Tabel 4.30 — Sinkronisasi transaksi (uji mode pesawat, F19)

| Langkah | Transaksi dicatat | Tersinkron | Hilang | Ganda |
|---|---|---|---|---|
| 1. Aktifkan mode pesawat | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` | 0 |
| 2. Catat 5 penjualan (luring) | 5 | 0 | 0 | 0 |
| 3. Matikan mode pesawat | 5 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| 4. Verifikasi stok | — | — | — | — |
| **Total** | `[PERLU DIISI]` | `[PERLU DIISI]` | **harus 0** | **harus 0** |

> Kriteria lulus: 5 transaksi masuk **tepat satu kali** (idempotensi UUID) dan stok sesuai.
> Uji idempotensi sudah lulus di tingkat otomatis (U-09: kirim ulang UUID sama →
> `ulangan=true`, `detail_penjualan` tidak bertambah).

---

## Tabel 4.31 — Verifikasi hitungan Rupiah (manual vs sistem)

Rumus dari `src/lib/domain` ([kas.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/domain/kas.ts),
[laporan.ts](file:///d:/projekan/POS%20mismada%20farm/src/lib/domain/laporan.ts)):

- Kas seharusnya = kas awal + penjualan tunai + pelunasan piutang − pengeluaran tunai − pembayaran pemasok tunai
- Laba kotor = Σ (harga satuan − harga beli saat transaksi) × jumlah
- Laba-rugi per lini = laba kotor lini − pengeluaran lini

| Besaran | Data uji | Hitungan manual (Rp) | Hasil sistem (Rp) | Selisih | Status |
|---|---|---|---|---|---|
| Kas seharusnya | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |
| Laba kotor | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |
| Laba-rugi Lini Kelontong | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |
| Laba-rugi Lini Pupuk Subsidi | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |
| Laba-rugi Lini Kerupuk Kulit | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |
| Laba-rugi Lini Sewa Traktor | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |
| Laba-rugi Lini Pasca Panen | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | 0 | `[PERLU DIISI]` |

Contoh baris uji (dapat dipakai): *Beras Medium 10 kg* — harga jual `115.000`, harga beli
`60.000`, jumlah `1` → laba kotor = `(115.000 − 60.000) × 1 = 55.000`.

---

## Tabel 4.32 — Uji pindai barcode (berbagai kondisi)

Tiap sel "Hasil" ditulis "**x dari 10**" percobaan berhasil.

| No | Jenis barang | Kondisi cahaya | Hasil |
|---|---|---|---|
| 1 | Beras Medium 10 kg | Terang | `[PERLU DIISI]` dari 10 |
| 2 | Beras Medium 10 kg | Redup | `[PERLU DIISI]` dari 10 |
| 3 | Minyak Goreng | Terang | `[PERLU DIISI]` dari 10 |
| 4 | Minyak Goreng | Redup | `[PERLU DIISI]` dari 10 |
| 5 | Gula Pasir | Terang | `[PERLU DIISI]` dari 10 |
| 6 | Kemasan keriting/reflektif | Terang | `[PERLU DIISI]` dari 10 |
| 7 | Barcode rusak/sebagian | Terang | `[PERLU DIISI]` dari 10 |

---

## TC-25 — Uji tombol hapus dan pembatalan transaksi

Tujuan: memastikan **transaksi tidak bisa dihapus** (BR-13/FR-17) dan hanya bisa
**dibatalkan** oleh peran Penerus Usaha dengan alasan, serta tercatat di log.

| Skenario | Langkah | Hasil diharapkan | Hasil aktual | Status |
|---|---|---|---|---|
| Hapus langsung di DB | `DELETE FROM transaksi_penjualan WHERE ...` | Ditolak trigger `fn_tolak_hapus` (BR-13) | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Hapus lewat UI | Menekan tombol hapus pada transaksi | Tidak ada tombol hapus (hanya **Batalkan**) | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Batal tanpa alasan | POST batal tanpa `alasan` | Ditolak (alasan wajib) | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Batal oleh kasir | Kasir memanggil endpoint batal | Ditolak HTTP 403 | `[PERLU DIISI]` | `[PERLU DIISI]` |
| Batal oleh penerus + alasan | Penerus Usaha membatalkan dengan alasan | `status_transaksi='dibatalkan'`, tercatat di `log_aktivitas` | `[PERLU DIISI]` | `[PERLU DIISI]` |

---

## Tabel 4.34 — Daftar bug, keparahan, perbaikan, dan uji ulang

| No | Bug | Fitur | Keparahan | Penyebab | Status perbaikan | Hasil uji ulang |
|---|---|---|---|---|---|---|
| 1 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| 2 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |
| 3 | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` | `[PERLU DIISI]` |

> Bug teknis yang sudah tercatat selama pengembangan (bahan awal Tabel 4.34):
> - **TypeScript `'pengguna' is possibly 'null'` (TS18047)** pada layout sidebar → perbaikan: simpan `penggunaAktif` setelah guard.
> - **ESLint `react-hooks/set-state-in-effect`** → perbaikan: hapus `useEffect` penutup drawer, tutup lewat `onClick`.
> - **Build gagal `export const runtime = "nodejs"`** pada konfigurasi `cacheComponents` → perbaikan: hindari `runtime` di Route Handler API.
> - **Error WebSocket HMR via IP LAN** (`net::ERR_INVALID_HTTP_RESPONSE`) → perbaikan: `allowedDevOrigins` di `next.config.ts`.

---

## Pembahasan — fitur paling banyak bermasalah dan penyebabnya

`[PERLU DIISI setelah pengujian selesai]`

Kerangka yang disarankan (berdasarkan sifat risiko tiap fitur):

1. **F19 Antrean offline** — paling berisiko karena bergantung pada Service Worker, Dexie,
   dan idempotensi UUID. Gejala umum: transaksi ganda atau hilang bila pengiriman antrean
   tidak berurutan. Mitigasi: berhenti pada kegagalan pertama + kunci UUID.
2. **F11 Rekap harian** — rawan selisih kas bila rumus tidak sinkron dengan data transaksi.
   Mitigasi: fungsi murni `hitungKasSeharusnya` + wajib keterangan sebelum rekap dikunci.
3. **F02 Scan barcode** — bergantung kamera & kondisi cahaya; `BarcodeDetector` tidak
   didukung semua peramban. Mitigasi: cadangan `@zxing/browser` + input manual.
4. **RBAC (F01)** — bila penegakan hanya di UI, kasir bisa menembus endpoint. Mitigasi:
   `requireRole([...])` di server → 403 (sudah terbukti pada U-08/U-13).

---

## Cara menjalankan & menguji (ringkas)

```bash
npm install
cp .env.example .env.local        # isi DATABASE_URL & SESSION_SECRET
psql -U postgres -d mismada_farm -f mismada_farm_schema.sql
npm run seed                      # 5 lini, 3 peran, 3 akun uji, 121 barang
npm run dev                       # http://localhost:3000
npm test                          # 65 tes Vitest
npm run build                     # build produksi (42 rute)
```

Ringkasan FR/BR yang dipenuhi, hal yang belum selesai, dan asumsi mengikuti Bagian 0
butir 5 dari [PANDUAN_CODING_AGENT_Mismada_Farm.md](file:///d:/projekan/POS%20mismada%20farm/PANDUAN_CODING_AGENT_Mismada_Farm.md).
