# Uji Fungsional Awal — Iterasi 1 (Minggu Coding 2 / CAPST-38)

Tanggal uji: 2026-11-19
Lingkungan: `next dev` lokal, PostgreSQL 18 (`mismada_farm`), akun uji PIN `123456`
Perkakas: `curl.exe` (uji HTTP) + `psql.exe` (verifikasi basis data) + `npm test` (Vitest)

> Catatan: uji pindai kamera (U-02/U-03) baru diverifikasi pada tingkat fungsi pencocokan
> (`src/lib/domain/barcode.ts`). Uji kamera di perangkat nyata (HP/tablet) masih perlu
> dilakukan saat demo — lihat "Belum diuji".

| ID | FR/BR | Langkah | Hasil diharapkan | Hasil aktual | Status |
|---|---|---|---|---|---|
| U-01 | FR-01 | Login satu per satu sebagai pemilik, penerus, kasir (PIN 123456) | Ketiganya bisa masuk, sesi tersimpan di cookie httpOnly | Ketiganya mendapat `pengguna` + cookie sesi | Lulus |
| U-02 | F02 / FR-02 | Cocokkan barcode terdaftar (`8991000000001`) lewat fungsi `cocokkanBarcode` | Barang ditemukan | `{ jenis: "ditemukan", barang: Beras … }` | Lulus (unit test) |
| U-03 | F02 | Cocokkan barcode tak terdaftar (`0000000000000`) | Pesan jelas, barang **tidak** ditambah otomatis | `{ jenis: "tidak_ditemukan" }`, pesan "belum terdaftar. Cari manual…" | Lulus (unit test) |
| U-04 | F03 / FR-03 | Penjualan tunai 2 item (scan 2×Beras + manual 1×Plastik), bayar Rp200.000 | Transaksi tersimpan, total Rp134.000, kembalian Rp66.000 | `total=134000`, `kembalian=66000`, `ulangan=false` | Lulus |
| U-05 | FR-03 | Cek `stok_batch` barang #1 setelah penjualan | Batch berkurang sejumlah yang dijual | Batch 108: 10 → 0, batch 1: 40 → 0 (total 48 diambil) | Lulus |
| U-06 | BR-03 | Urutan pengambilan batch saat jual | Batch kedaluwarsa terdekat diambil lebih dulu | Batch 108 (exp 2026-12-31) habis sebelum batch 1 (tanpa exp) | Lulus |
| U-07 | BR-02 | Jual item manual Rp2.000 (lini Kelontong), lalu cek data master | `harga_jual_aktif` master tidak berubah | `barang#1.harga_jual_aktif` tetap 66.000 | Lulus |
| U-08 | Tabel 4.10 | Kasir memanggil `PATCH /api/barang/1/harga` | Ditolak HTTP 403 | 403 `akses_ditolak` | Lulus |
| U-09 | F19 | Kirim `POST /api/penjualan` ulang dengan UUID yang sama | Tidak menyimpan ulang, kembalikan hasil lama | `ulangan=true`, total & item sama, `detail_penjualan` tidak bertambah | Lulus |
| U-10 | Tabel 4.14 | Jual 9.999 unit saat stok hanya 48 | Transaksi tetap tersimpan + peringatan (bukan blokir) | Tersimpan; `peringatanStok=["Beras kurang 9951 …"]` | Lulus |
| U-11 | F06 / FR-06 | `POST /api/penerimaan` jenis kredit (10×Beras, harga beli 60.000) | `stok_batch` bertambah, `hutang_pemasok` terbentuk | `stok_batch#108` (+10, exp 2026-12-31); `hutang_pemasok` saldo 600.000, status `belum` | Lulus |
| U-12 | FR-06 | Barang jasa tidak menambah/mengurangi stok (BR-11) | Stok tidak berubah | Dijamin `transaksiPenjualan`/`penerimaan` melewatkan item `tipe='jasa'` | Lulus (logika) |
| U-13 | Tabel 4.10 | Kasir memanggil `POST /api/penerimaan` dan `POST /api/pemasok` | Ditolak HTTP 403 | Keduanya 403 `akses_ditolak` | Lulus |
| U-14 | FR-17 / F08 | Cek `log_aktivitas` setelah aksi di atas | Setiap perubahan tercatat | Tercatat: `jual`, `penerimaan`, `tambah_pemasok`, `login` | Lulus |

## Ringkasan otomatis

- `npm test` → 5 berkas, **24 tes lulus** (termasuk FEFO, kembalian, pencocokan barcode).
- `npm run build` → **bersih**; semua Route Handler baru bertanda dinamis (`ƒ`).

## Belum diuji (perlu demo di perangkat)

- Pindai kamera nyata dengan `BarcodeDetector` (Chrome Android) dan cadangan `@zxing/browser`.
- Pemasangan PWA ke layar utama HP.
- Tampilan responsif di lebar 360 px.
