/**
 * Status saldo piutang/hutang (BR-05, F09, F18).
 * Dipakai untuk piutang pelanggan (kasbon) dan hutang ke pemasok.
 */

export const STATUS_SALDO = ["belum", "sebagian", "lunas"] as const;
export type StatusSaldo = (typeof STATUS_SALDO)[number];

/**
 * Tentukan status dari sisa saldo:
 * - lunas    : saldo ≤ 0
 * - sebagian : 0 < saldo < nilai awal (sudah dicicil)
 * - belum    : saldo masih penuh
 */
export function statusDariSaldo(saldo: number, nilaiAwal: number): StatusSaldo {
  if (saldo <= 0) return "lunas";
  if (saldo < nilaiAwal) return "sebagian";
  return "belum";
}
