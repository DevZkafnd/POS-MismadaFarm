import { z } from "zod";

/**
 * Validasi muatan penerimaan barang (F06 / FR-06).
 * Jenis: tunai (bayar langsung), kredit (jadi hutang pemasok), titipan (titip jual).
 */

export const JENIS_PENERIMAAN = ["tunai", "kredit", "titipan"] as const;
export type JenisPenerimaan = (typeof JENIS_PENERIMAAN)[number];

const uang = z.number().int("Harga harus bilangan bulat rupiah").min(0, "Harga tidak boleh negatif");

const polaTanggal = /^\d{4}-\d{2}-\d{2}$/;

const tanggalOpsional = z
  .string()
  .trim()
  .regex(polaTanggal, "Tanggal harus format YYYY-MM-DD")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const skemaItemPenerimaan = z.object({
  idBarang: z.number().int().positive("Barang wajib dipilih"),
  jumlah: z.number().positive("Jumlah harus lebih dari 0"),
  hargaBeli: uang,
  tglKedaluwarsa: tanggalOpsional,
});

export type ItemPenerimaanMasuk = z.infer<typeof skemaItemPenerimaan>;

export const skemaPenerimaan = z
  .object({
    idPemasok: z.number().int().positive("Pemasok wajib dipilih"),
    jenis: z.enum(JENIS_PENERIMAAN),
    /** Hanya dipakai bila jenis kredit. */
    jatuhTempo: tanggalOpsional,
    items: z.array(skemaItemPenerimaan).min(1, "Minimal satu barang harus diisi"),
  })
  .superRefine((data, ctx) => {
    if (data.jenis !== "kredit" && data.jatuhTempo) {
      ctx.addIssue({
        code: "custom",
        message: "Jatuh tempo hanya untuk penerimaan kredit",
        path: ["jatuhTempo"],
      });
    }
  });

export type MasukanPenerimaan = z.infer<typeof skemaPenerimaan>;

export const skemaPemasokBaru = z.object({
  nama: z.string().trim().min(1, "Nama pemasok wajib diisi"),
  noHp: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  jenis: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export type MasukanPemasokBaru = z.infer<typeof skemaPemasokBaru>;
