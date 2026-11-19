import { z } from "zod";

/**
 * Validasi variabel lingkungan (NFR-07).
 *
 * Pada Minggu Coding 0 kedua variabel dibuat opsional agar proyek tetap bisa
 * di-build sebelum basis data benar-benar disiapkan. Variabel menjadi wajib
 * saat fitur basis data mulai dipakai pada Minggu Coding 1.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL tidak boleh kosong").optional(),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET tidak boleh kosong").optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  SESSION_SECRET: process.env.SESSION_SECRET || undefined,
});
