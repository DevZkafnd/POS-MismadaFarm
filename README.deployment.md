# Deploy ke Vercel

## Setup Vercel

1. **Import dari GitHub**
   - Buka https://vercel.com/new
   - Pilih repository: `DevZkafnd/POS-MismadaFarm`
   - Framework akan terdeteksi otomatis (Next.js)

2. **Environment Variables**
   Tambahkan 2 variabel untuk Production:
   
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_wNlW0UjpAe7o@ep-ancient-dream-ao1h1qs6-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   
   SESSION_SECRET=TRHjYHQPslnItVSNkgy/Zea3yZ/Rm6y0iyWPlyIeW64=
   ```

3. **Deploy**
   - Klik "Deploy"
   - Tunggu build selesai (~2 menit)

## Akun Default

Login dengan PIN: `123456`

- **Pemilik**: Lusi (akses penuh)
- **Kasir**: Ani (akses terbatas)
- **Penerus**: Bambang (akses penuh)

**WAJIB ganti PIN setelah deploy!**

## Testing di Mobile

1. Buka URL Vercel di Chrome Android
2. Login dengan salah satu akun
3. Test barcode scanner (butuh HTTPS ✓)
4. Add to Home Screen untuk PWA

## Region

- Database: Singapore (ap-southeast-1)
- Vercel: Singapore (sin1)
