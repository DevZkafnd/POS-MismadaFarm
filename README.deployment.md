# Deploy ke Vercel

## ✅ Status Setup
- ✅ Database Neon (Singapore) terhubung dan berisi data
- ✅ Schema & seed data loaded (121 barang, 3 akun)
- ✅ Build lokal berhasil
- ✅ Health check API passed: `{"status":"ok","database":"connected"}`
- ✅ Repository pushed ke GitHub
- ✅ Responsif mobile (Tailwind mobile-first)

## 🚀 Deploy ke Vercel

### 1. Import dari GitHub
Buka: https://vercel.com/new

- Pilih repository: **DevZkafnd/POS-MismadaFarm**
- Framework: Next.js (auto-detected)

### 2. Environment Variables

Tambahkan 2 variabel untuk **Production**:

**DATABASE_URL** (Neon pooled connection):
```
postgresql://neondb_owner:npg_wNlW0UjpAe7o@ep-ancient-dream-ao1h1qs6-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**SESSION_SECRET**:
```
TRHjYHQPslnItVSNkgy/Zea3yZ/Rm6y0iyWPlyIeW64=
```

### 3. Deploy
- Klik **Deploy**
- Tunggu build (~2-3 menit)
- URL akan jadi: `https://pos-mismada-farm.vercel.app` atau custom

### 4. Verifikasi
Setelah deploy, test:
- ✅ Buka di browser: halaman login muncul
- ✅ Login dengan PIN `123456` (Lusi/Ani/Bambang)
- ✅ Buka di Chrome Android: PWA installable
- ✅ Test barcode scanner (HTTPS required ✓)
- ✅ Add to Home Screen

## 👤 Akun Default

Login dengan PIN: **123456**

| Nama | Peran | Akses |
|------|-------|-------|
| Lusi | Pemilik | Full (laporan, rekap, log) |
| Ani | Kasir | Terbatas (jual, kasbon) |
| Bambang | Penerus Usaha | Full (seperti pemilik) |

⚠️ **WAJIB GANTI PIN SETELAH DEPLOY!**

## 🌍 Region Setup
- **Database**: Singapore (ap-southeast-1) ✓
- **Vercel**: Singapore (sin1) — sudah dikonfigurasi di `vercel.json`

## 📱 Mobile Testing Checklist
- [ ] Login berhasil
- [ ] Barcode scanner buka kamera
- [ ] Scan barcode berhasil (test: `8991000000001`)
- [ ] Add to Home Screen
- [ ] Offline mode (antrean penjualan)
- [ ] PWA icon muncul di launcher

## 🔧 Troubleshooting

### Build Error
- Pastikan kedua env vars sudah diset **sebelum** deploy
- Check Vercel logs: `npm run build` harus pass

### Database Connection Error
- Verifikasi DATABASE_URL dengan `?sslmode=require`
- Pastikan pakai URL **pooled** bukan direct

### Barcode Scanner Tidak Buka
- Harus HTTPS (Vercel auto-provide ✓)
- Browser harus Chrome/Edge (BarcodeDetector API)
- Fallback ke ZXing untuk Safari/Firefox

## 📊 Data yang Sudah Ada
- 5 lini usaha (Kelontong, Kerupuk Kulit, dll)
- 121 barang master
- 3 akun pengguna
- Semua tabel schema siap
