import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Simpan klien di globalThis agar tidak dibuat ulang setiap hot reload saat
 * `next dev` (baik di serverless Vercel maupun lokal).
 */
const globalForDb = globalThis as unknown as {
  mismadaSql?: ReturnType<typeof postgres>;
  mismadaDb?: Db;
};

/**
 * Kembalikan klien Drizzle, atau `null` bila `DATABASE_URL` belum diatur.
 * Memakai satu koneksi (`max: 1`) dan menonaktifkan prepared statement agar
 * kompatibel dengan connection pooler Neon/Supabase.
 */
export function getDb(): Db | null {
  if (!env.DATABASE_URL) return null;

  if (!globalForDb.mismadaDb) {
    const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
    globalForDb.mismadaSql = sql;
    globalForDb.mismadaDb = drizzle(sql, { schema });
  }

  return globalForDb.mismadaDb;
}
