import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { butuhSesi } from "@/lib/auth/rbac";
import { liniUsaha } from "@/lib/db/schema";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/lini — daftar lini usaha (F07).
 * Dipakai layar Jual untuk memberi label lini pada item harga manual.
 */
export async function GET() {
  await connection();
  try {
    await butuhSesi();
    const db = butuhDb();

    const daftar = await db
      .select({ idLini: liniUsaha.idLini, namaLini: liniUsaha.namaLini })
      .from(liniUsaha)
      .orderBy(asc(liniUsaha.namaLini));

    return Response.json({ lini: daftar });
  } catch (galat) {
    return responsGalat(galat);
  }
}
