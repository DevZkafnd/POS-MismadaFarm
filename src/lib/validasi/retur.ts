import { z } from "zod";
import { JENIS_RETUR } from "@/lib/domain/retur";

/**
 * Validasi muatan retur (F15 / FR-09, BR-06).
 *
 * - Retur pelanggan wajib menunjuk item penjualan asal (untuk mengambil harga
 *   satuan transaksi asal).
 * - Retur pemasok boleh menunjuk penerimaan asal; bila kosong, harga beli
 *   diambil dari riwayat harga (harga beli terakhir).
 */

const tanggalOpsional = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus format YYYY-MM-DD")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const skemaRetur = z
  .object({
    jenis: z.enum(JENIS_RETUR),
    idBarang: z.number().int().positive("Barang wajib dipilih"),
    jumlah: z.number().positive("Jumlah harus lebih dari 0"),
    /** Wajib untuk retur pelanggan. */
    idDetailPenjualan: z.number().int().positive().nullable().optional(),
    /** Opsional untuk retur pemasok. */
    idPenerimaan: z.number().int().positive().nullable().optional(),
    alasan: z.string().trim().min(1, "Alasan retur wajib diisi"),
    tanggal: tanggalOpsional,
  })
  .superRefine((data, ctx) => {
    if (data.jenis === "pelanggan" && !data.idDetailPenjualan) {
      ctx.addIssue({
        code: "custom",
        message: "Retur pelanggan wajib menunjuk item penjualan asal",
        path: ["idDetailPenjualan"],
      });
    }
    if (data.jenis === "pelanggan" && data.idPenerimaan) {
      ctx.addIssue({
        code: "custom",
        message: "Retur pelanggan tidak memakai rujukan penerimaan",
        path: ["idPenerimaan"],
      });
    }
  });

export type MasukanRetur = z.infer<typeof skemaRetur>;
