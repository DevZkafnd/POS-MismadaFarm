import { hapusSesi } from "@/lib/auth/session";
import { getSesi } from "@/lib/auth/session";
import { butuhDb, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";

/** POST /api/auth/logout — akhiri sesi. */
export async function POST() {
  try {
    const sesi = await getSesi();
    await hapusSesi();

    if (sesi) {
      const db = butuhDb();
      await catatAktivitas(db, {
        idPengguna: sesi.idPengguna,
        aksi: "logout",
        objek: `pengguna#${sesi.idPengguna}`,
        detail: "Keluar dari aplikasi",
      });
    }

    return Response.json({ ok: true });
  } catch (galat) {
    return responsGalat(galat);
  }
}
