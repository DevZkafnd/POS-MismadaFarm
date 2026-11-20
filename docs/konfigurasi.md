# Konfigurasi & Pemasangan — POS Mismada Farm

Dokumen ini menjelaskan cara menyiapkan, menjalankan, menguji, dan memasang
prototipe POS Mismada Farm (CAPST-XX). Ikuti urutannya dari atas ke bawah.

## 1. Ringkasan teknologi

| Bagian | Pilihan |
|---|---|
| Kerangka | Next.js 16 (App Router, Turbopack) + TypeScript |
| Antarmuka | Tailwind CSS 4 |
| Basis data | PostgreSQL (lokal 18, produksi dapat pakai Neon/Supabase) |
| Akses data | Drizzle ORM (driver `postgres`) |
| Validasi | Zod v4 |
| Uji otomatis | Vitest |
| Ekspor | `pdf-lib` (PDF), `exceljs` (Excel), Web Share API (bagikan ke WhatsApp) |
| Antrean offline | Dexie (IndexedDB) + UUID idempotensi saat sinyal lemah |
| PWA | Manifest + Service Worker, dapat dipasang ke layar utama HP |

Uang selalu disimpan sebagai **bilangan bulat rupiah** (bukan pecahan).

## 2. Prasyarat

- Node.js 20 atau lebih baru (`node -v`).
- PostgreSQL 18 (atau versi 14+) yang berjalan di `localhost:5432`.
- (Windows) PowerShell; (Unix) terminal apa pun.

## 3. Variabel lingkungan

Salin `.env.example` menjadi `.env.local`, lalu isi nilainya.

```env
# Koneksi PostgreSQL. Contoh lokal:
DATABASE_URL=postgresql://postgres@localhost:5432/mismada_farm

# Rahasia penandatanganan cookie sesi (WAJIB diganti). Buat dengan:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_SECRET=ganti-dengan-hasil-generate
```

Bila memakai Neon/Supabase di produksi, tambahkan `?sslmode=require` pada
`DATABASE_URL`. Jangan pernah melakukan commit berkas `.env.local`.

## 4. Menyiapkan basis data

1. Buat basis data (sekali saja):

   ```bash
   createdb -U postgres mismada_farm
   # atau lewat psql:
   # psql -U postgres -c "CREATE DATABASE mismada_farm;"
   ```

2. Terapkan skema. Sumber kebenaran skema ada di `mismada_farm_schema.sql`.

   ```bash
   psql -U postgres -d mismada_farm -f mismada_farm_schema.sql
   ```

   Alternatif, gunakan Drizzle Kit bila memakai alur migrasi:

   ```bash
   npx drizzle-kit push
   ```

3. Impor data master + buat akun awal:

   ```bash
   npm run seed             # impor data/barang.csv
   npm run seed -- --reset  # kosongkan master lalu impor ulang
   npm run seed -- --file data/barang_tidak_valid.csv --cek   # uji berkas CSV tanpa menyimpan
   ```

   Skrip seed membuat 5 lini usaha, 3 peran, 3 akun uji, dan 121 barang.

## 5. Akun awal (prototipe)

Semua akun memakai PIN default `123456`. **Ganti PIN sebelum dipakai nyata.**

| Pengguna | Peran | PIN |
|---|---|---|
| `pemilik` | Pemilik | 123456 |
| `penerus` | Penerus Usaha | 123456 |
| `kasir` | Kasir | 123456 |

Hak akses: kasir tidak dapat membuka Penerimaan, Keuangan, atau Laporan
(laba-rugi). Pemilik satu-satunya yang dapat membuka Riwayat Aktivitas.

## 6. Menjalankan aplikasi

```bash
npm run dev     # mode pengembangan  → http://localhost:3000
npm run build   # build produksi
npm run start   # jalankan hasil build produksi
```

## 7. Menguji

```bash
npm test        # uji otomatis Vitest (65 tes: FEFO, kembalian, kas, laba, ekspor PDF/Excel, opname, retur, titip, antrean offline, dll.)
npm run lint    # pemeriksaan ESLint
npx tsc --noEmit # pemeriksaan tipe
```

Bila memakai basis data uji terpisah, arahkan `DATABASE_URL` ke basis data
`mismada_farm_testing` agar data pengembangan tidak terganggu.

## 8. Memasang di HP (PWA)

1. Jalankan aplikasi pada jaringan lokal (`npm run dev -- --hostname 0.0.0.0`).
2. Buka alamat `http://<IP-komputer>:3000` dari browser HP (Chrome).
3. Pilih menu **Tambahkan ke layar utama** / **Install app**.
4. Untuk pindai barcode, izinkan akses kamera saat diminta.

Bila browser tidak mendukung `BarcodeDetector`, sistem otomatis memakai
cadangan `@zxing/browser`. Kasir juga dapat **mengetik/menempel kode manual**.

## 9. Deploy ke hosting

1. Unggah repositori ke GitHub lalu hubungkan ke Vercel.
2. Tambahkan variabel `DATABASE_URL` dan `SESSION_SECRET` di pengaturan proyek
   Vercel (Environment Variables).
3. Terapkan skema ke basis data produksi (Neon/Supabase) dengan
   `mismada_farm_schema.sql` atau `npx drizzle-kit push`.
4. Jalankan seed produksi sekali untuk membuat akun awal, lalu ganti PIN.
5. Deploy. Pastikan `DATABASE_URL` memakai `sslmode=require`.

Aturan biaya (NFR-06): jangan mengaktifkan layanan berbayar berbasis pemakaian
(API LLM, WhatsApp Business API, dsb.).
