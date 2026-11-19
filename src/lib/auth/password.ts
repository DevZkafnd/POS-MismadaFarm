import bcrypt from "bcryptjs";

/**
 * Hash PIN/kata sandi. Tidak pernah menyimpan nilai asli (NFR-03).
 * PIN kasir literasi digital terbatas → biasanya 6 angka, jadi biaya hash
 * dijaga tetap wajar (NFR-06: biaya terprediksi).
 */
const PUTARAN = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, PUTARAN);
}

export async function verifikasiPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash) return false;
  return bcrypt.compare(pin, hash);
}
