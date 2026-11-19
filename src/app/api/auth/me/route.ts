import { connection } from "next/server";
import { getSesi } from "@/lib/auth/session";

/** GET /api/auth/me — informasi pengguna yang sedang masuk. */
export async function GET() {
  await connection();
  const sesi = await getSesi();
  if (!sesi) {
    return Response.json({ pengguna: null }, { status: 401 });
  }
  return Response.json({
    pengguna: {
      idPengguna: sesi.idPengguna,
      nama: sesi.nama,
      username: sesi.username,
      peran: sesi.peran,
    },
  });
}
