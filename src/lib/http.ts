import { ZodError } from "zod";
import { getDb, type Db } from "@/lib/db";

/** Galat yang membawa kode HTTP, dipakai untuk menolak permintaan (RBAC dsb.). */
export class GalatHttp extends Error {
  constructor(
    readonly status: number,
    readonly kode: string,
    pesan: string,
  ) {
    super(pesan);
    this.name = "GalatHttp";
  }
}

/** Ubah galat apa pun menjadi Response JSON yang aman ditampilkan ke pengguna. */
export function responsGalat(galat: unknown): Response {
  if (galat instanceof GalatHttp) {
    return Response.json({ error: galat.kode, pesan: galat.message }, { status: galat.status });
  }
  if (galat instanceof ZodError) {
    return Response.json(
      { error: "validasi_gagal", pesan: galat.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  console.error("Galat tak terduga:", galat);
  return Response.json(
    { error: "galat_server", pesan: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}

/** Ambil klien basis data; gagal 503 bila DATABASE_URL belum diatur. */
export function butuhDb(): Db {
  const db = getDb();
  if (!db) {
    throw new GalatHttp(503, "db_belum_siap", "Basis data belum dikonfigurasi.");
  }
  return db;
}

/** Baca body JSON; gagal 400 bila bukan JSON yang sah. */
export async function bacaJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new GalatHttp(400, "json_tidak_valid", "Isi permintaan bukan JSON yang sah.");
  }
}
