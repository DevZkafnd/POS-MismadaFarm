import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { NamaPeran } from "./peran";

/** Sesi disimpan di cookie httpOnly bertanda tangan HMAC (tak bisa dipalsukan). */
export const NAMA_COOKIE_SESI = "mismada_sesi";
export const MASA_BERLAKU_DETIK = 60 * 60 * 12; // 12 jam

export type Sesi = {
  idPengguna: number;
  nama: string;
  username: string;
  peran: NamaPeran;
  /** Epoch detik kapan sesi kedaluwarsa. */
  kedaluwarsa: number;
};

function rahasia(): string {
  const nilai = env.SESSION_SECRET;
  if (!nilai) {
    throw new Error("SESSION_SECRET belum diatur di .env.local.");
  }
  return nilai;
}

function tandatangan(muatan: string): string {
  return createHmac("sha256", rahasia()).update(muatan).digest("base64url");
}

export function buatTokenSesi(sesi: Sesi): string {
  const muatan = Buffer.from(JSON.stringify(sesi)).toString("base64url");
  return `${muatan}.${tandatangan(muatan)}`;
}

export function bacaTokenSesi(token: string): Sesi | null {
  const [muatan, tanda] = token.split(".");
  if (!muatan || !tanda) return null;

  const tandaHarus = tandatangan(muatan);
  const a = Buffer.from(tanda);
  const b = Buffer.from(tandaHarus);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const sesi = JSON.parse(Buffer.from(muatan, "base64url").toString()) as Sesi;
    if (!sesi.kedaluwarsa || sesi.kedaluwarsa * 1000 < Date.now()) return null;
    return sesi;
  } catch {
    return null;
  }
}

/** Buat objek sesi baru dari data pengguna (kedaluwarsa dihitung dari sekarang). */
export function sesiBaru(pengguna: {
  idPengguna: number;
  nama: string;
  username: string;
  peran: NamaPeran;
}): Sesi {
  return {
    ...pengguna,
    kedaluwarsa: Math.floor(Date.now() / 1000) + MASA_BERLAKU_DETIK,
  };
}

/** Tulis cookie sesi (hanya boleh di Route Handler / Server Function). */
export async function setSesi(sesi: Sesi): Promise<void> {
  const toko = await cookies();
  toko.set(NAMA_COOKIE_SESI, buatTokenSesi(sesi), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MASA_BERLAKU_DETIK,
  });
}

export async function hapusSesi(): Promise<void> {
  const toko = await cookies();
  toko.delete(NAMA_COOKIE_SESI);
}

export async function getSesi(): Promise<Sesi | null> {
  const token = (await cookies()).get(NAMA_COOKIE_SESI)?.value;
  if (!token) return null;
  return bacaTokenSesi(token);
}
