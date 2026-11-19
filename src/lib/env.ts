import { z } from "zod";

/**
 * Validasi variabel lingkungan (NFR-07).
 *
 * Pada Minggu Coding 1 kedua variabel menjadi WAJIB. Aplikasi gagal cepat saat
 * dijalankan bila `DATABASE_URL` / `SESSION_SECRET` belum diatur, sehingga tidak
 * ada galat samar yang baru muncul pada request pertama.
 */
export const skemaEnv = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL tidak boleh kosong"),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET tidak boleh kosong"),
});

export type Env = z.infer<typeof skemaEnv>;

/** Baca & validasi variabel lingkungan dari `sumber` (default `process.env`). */
export function bacaEnv(sumber: Record<string, string | undefined> = process.env): Env {
  return skemaEnv.parse({
    DATABASE_URL: sumber.DATABASE_URL,
    SESSION_SECRET: sumber.SESSION_SECRET,
  });
}

export const env = bacaEnv();
