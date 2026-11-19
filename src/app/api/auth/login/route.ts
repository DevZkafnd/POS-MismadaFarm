import { eq } from "drizzle-orm";
import { z } from "zod";
import { peranValid } from "@/lib/auth/peran";
import { verifikasiPin } from "@/lib/auth/password";
import { sesiBaru, setSesi } from "@/lib/auth/session";
import { pengguna, peran } from "@/lib/db/schema";
import { bacaJson, butuhDb, GalatHttp, responsGalat } from "@/lib/http";
import { catatAktivitas } from "@/lib/log";

const skemaMasuk = z.object({
  username: z.string().trim().min(1, "Akun wajib dipilih"),
  pin: z.string().min(1, "PIN wajib diisi"),
});

/** POST /api/auth/login — pilih akun + PIN (F01 / FR-01 / UC01). */
export async function POST(req: Request) {
  try {
    const db = butuhDb();
    const isi = skemaMasuk.parse(await bacaJson(req));

    const [akun] = await db
      .select({
        idPengguna: pengguna.idPengguna,
        nama: pengguna.nama,
        username: pengguna.username,
        passwordHash: pengguna.passwordHash,
        aktif: pengguna.aktif,
        peran: peran.namaPeran,
      })
      .from(pengguna)
      .innerJoin(peran, eq(pengguna.idPeran, peran.idPeran))
      .where(eq(pengguna.username, isi.username));

    if (!akun || !akun.aktif) {
      throw new GalatHttp(401, "kredensial_salah", "Akun atau PIN salah.");
    }

    const cocok = await verifikasiPin(isi.pin, akun.passwordHash);
    if (!cocok) {
      throw new GalatHttp(401, "kredensial_salah", "Akun atau PIN salah.");
    }

    if (!peranValid(akun.peran)) {
      throw new GalatHttp(500, "peran_tidak_dikenal", "Peran akun tidak dikenali.");
    }

    const sesi = sesiBaru({
      idPengguna: akun.idPengguna,
      nama: akun.nama,
      username: akun.username,
      peran: akun.peran,
    });
    await setSesi(sesi);
    await catatAktivitas(db, {
      idPengguna: akun.idPengguna,
      aksi: "login",
      objek: `pengguna#${akun.idPengguna}`,
      detail: `Masuk sebagai ${akun.peran}`,
    });

    return Response.json({
      pengguna: {
        idPengguna: akun.idPengguna,
        nama: akun.nama,
        username: akun.username,
        peran: akun.peran,
      },
    });
  } catch (galat) {
    return responsGalat(galat);
  }
}
