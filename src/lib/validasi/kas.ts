import { z } from "zod";

/**
 * Validasi muatan pengeluaran per lini (F14 / FR-12) dan rekap harian
 * (F11 / FR-13, BR-09). Uang = bilangan bulat rupiah (Bagian 0 poin 8).
 */

const polaTanggal = /^\d{4}-\d{2}-\d{2}$/;

const tanggalOpsional = z
  .string()
  .trim()
  .regex(polaTanggal, "Tanggal harus format YYYY-MM-DD")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const skemaPengeluaran = z.object({
  idLini: z.number().int().positive("Lini usaha wajib dipilih"),
  kategori: z.string().trim().min(1, "Kategori wajib diisi"),
  jumlah: z
    .number()
    .int("Jumlah harus bilangan bulat rupiah")
    .positive("Jumlah harus lebih dari 0"),
  /** Kosong = hari ini. */
  tanggal: tanggalOpsional,
});

export type MasukanPengeluaran = z.infer<typeof skemaPengeluaran>;

export const skemaRekap = z.object({
  kasAwal: z.number().int("Kas awal harus bilangan bulat rupiah").min(0, "Kas awal tidak boleh negatif"),
  kasFisik: z
    .number()
    .int("Uang fisik harus bilangan bulat rupiah")
    .min(0, "Uang fisik tidak boleh negatif"),
  keterangan: z
    .string()
    .trim()
    .max(500, "Keterangan terlalu panjang")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  /** true = kunci rekap setelah disimpan (BR-09). */
  kunci: z.boolean().optional().default(false),
});

export type MasukanRekap = z.infer<typeof skemaRekap>;
