import { GalatHttp } from "@/lib/http";
import type { NamaPeran } from "./peran";
import { getSesi, type Sesi } from "./session";

/**
 * Penegakan hak akses di sisi server (lapisan kedua setelah UI menyembunyikan
 * menu). Setiap Route Handler yang sensitif wajib memanggil salah satu dari
 * fungsi ini agar permintaan di luar hak akses ditolak dengan HTTP 401/403.
 */

export async function butuhSesi(): Promise<Sesi> {
  const sesi = await getSesi();
  if (!sesi) {
    throw new GalatHttp(401, "belum_masuk", "Anda belum masuk. Silakan login dulu.");
  }
  return sesi;
}

/** Izinkan hanya bila peran sesi termasuk daftar yang diizinkan. */
export async function requireRole(diizinkan: NamaPeran[]): Promise<Sesi> {
  const sesi = await butuhSesi();
  if (!diizinkan.includes(sesi.peran)) {
    throw new GalatHttp(403, "akses_ditolak", "Anda tidak punya hak akses untuk tindakan ini.");
  }
  return sesi;
}
