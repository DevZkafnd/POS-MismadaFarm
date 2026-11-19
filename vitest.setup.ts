import { config } from "dotenv";

// Vitest tidak memuat berkas .env Next.js secara otomatis. Muat manual agar
// modul yang membaca `env` (session, db) bisa diuji tanpa gagal cepat.
config({ path: ".env.local" });
config({ path: ".env" });
