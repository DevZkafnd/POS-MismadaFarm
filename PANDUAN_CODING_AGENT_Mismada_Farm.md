# PANDUAN CODING AGEN: Prototipe POS Mismada Farm

Dokumen ini adalah arahan kerja untuk agen coding. Sumbernya proposal Capstone (Bab I-IV), draf IV.3/IV.4, dan Jira backlog (CAPST-19 s.d. CAPST-51).
Setiap tugas menyebut kode proposal (F = fitur, FR = kebutuhan fungsional, BR = aturan bisnis, UC = use case) dan kode tiket Jira.

---

## 0. ATURAN UMUM UNTUK AGEN (baca dulu, berlaku sepanjang proyek)

1. **Satu tiket = satu branch = satu PR kecil.** Nama branch: `capst-36-transaksi-stok`. Jangan menggabungkan beberapa tiket dalam satu perubahan.
2. **Jangan mengarang kebutuhan.** Semua perilaku sistem harus bisa ditelusuri ke FR/BR/UC. Jika ada hal yang tidak tercantum, **tanya dulu**, jangan menebak.
3. **Jangan membuat fitur di luar daftar F01-F20.** F21 (rekomendasi belanja berbasis tren) **tidak dikerjakan**. Pengelolaan kuota pupuk subsidi, penjadwalan traktor, dan alur pasca panen juga di luar ruang lingkup (BR-11, BR-12).
4. **Biaya harus tetap terprediksi (NFR-06).** Tidak boleh memakai layanan berbayar berbasis pemakaian (API LLM, WhatsApp Business API, dsb.).
5. **Setiap selesai tiket, agen wajib menyerahkan:**
   - ringkasan perubahan (file apa yang dibuat/diubah),
   - cara menjalankan dan mengujinya,
   - daftar FR/BR yang dipenuhi,
   - hal yang belum selesai atau diasumsikan.
6. **Simpan bukti untuk laporan.** Tiap fitur selesai: ambil screenshot layar nyata (untuk Gambar 4.19-4.21) dan catat temuan bug (untuk Tabel 4.18-4.20). Simpan di folder `docs/bukti/iterasi-N/`.
7. **Bahasa antarmuka: Bahasa Indonesia sederhana.** Tombol besar, langkah sedikit, kasir berliterasi digital terbatas (NFR-01).
8. **Uang selalu disimpan sebagai bilangan bulat rupiah** (integer), bukan float.
9. **Transaksi tidak boleh dihapus** (BR-13/FR-17). Hanya bisa dibatalkan oleh peran Penerus Usaha dengan alasan, dan tercatat di log aktivitas.

---

## 1. KEPUTUSAN TEKNOLOGI FINAL

Mengikuti draf Tabel 4.16 pada IV.3. Item bertanda (*) adalah **usulan tambahan** yang belum ada di proposal. Tim perlu menyetujuinya dan memasukkannya ke Tabel 4.16.

| Komponen | Keputusan |
|---|---|
| Aplikasi | PWA dengan **Next.js (App Router) + TypeScript** |
| Server | **Route Handler Next.js** sebagai REST API (serverless Vercel) |
| Basis data server | **PostgreSQL terkelola** (Neon atau Supabase) |
| Akses basis data | (*) **Drizzle ORM** + migrasi SQL |
| Validasi | (*) **Zod** di setiap endpoint |
| Basis data lokal HP | **IndexedDB via Dexie** + Service Worker (khusus antrean penjualan, F19) |
| Hosting | **Vercel** (Hobby saat pengembangan/demo; Pro untuk pemakaian nyata di warung) |
| Scan barcode | **BarcodeDetector API**, cadangan **@zxing/browser** |
| Ekspor | **pdf-lib atau react-pdf** (PDF), **exceljs** (Excel), **Web Share API** (WhatsApp) |
| Login | (*) pilih akun + PIN; PIN di-hash (argon2 atau bcrypt); sesi lewat cookie httpOnly bertanda tangan |
| Styling | (*) **Tailwind CSS**, mobile-first, target tap minimal 44px |

**Catatan konsistensi dokumen.** Tabel 4.7 dan Gambar 4.3 di proposal masih menulis Flutter/SQLite/VPS. Jangan diubah sekarang. Perubahan menuju PWA dicatat di Tabel 4.16 (IV.3a) dengan kolom "alasan perubahan".

---

## 2. STRUKTUR REPOSITORI

```
mismada-pos/
├─ src/
│  ├─ app/                      # halaman (Login, Jual, Stok, Kasbon, Laporan, dst.)
│  │  └─ api/                   # Route Handler (REST)
│  ├─ components/
│  ├─ lib/
│  │  ├─ db/                    # skema Drizzle, koneksi, seed
│  │  ├─ auth/                  # sesi, hash PIN, middleware RBAC
│  │  ├─ domain/                # logika bisnis murni (stok batch, kas, laba)
│  │  ├─ offline/               # Dexie + sinkronisasi (iterasi 3)
│  │  └─ export/                # PDF, Excel
│  └─ tests/                    # unit test logika domain + skenario black-box
├─ drizzle/                     # migrasi
├─ docs/
│  ├─ bukti/iterasi-1|2|3/      # screenshot + catatan temuan
│  └─ konfigurasi.md            # dokumentasi konfigurasi (NFR-07, Tabel 4.23)
└─ AGENTS.md                    # salinan Bagian 0 dokumen ini
```

**Letakkan logika bisnis di `lib/domain/` sebagai fungsi murni** (tanpa akses DB langsung). Ini memudahkan pengujian BR-03, BR-09, dan BR-10, dan menjadi sumber cuplikan kode 4.1-4.4 untuk laporan.

---

## 3. URUTAN PEMINDAHAN TIKET JIRA

Posisi tiket per screenshot: **8 tiket berstatus "revisi"** (CAPST-19, 20, 26, 27, 28, 29, 31, 32), **2 berstatus Testing/Validasi** (CAPST-30, 33), dan sisanya Backlog.

### Pindahkan LEBIH DULU ke "In Progress" (sebelum baris kode pertama)

| Urutan | Tiket | Alasan |
|---|---|---|
| 1 | **CAPST-32** Finalisasi ERD + skema database lengkap | **Blocker utama.** Tabel basis data tidak bisa dibuat sebelum ERD final. Selesaikan versi cukup baik, jangan menunggu sempurna. |
| 2 | **CAPST-28** Rancang alur integrasi transaksi → stok → laporan | Menentukan urutan efek antar fungsi (Gambar 4.22) dan dipakai langsung oleh logika penjualan. |
| 3 | **CAPST-29** Desain modul hutang/piutang (kasbon pupuk & karyawan) | Dipakai di Minggu 3, tetapi skema tabelnya harus ikut masuk migrasi pertama. |
| 4 | **CAPST-31** Desain UI alur transaksi sederhana | Dipakai langsung di layar Jual (Minggu 1-2). |
| 5 | **CAPST-26, CAPST-27** ERD awal, Use case & activity diagram | Cukup dirapikan dan ditutup bila sudah sejalan dengan CAPST-32. Tidak menghambat coding. |

### Berjalan paralel (dokumen, tidak menghambat coding)
CAPST-19 (Bab III), CAPST-20 (gabung draf Bab I-III), CAPST-21 (finalisasi format), CAPST-30 (upload progress perancangan), CAPST-33 (sesi demo/desain ke pengelola dan karyawan).

### Tiket pembangunan, urutan eksekusi

`CAPST-43` → `CAPST-35` → `CAPST-36` → `CAPST-38` → `CAPST-39` → `CAPST-37` → `CAPST-42` → `CAPST-44` → `CAPST-45` → `CAPST-46`

Alasan penyesuaian: **CAPST-43 (migrasi 100+ data master) sebaiknya ditarik ke Minggu 1**. Di Jira posisinya terlambat (setelah integrasi), padahal F02 berada di iterasi 1 dan scan barcode serta penjualan tidak bisa diuji tanpa data barang.

---

## 4. TIKET YANG BELUM ADA DI JIRA (usulan, perlu ditambahkan)

Backlog saat ini belum mencakup beberapa fitur yang wajib ada di proposal. Tambahkan tiket baru (nomor lanjut dari CAPST-52):

| Usulan tiket | Fitur proposal | Masuk minggu |
|---|---|---|
| Setup proyek, repo, CI, deploy Vercel, koneksi DB | (infrastruktur) | 1 |
| Login akun + PIN + RBAC (pemilik, kasir, penerus usaha) | F01 / FR-01 / UC01 | 1 |
| Harga tunggal + riwayat harga | F05 / FR-04 / BR-01 | 1 |
| Penerimaan barang (tunai, kredit, titipan) + batch kedaluwarsa | F06 / FR-06 | 2 |
| Label lini usaha pada transaksi | F07 | 1 |
| Log aktivitas (pencatatan) | F08 / FR-17 | 1-2 |
| Notifikasi stok menipis & hampir kedaluwarsa | F10 / FR-08 / BR-04 | 3 |
| Rekap harian + pembanding kas | F11 / FR-13 / BR-09 | 3 |
| Pencatatan pengeluaran per lini | F14 / FR-12 | 3 |
| Ekspor PDF/Excel + bagikan WhatsApp | F13 / FR-15 | 3 |
| Stok opname + persetujuan | F16 / FR-11 / BR-08 | 4 |
| Retur dengan penelusuran harga | F15 / FR-09 / BR-06 | 4 |
| Titip jual (dasar) | F17 / FR-10 / BR-07 | 4 |
| Antrean sinyal lemah + sinkronisasi | F19 / FR-18 | 4 |
| Daftar belanja stok minimum (bila waktu tersisa) | F20 / FR-19 | 4 |
| Dokumentasi konfigurasi & integrasi | NFR-07 / Tabel 4.23 | 3-4 |

Tiket **CAPST-37** (hutang/piutang & laba-rugi) sebaiknya **dipecah tiga**: piutang/kasbon (F09), hutang pemasok (F18), laba-rugi + dasbor (F12).

---

## 5. RENCANA MINGGU DEMI MINGGU

Kalender proposal: coding berjalan pada **Minggu ke-9 s.d. ke-12**, pengujian Minggu ke-13, cadangan Minggu ke-14.
Di dokumen ini disebut **Minggu Coding 1 = Minggu ke-9** dan seterusnya. **Jika kalender nyata kamu sudah bergeser, tetap pertahankan urutan, lalu geser tanggalnya.**

---

### MINGGU CODING 0 (maksimal 2 hari): Persiapan, belum coding fitur

**Tujuan:** pondasi siap, tidak ada yang menunggu.

**Tugas manusia (bukan agen):**
- Pastikan ERD final (CAPST-32). Pindahkan CAPST-32 ke In Progress, lalu selesaikan.
- Putuskan 3 hal dan catat tanggalnya untuk Tabel 4.16: framework (PWA Next.js), penyedia DB (Neon/Supabase), ORM.
- Buat akun Vercel dan penyedia DB. **Hobby cukup untuk demo; Pro hanya untuk pemakaian nyata di warung.**
- Siapkan file data master barang dari catatan manual/kemasan untuk CAPST-43.

**Tugas agen:**
1. Inisialisasi proyek Next.js + TypeScript + Tailwind, ESLint, Prettier.
2. Pasang Drizzle, Zod, Dexie (belum dipakai), Vitest untuk tes.
3. Buat `AGENTS.md` dari Bagian 0.
4. Hubungkan repo ke Vercel (deploy otomatis dari branch `main`), tambahkan variabel lingkungan `DATABASE_URL`, `SESSION_SECRET`.
5. Endpoint `GET /api/health` yang mengecek koneksi DB.

**Selesai bila:** URL Vercel terbuka di HP Android dan `/api/health` mengembalikan OK.

---

### MINGGU CODING 1 (Minggu ke-9): Iterasi 1 bagian A, fondasi data dan akses

**Tiket Jira:** CAPST-32 (final), CAPST-43, tiket baru (setup, login, harga, lini usaha).
**Fitur:** F01, F02 (data master), F05, F07, F08 (pencatatan).

**Hari 1-2: Skema basis data**
Buat migrasi Drizzle mengikuti ERD final (Gambar 4.11-4.15). Kelompok tabel menurut Tabel 4.22:
- Master/stok: `lini_usaha`, `barang`, `riwayat_harga`, `stok_batch`
- Pengguna: `pengguna`, `peran`
- Penjualan: `transaksi_penjualan`, `detail_penjualan`
- Piutang: `piutang`, `pelunasan_piutang`
- Penerimaan/hutang: `penerimaan_barang`, `detail_penerimaan`, `hutang_pemasok`, `pembayaran_hutang`, `titip_jual`
- Opname/retur/rekap: `stok_opname`, `detail_opname`, `retur`, `rekap_harian`, `pengeluaran`, `log_aktivitas`

**Boleh dimigrasikan sekaligus** agar tidak ada perubahan skema di tengah iterasi. Logika fiturnya tetap dibangun bertahap.

Aturan skema yang wajib:
- `detail_penjualan` menyimpan `harga_satuan` **dan** `harga_beli` saat transaksi (BR-01, BR-10).
- `transaksi_penjualan.id` bertipe **UUID yang dibuat di klien** (dibutuhkan antrean offline F19).
- Transaksi memiliki kolom `status` (aktif/dibatalkan), `alasan_batal`, **tanpa fitur DELETE** (BR-13).
- `barang`: barcode (unik, nullable), nama, `lini_usaha_id`, tipe (barang/jasa), satuan, harga aktif, stok minimum, penanda cepat rusak.

**Hari 2-3: Seed dan data master (CAPST-43)**
- Skrip impor CSV → `barang` + `stok_batch` awal + `riwayat_harga` awal.
- Validasi: barcode duplikat, harga kosong, satuan tidak dikenal. Hasilkan laporan baris yang gagal.
- 5 lini usaha: kelontong, pupuk subsidi, kerupuk kulit (dorokdok), sewa traktor, pasca panen.
- Item bertipe jasa **tidak mengurangi stok** (BR-11).

**Hari 3-4: Login dan RBAC (F01, FR-01, UC01)**
- Layar Login: pilih akun lalu masukkan PIN. PIN di-hash.
- Tiga peran: pemilik, kasir, penerus usaha. Terapkan **matriks Tabel 4.10**.
- **Penegakan di dua lapisan:** menu disembunyikan di UI **dan** server menolak (HTTP 403) permintaan di luar hak akses. Buat helper `requireRole([...])` di setiap Route Handler.
- Seed 3 akun uji (satu per peran).

**Hari 4-5: Harga dan log aktivitas**
- Ubah harga hanya untuk peran penerus usaha (Tabel 4.10), dengan menambah baris `riwayat_harga` dan **tanpa menimpa** data lama (BR-01).
- Helper `logAktivitas(userId, aksi, objek, detail)` dipanggil dari semua endpoint yang mengubah data.

**Selesai bila:**
- [ ] 100+ barang termuat dan bisa dicari.
- [ ] Kasir **tidak bisa** mengubah harga (UI dan API menolak).
- [ ] Ubah harga menambah riwayat, bukan menimpa.
- [ ] Setiap perubahan data muncul di `log_aktivitas`.

---

### MINGGU CODING 2 (Minggu ke-10): Iterasi 1 bagian B, penjualan dan stok, lalu DEMO 1

**Tiket Jira:** CAPST-31 (UI), CAPST-35, CAPST-36, CAPST-38, CAPST-39.
**Fitur:** F02 (scan), F03, F04, F06, F07, F08 (pencatatan). **FR:** FR-02, FR-03, FR-05, FR-06.

**Hari 1-2: Scan barcode (CAPST-35)**
- Komponen kamera memakai `BarcodeDetector`, **cadangan `@zxing/browser`** bila API tidak didukung.
- Barcode dicocokkan dengan kolom barcode di `barang`.
- **Barcode tidak ditemukan:** tampilkan pesan jelas dan tawarkan "cari manual / pakai harga manual". Jangan crash dan jangan menambah barang otomatis.
- Siapkan fungsi pencocokan sebagai kode terpisah (menjadi **Cuplikan Kode 4.1**).

**Hari 2-4: Penjualan tiga jalur (CAPST-36, F03)**
- Layar Jual dengan tiga jalur input: **Pindai Barcode, Favorit, Harga Manual**, ditambah keranjang, total, dan tombol **Bayar Tunai**.
- Harga manual **hanya berlaku pada transaksi itu** dan tidak mengubah harga master (BR-02). Keypad angka besar.
- Transaksi tunai menghitung total dan kembalian.
- Setiap transaksi diberi label lini usaha (F07).
- **Stok kurang saat jual → peringatan, bukan blokir** (Tabel 4.14). Kasir bisa lanjut setelah konfirmasi.
- Endpoint `POST /api/penjualan` dalam **satu transaksi basis data**: simpan transaksi, simpan detail, kurangi stok. Semua berhasil atau semua dibatalkan.
- **Pengurangan stok per batch (BR-03):** barang cepat rusak diambil dari batch dengan kedaluwarsa terdekat dulu (FEFO). Letakkan di `lib/domain/stok.ts` sebagai fungsi murni (**Cuplikan Kode 4.4**).
- Idempotensi: jika UUID transaksi sudah ada, kembalikan hasil lama dan **jangan simpan dua kali**.

**Hari 4: Penerimaan barang (F06, FR-06)**
- Form penerimaan: tunai, kredit, atau titipan, dengan harga beli dan tanggal kedaluwarsa.
- Menambah `stok_batch`. Penerimaan kredit membuat entri `hutang_pemasok` (tampilannya baru di Minggu 3).

**Hari 5: Uji internal dan demo**
- **CAPST-38 Testing fungsional awal:** buat tabel skenario uji black-box (ID, FR, langkah, hasil diharapkan, hasil aktual, lulus/gagal). Skenario minimal: login per peran, scan sukses, scan gagal, penjualan tunai, stok berkurang, FEFO, harga manual tidak mengubah master, kasir ditolak ubah harga.
- Demo ke pengelola dan karyawan (lihat CAPST-33), catat temuan dengan prioritas **Tinggi/Rendah**:
  - **Tinggi:** menghambat transaksi inti, data salah/hilang, atau melanggar hak akses.
  - **Rendah:** kenyamanan atau tampilan.
- **Screenshot nyata untuk Gambar 4.19** (login, Jual, Favorit, Penerimaan Barang).

**Keluaran iterasi 1 (pindahkan CAPST-39 ke Selesai bila ini terpenuhi):**
- [ ] Prototipe berjalan di URL Vercel dan bisa dipasang ke layar utama HP.
- [ ] Hasil uji internal + lembar umpan balik demo (isi Tabel 4.18).
- [ ] Upload prototipe + bukti bimbingan (CAPST-39).
- [ ] Keputusan G2 iterasi 1: diterima atau diperbaiki.

---

### MINGGU CODING 3 (Minggu ke-11): Iterasi 2, kasbon, laporan, notifikasi, lalu DEMO 2

**Minggu ini hanya satu minggu, jadi paling padat.** Skema DB sudah ada sejak Minggu 1, sehingga fokusnya murni membangun fitur. Jangan ubah ERD kecuali terpaksa. Jika terpaksa, **catat di Tabel 4.22**.

**Tiket Jira:** CAPST-37 (dipecah), CAPST-29 (desain jadi acuan), tiket baru notifikasi/rekap/pengeluaran/ekspor.
**Fitur:** F09, F10, F11, F12, F13, F14, F18, F08 (tampilan). **FR:** FR-07, FR-08, FR-12 s.d. FR-17.

Urutan kerja (**ikuti urutan ini supaya jika waktu mepet, yang dikorbankan adalah yang paling belakang**):

1. **Kasbon dan pelunasan (F09, BR-05).**
   - Bayar Kasbon wajib mengisi pelanggan dan tanggal jatuh tempo.
   - Saldo piutang berkurang oleh pelunasan penuh atau cicilan. Status: belum → sebagian → lunas.
   - Tombol **Catat Bayar** di tab Kasbon, dengan total kasbon belum lunas di bagian atas.
   - **Kasbon tidak menambah kas seharusnya** sampai ada pelunasan.
2. **Pengeluaran per lini (F14).** Pengeluaran yang tidak bisa dipisah dicatat di lini "umum" dan hanya tampil di laporan konsolidasi (BR-10).
3. **Rekap harian (F11, BR-09).**
   - Kas seharusnya = kas awal + penjualan tunai + pelunasan piutang − pengeluaran tunai − pembayaran tunai ke pemasok.
   - Kasir mengisi uang fisik. **Selisih wajib diberi keterangan** sebelum rekap dikunci. Rekap terkunci tidak bisa diubah.
4. **Notifikasi (F10, BR-04).** Stok ≤ stok minimum, hampir kedaluwarsa (default 3 hari, **konfirmasi dengan pengelola**), kasbon jatuh tempo. Tampilkan sebagai kartu berwarna dengan ikon dan label (jangan hanya warna).
5. **Laporan (F12, BR-10).**
   - Laba kotor = Σ (harga satuan − harga beli saat transaksi) × jumlah.
   - Laba-rugi per lini = laba kotor lini − pengeluaran lini. Ada tampilan konsolidasi, dasbor ringkas, dan margin per barang.
   - Kasir **tidak** melihat laba-rugi (Tabel 4.10).
   - Fungsi perhitungan kas dan laba harus berupa fungsi murni dengan unit test.
6. **Hutang pemasok (F18, FR-16).** Pembayaran hutang dan pengingat jatuh tempo.
7. **Tampilan riwayat aktivitas (F08)** untuk pemilik.
8. **Ekspor (F13).** PDF dan Excel, lalu tombol bagikan lewat **Web Share API** (cadangan: unduh file).
9. **Dokumentasi konfigurasi** (`docs/konfigurasi.md`): hosting, DB, variabel lingkungan, akun awal, cara pasang di HP. Bahan Tabel 4.23.

**Uji integrasi tiga fungsi (bahan Gambar 4.22):** jalankan satu skenario kasbon dari awal hingga pelunasan. Verifikasi: stok berkurang (FEFO) → notifikasi stok minimum bila tercapai → piutang bertambah → kas seharusnya **tidak** bertambah → laba terhitung → saat dibayar piutang berkurang dan kas bertambah.

**Selesai bila:**
- [ ] Skenario kasbon end-to-end lulus.
- [ ] Rekap harian menolak penguncian bila selisih tanpa keterangan.
- [ ] Laporan bisa diekspor dan dibagikan ke WhatsApp dari HP.
- [ ] Demo 2 selesai, Tabel 4.19 terisi, **screenshot untuk Gambar 4.20** tersimpan.

---

### MINGGU CODING 4 (Minggu ke-12): Iterasi 3, fitur bersyarat dan penyempurnaan, lalu DEMO 3

**Tiket Jira:** CAPST-42 (integrasi penuh), CAPST-38 (uji ulang), tiket baru F16, F15, F17, F19, F20.
**Fitur dikerjakan dalam urutan ini, sekaligus urutan pemotongan bila telat (Tabel 4.3):**

| Urutan | Fitur | Catatan implementasi |
|---|---|---|
| 1 | **F16 Stok opname** (BR-08) | Selisih fisik vs sistem. **Stok baru berubah setelah disetujui Penerus Usaha**, alasan selisih wajib diisi, ada dialog konfirmasi. |
| 2 | **F15 Retur** (BR-06) | Retur pelanggan dinilai dari harga satuan transaksi asal. Retur ke pemasok dari harga beli penerimaan atau riwayat harga. |
| 3 | **F17 Titip jual dasar** (BR-07) | Stok berstatus titipan. Kewajiban bayar naik saat laku, turun saat dibayar. **Tanpa komisi, tanpa penjadwalan.** |
| 4 | **F19 Antrean sinyal lemah** | **Hanya untuk penjualan.** Lihat rincian di bawah. |
| 5 | F20 Daftar belanja | Hanya bila waktu tersisa. Cukup tampilan filter stok ≤ minimum. |

**Rincian F19 (paling berisiko, kerjakan hati-hati):**
- Saat offline, simpan penjualan ke **Dexie (IndexedDB)** dengan status `belum_sinkron` dan UUID yang dibuat di HP.
- Indikator di atas layar: "Tersimpan di HP, menunggu sinyal" + jumlah antrean (Tabel 4.14).
- Saat online, kirim antrean **berurutan**. Server idempotent berdasarkan UUID, sehingga kirim ulang **tidak membuat transaksi ganda**.
- Service Worker men-cache shell aplikasi dan data barang agar layar Jual bisa terbuka tanpa sinyal.
- **Uji nyata:** aktifkan mode pesawat, catat 5 penjualan, matikan mode pesawat, pastikan 5 transaksi masuk tepat satu kali dan stok sesuai (**Cuplikan Kode 4.2**).
- Jika sampai Hari 4 belum stabil, **potong F19 terbatas** (catat sebagai saran di Bab VII). Jangan mengorbankan fitur inti.

**CAPST-42 Integrasi penuh** (transaksi + stok + hutang + laporan): jalankan ulang seluruh skenario Minggu 2-3 sebagai regresi, lalu tutup celah.

**Penyempurnaan:** perbaiki semua temuan **Prioritas Tinggi** dari demo 1 dan 2 lebih dulu. Prioritas Rendah dikerjakan bila ada waktu.

**Selesai bila:**
- [ ] Opname, retur, titip jual berfungsi dan ber-RBAC.
- [ ] F19 lulus uji mode pesawat, atau dicatat dipotong (Tabel 4.21).
- [ ] Demo 3 selesai, Tabel 4.20 dan 4.21 terisi, **screenshot Gambar 4.21** tersimpan.
- [ ] **Bekukan fitur (feature freeze).** Setelah ini hanya perbaikan bug.

---

### MINGGU CODING 5 (Minggu ke-13): Pengujian (G3)

**Tiket Jira:** CAPST-44 (usability SUS), CAPST-45, CAPST-46.
- **Uji fungsional black-box penuh FR-01 s.d. FR-19** (IV.4): isi tabel skenario uji, termasuk lingkungan uji (merek HP, versi Android, peramban, versi build).
- **Uji NFR:** kinerja penyimpanan transaksi multi-barang (NFR-08, **batas waktu perlu disepakati dengan pembimbing sebelum uji**), keamanan (kasir menembak endpoint terlarang → 403), PIN tidak tersimpan asli.
- **Uji usability SUS** bersama pengguna (CAPST-44), **target skor rata-rata ≥ 68** (NFR-01).
- Semua bug **Prioritas Tinggi** diperbaiki. Gunakan **Minggu ke-14 sebagai cadangan** bila G3 belum terpenuhi.

### MINGGU CODING 6 (Minggu ke-14): Serah terima dan penutupan
CAPST-46 (evaluasi SUS dan dokumentasi akhir), panduan penggunaan, pelatihan pengguna, lalu CAPST-47 (Laporan Akhir), CAPST-48/49 (slide dan presentasi), CAPST-50/51 (poster dan pameran).

---

## 6. PETA CAPST-XX → FITUR PROPOSAL (ringkas)

| Jira | Isi | Fitur / FR | Minggu coding |
|---|---|---|---|
| CAPST-32 | ERD + skema final | semua | 0 (blocker) |
| CAPST-43 | Migrasi data master 100+ | F02 / FR-02 | 1 (**ditarik maju**) |
| CAPST-31 | UI alur transaksi | F03 | 1-2 |
| CAPST-35 | Scan barcode kamera | F02 / FR-02-03 | 2 |
| CAPST-36 | Transaksi → stok otomatis | F03, F04 / FR-03, FR-05 | 2 |
| CAPST-38 | Testing fungsional awal | IV.4 | 2 (lalu tiap iterasi) |
| CAPST-39 | Upload prototipe + bimbingan pekan 9-10 | G2 iterasi 1 | 2 |
| CAPST-37 | Hutang/piutang + laba-rugi | F09, F12, F18 / FR-07, FR-14, FR-16 | 3 (**pecah 3 tiket**) |
| CAPST-42 | Integrasi penuh | integrasi 3 fungsi | 4 |
| CAPST-44/45/46 | SUS, upload hasil validasi, evaluasi | Tahap 5 / G3 | 5 |

---

## 7. HAL YANG PERLU KAMU CEK SENDIRI (ketidakkonsistenan yang saya temukan)

1. **Nama penerus usaha.** Proposal menyebut **Bu Santi**, sedangkan CAPST-33 menyebut **"Bu Ade"**. Pastikan itu orang yang sama atau perbaiki salah satunya.
2. **Tabel 4.7 vs IV.3a.** Proposal bab IV.2 masih Flutter/SQLite/VPS, sedangkan draf IV.3 sudah PWA/IndexedDB/Vercel. Tabel 4.16 sudah menjembatani, tetapi pastikan kalimat "Android" di Subbab I.4 dan Gambar 4.3 tidak membingungkan penguji.
3. **Paket Vercel.** Draf IV.3 sudah mencatat bahwa Hobby hanya untuk penggunaan non-komersial. Rencanakan paket Pro sebelum dipakai nyata di warung.
4. **Backlog kosong untuk fitur wajib.** Lihat Bagian 4. Tanpa tiket tersebut, progres Jira tidak akan mencerminkan pekerjaan sebenarnya.
5. **NFR-08** (batas waktu simpan transaksi) belum disepakati dengan pembimbing. Selesaikan sebelum Minggu 13.

---

## 8. TEMPLATE PROMPT PEMBUKA UNTUK AGEN

Tempel ini di awal sesi dengan agen, lalu ganti bagian tiket:

```
Baca AGENTS.md dan docs/PANDUAN_CODING_AGENT_Mismada_Farm.md.
Kerjakan HANYA tiket CAPST-XX: <judul tiket>.
Fitur proposal: F__, FR-__, BR-__.
Ikuti aturan Bagian 0. Sebelum menulis kode, tulis rencana singkat (file yang akan
dibuat/diubah, tabel DB yang disentuh, skenario uji). Tunggu saya setujui.
Setelah selesai, berikan ringkasan sesuai Bagian 0 poin 5.
```
