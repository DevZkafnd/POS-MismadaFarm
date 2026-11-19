import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

/**
 * GET /api/health — mengecek apakah koneksi basis data hidup.
 *
 * - 200 `{ status: "ok", database: "connected" }`     : basis data terhubung.
 * - 503 `{ status: "degraded", ... }`                 : DATABASE_URL belum diatur.
 * - 503 `{ status: "error", ... }`                    : basis data tidak terjangkau.
 */
export async function GET() {
  const db = getDb();

  if (!db) {
    return Response.json(
      {
        status: "degraded",
        database: "not_configured",
        message: "DATABASE_URL belum diatur.",
      },
      { status: 503 },
    );
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", database: "connected" });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Koneksi basis data gagal.",
      },
      { status: 503 },
    );
  }
}
