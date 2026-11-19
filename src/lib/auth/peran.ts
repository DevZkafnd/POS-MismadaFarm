/**
 * Tiga peran RBAC (Tabel 4.10). Nilai harus sama persis dengan isi tabel `peran`
 * pada `mismada_farm_schema.sql`.
 */
export const PERAN = {
  PEMILIK: "pemilik",
  KASIR: "kasir",
  PENERUS_USAHA: "penerus_usaha",
} as const;

export type NamaPeran = (typeof PERAN)[keyof typeof PERAN];

export const SEMUA_PERAN: NamaPeran[] = [PERAN.PEMILIK, PERAN.KASIR, PERAN.PENERUS_USAHA];

export const LABEL_PERAN: Record<NamaPeran, string> = {
  [PERAN.PEMILIK]: "Pemilik",
  [PERAN.KASIR]: "Kasir",
  [PERAN.PENERUS_USAHA]: "Penerus Usaha",
};

export function peranValid(nilai: string): nilai is NamaPeran {
  return (SEMUA_PERAN as string[]).includes(nilai);
}
