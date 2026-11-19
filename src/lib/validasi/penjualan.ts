import { z } from "zod";

/**
 * Validasi muatan penjualan (F03 / FR-03). Dipakai endpoint `POST /api/penjualan`.
 * Uang = bilangan bulat rupiah (Bagian 0 poin 8).
 */

export const JALUR_INPUT = ["scan", "favorit", "manual"] as const;
export type JalurInput = (typeof JALUR_INPUT)[number];

export const METODE_BAYAR = ["tunai", "kasbon"] as const;
export type MetodeBayar = (typeof METODE_BAYAR)[number];

const uang = z.number().int("Harga harus bilangan bulat rupiah").min(0, "Harga tidak boleh negatif");

// UUID v1-v5 apa pun; divalidasi bentuk agar tidak bergantung versi Zod.
const polaUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const skemaItemPenjualan = z
  .object({
    /** Kosong hanya untuk item jalur manual (BR: harga manual, tanpa barang). */
    idBarang: z.number().int().positive().nullable().optional(),
    namaItem: z.string().trim().min(1, "Nama item wajib diisi"),
    jumlah: z.number().positive("Jumlah harus lebih dari 0"),
    hargaSatuan: uang,
    jalurInput: z.enum(JALUR_INPUT),
    /** Wajib untuk item manual; untuk scan/favorit diambil dari data barang. */
    idLini: z.number().int().positive().optional(),
  })
  .superRefine((item, ctx) => {
    if (item.jalurInput === "manual") {
      if (item.idBarang) {
        ctx.addIssue({
          code: "custom",
          message: "Item harga manual tidak boleh menunjuk barang master",
          path: ["idBarang"],
        });
      }
      if (!item.idLini) {
        ctx.addIssue({
          code: "custom",
          message: "Item manual wajib memilih lini usaha (F07)",
          path: ["idLini"],
        });
      }
      return;
    }
    if (!item.idBarang) {
      ctx.addIssue({
        code: "custom",
        message: "Item jalur scan/favorit wajib punya id barang",
        path: ["idBarang"],
      });
    }
  });

export type ItemPenjualanMasuk = z.infer<typeof skemaItemPenjualan>;

export const skemaPenjualan = z
  .object({
    /** UUID dibuat di HP agar pengiriman ulang tidak menggandakan transaksi (F19). */
    idTransaksi: z.string().regex(polaUuid, "ID transaksi bukan UUID yang sah"),
    metode: z.enum(METODE_BAYAR),
    /** Wajib bila metode kasbon (BR-05). */
    idPelanggan: z.number().int().positive().nullable().optional(),
    /** Uang yang diserahkan pembeli (untuk hitung kembalian). */
    dibayar: uang.optional(),
    items: z.array(skemaItemPenjualan).min(1, "Keranjang tidak boleh kosong"),
  })
  .superRefine((data, ctx) => {
    if (data.metode === "kasbon" && !data.idPelanggan) {
      ctx.addIssue({
        code: "custom",
        message: "Transaksi kasbon wajib memilih pelanggan",
        path: ["idPelanggan"],
      });
    }
  });

export type MasukanPenjualan = z.infer<typeof skemaPenjualan>;

/**
 * Nomor transaksi yang mudah dibaca manusia, mis. `TRX-20261119-A1B2C3D4`.
 * Turunan dari UUID (deterministik) sehingga idempotensi tetap terjaga.
 */
export function nomorTransaksi(waktu: Date, idTransaksi: string): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const tanggal = `${waktu.getFullYear()}${p(waktu.getMonth() + 1)}${p(waktu.getDate())}`;
  const kode = idTransaksi.replaceAll("-", "").slice(0, 8).toUpperCase();
  return `TRX-${tanggal}-${kode}`;
}
