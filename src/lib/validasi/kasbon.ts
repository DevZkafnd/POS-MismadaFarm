import { z } from "zod";

/**
 * Validasi muatan kasbon/pelunasan piutang (F09 / FR-07, BR-05).
 */

const uangPositif = z
  .number()
  .int("Jumlah harus bilangan bulat rupiah")
  .positive("Jumlah pelunasan harus lebih dari 0");

export const skemaPelunasan = z.object({
  idPiutang: z.number().int().positive("Piutang wajib dipilih"),
  jumlah: uangPositif,
});

export type MasukanPelunasan = z.infer<typeof skemaPelunasan>;

export const skemaPelangganBaru = z.object({
  nama: z.string().trim().min(1, "Nama pelanggan wajib diisi"),
  noHp: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type MasukanPelangganBaru = z.infer<typeof skemaPelangganBaru>;
