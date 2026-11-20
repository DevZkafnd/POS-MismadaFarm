import { z } from "zod";

/**
 * Validasi pembayaran hutang ke pemasok (F18 / FR-16).
 * Uang = bilangan bulat rupiah (Bagian 0 poin 8).
 */

export const skemaBayarHutang = z.object({
  idHutang: z.number().int().positive("Hutang wajib dipilih"),
  jumlah: z
    .number()
    .int("Jumlah harus bilangan bulat rupiah")
    .positive("Jumlah bayar harus lebih dari 0"),
  tanggal: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus format YYYY-MM-DD")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type MasukanBayarHutang = z.infer<typeof skemaBayarHutang>;
