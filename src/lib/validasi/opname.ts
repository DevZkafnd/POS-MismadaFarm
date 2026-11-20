import { z } from "zod";

/**
 * Validasi muatan stok opname (F16 / FR-11, BR-08).
 *
 * Alasan selisih tidak divalidasi di sini karena selisih baru diketahui dari
 * data stok sistem saat permintaan diproses; penegakan aturan BR-08 dilakukan di
 * endpoint memakai helper `perluAlasan` dari `lib/domain/opname`.
 */

const alasanOpsional = z
  .string()
  .trim()
  .max(500, "Alasan terlalu panjang")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const skemaItemOpname = z.object({
  idBarang: z.number().int().positive("Barang wajib dipilih"),
  /** Hasil hitung fisik; stok boleh pecahan (barang per kg). */
  stokFisik: z.number().min(0, "Stok fisik tidak boleh negatif"),
  alasan: alasanOpsional,
});

export type ItemOpnameMasuk = z.infer<typeof skemaItemOpname>;

export const skemaOpname = z.object({
  items: z.array(skemaItemOpname).min(1, "Minimal satu barang harus dihitung"),
});

export type MasukanOpname = z.infer<typeof skemaOpname>;
