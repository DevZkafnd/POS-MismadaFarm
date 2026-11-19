<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Aturan Kerja Agen: Prototipe POS Mismada Farm

Salinan Bagian 0 dari `PANDUAN_CODING_AGENT_Mismada_Farm.md`. Dokumen lengkap (keputusan teknologi, struktur repo, peta tiket, rencana mingguan, template prompt) ada di berkas itu.

## 0. ATURAN UMUM UNTUK AGEN (berlaku sepanjang proyek)

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
