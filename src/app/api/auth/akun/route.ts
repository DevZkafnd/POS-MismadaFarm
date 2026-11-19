import { connection } from "next/server";
import { asc, eq } from "drizzle-orm";
import { pengguna, peran } from "@/lib/db/schema";
import { butuhDb, responsGalat } from "@/lib/http";

/**
 * GET /api/auth/akun — daftar akun aktif untuk layar login ("pilih akun lalu
 * masukkan PIN", UC01). Hanya mengembalikan nama + peran, tidak pernah hash PIN.
 */
export async function GET() {
  await connection();
  try {
    const db = butuhDb();
    const daftar = await db
      .select({
        username: pengguna.username,
        nama: pengguna.nama,
        peran: peran.namaPeran,
      })
      .from(pengguna)
      .innerJoin(peran, eq(pengguna.idPeran, peran.idPeran))
      .where(eq(pengguna.aktif, true))
      .orderBy(asc(pengguna.idPengguna));

    return Response.json({ akun: daftar });
  } catch (galat) {
    return responsGalat(galat);
  }
}
