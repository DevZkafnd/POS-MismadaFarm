import { z } from "zod";

/**
 * Validasi data barang — dipakai bersama oleh endpoint API (Zod) dan skrip
 * impor CSV (fungsi murni, mudah diuji). Aturan uang: bilangan bulat rupiah
 * (Bagian 0 poin 8).
 */

/** Satuan yang dikenal. Nilai di luar daftar ini ditolak saat impor. */
export const SATUAN_DIKENAL = [
  "pcs",
  "unit",
  "kg",
  "gram",
  "ons",
  "liter",
  "ml",
  "sak",
  "karung",
  "bungkus",
  "sachet",
  "renteng",
  "bungkal",
  "botol",
  "kaleng",
  "gelas",
  "dos",
  "pak",
  "bal",
  "ikat",
  "lembar",
  "meter",
  "lonjor",
  "tabung",
  "ton",
  "rit",
  "hari",
  "jam",
  "kali",
] as const;

export type Satuan = (typeof SATUAN_DIKENAL)[number];

export const TIPE_ITEM = ["barang", "jasa"] as const;
export type TipeItem = (typeof TIPE_ITEM)[number];

// ---------------------------------------------------------------------------
// Skema API
// ---------------------------------------------------------------------------

const uang = z.number().int("Harga harus bilangan bulat rupiah").min(0, "Harga tidak boleh negatif");

export const skemaBarangBaru = z.object({
  kodeBarcode: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  namaBarang: z.string().trim().min(1, "Nama barang wajib diisi"),
  idLini: z.number().int().positive("Lini usaha wajib dipilih"),
  tipe: z.enum(TIPE_ITEM),
  satuan: z.string().trim().min(1, "Satuan wajib diisi"),
  hargaJualAktif: uang,
  hargaBeliTerakhir: uang.default(0),
  stokMinimum: z.number().min(0).default(0),
  favorit: z.boolean().default(false),
  cepatRusak: z.boolean().default(false),
});

export type MasukanBarangBaru = z.infer<typeof skemaBarangBaru>;

export const skemaUbahHarga = z.object({
  hargaJual: uang,
  hargaBeli: uang.default(0),
});

export type MasukanUbahHarga = z.infer<typeof skemaUbahHarga>;

// ---------------------------------------------------------------------------
// Validasi baris CSV (impor data master)
// ---------------------------------------------------------------------------

export type BarangImpor = {
  kodeBarcode: string | null;
  namaBarang: string;
  idLini: number;
  tipe: TipeItem;
  satuan: string;
  hargaJualAktif: number;
  hargaBeliTerakhir: number;
  stokMinimum: number;
  stokAwal: number;
  favorit: boolean;
  cepatRusak: boolean;
};

export type HasilValidasiBaris =
  | { ok: true; data: BarangImpor }
  | { ok: false; galat: string[] };

function angkaBulat(raw: string | undefined): number | null {
  const s = (raw ?? "").trim();
  if (s === "" || !/^\d+$/.test(s)) return null;
  return Number(s);
}

function angkaDesimal(raw: string | undefined): number | null {
  const s = (raw ?? "").trim();
  if (s === "" || !/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

function yaTidak(raw: string | undefined): boolean {
  const s = (raw ?? "").trim().toLowerCase();
  return s === "ya" || s === "true" || s === "1" || s === "y";
}

/**
 * Validasi satu baris CSV. Urutan kolom tidak penting (dibaca per nama header).
 * Kembalikan daftar pesan galat bila ada.
 */
export function validasiBarisBarang(
  row: Record<string, string>,
  petaLini: Record<string, number>,
): HasilValidasiBaris {
  const galat: string[] = [];

  const namaBarang = (row.nama_barang ?? "").trim();
  if (!namaBarang) galat.push("nama_barang kosong");

  const barcodeRaw = (row.kode_barcode ?? "").trim();
  // PENTING: Pertahankan nol di depan pada barcode (mis. 0899...)
  // Barcode selalu disimpan sebagai string, bukan angka
  const kodeBarcode = barcodeRaw === "" ? null : barcodeRaw;

  const liniRaw = (row.lini ?? "").trim().toLowerCase();
  const idLini = Object.prototype.hasOwnProperty.call(petaLini, liniRaw)
    ? petaLini[liniRaw]
    : undefined;
  if (!liniRaw) galat.push("lini kosong");
  else if (idLini === undefined) galat.push(`lini tidak dikenal: "${row.lini}"`);

  const tipeRaw = (row.tipe ?? "barang").trim().toLowerCase();
  if (tipeRaw !== "barang" && tipeRaw !== "jasa") {
    galat.push(`tipe tidak dikenal: "${row.tipe}"`);
  }

  const satuan = (row.satuan ?? "").trim().toLowerCase();
  if (!satuan) galat.push("satuan kosong");
  else if (!(SATUAN_DIKENAL as readonly string[]).includes(satuan)) {
    galat.push(`satuan tidak dikenal: "${row.satuan}"`);
  }

  const hargaJualAktif = angkaBulat(row.harga_jual_aktif);
  if (hargaJualAktif === null) {
    galat.push(
      (row.harga_jual_aktif ?? "").trim() === ""
        ? "harga_jual_aktif kosong"
        : `harga_jual_aktif tidak valid: "${row.harga_jual_aktif}"`,
    );
  }

  const hargaBeliTerakhir = (row.harga_beli_terakhir ?? "").trim() === ""
    ? 0
    : angkaBulat(row.harga_beli_terakhir);
  if (hargaBeliTerakhir === null) {
    galat.push(`harga_beli_terakhir tidak valid: "${row.harga_beli_terakhir}"`);
  }

  const stokMinimum = (row.stok_minimum ?? "").trim() === "" ? 0 : angkaDesimal(row.stok_minimum);
  if (stokMinimum === null) galat.push(`stok_minimum tidak valid: "${row.stok_minimum}"`);

  const stokAwal = (row.stok_awal ?? "").trim() === "" ? 0 : angkaDesimal(row.stok_awal);
  if (stokAwal === null) galat.push(`stok_awal tidak valid: "${row.stok_awal}"`);

  if (galat.length > 0) return { ok: false, galat };

  return {
    ok: true,
    data: {
      kodeBarcode,
      namaBarang,
      idLini: idLini as number,
      tipe: tipeRaw as TipeItem,
      satuan,
      hargaJualAktif: hargaJualAktif as number,
      hargaBeliTerakhir: hargaBeliTerakhir as number,
      stokMinimum: stokMinimum as number,
      stokAwal: stokAwal as number,
      favorit: yaTidak(row.favorit),
      cepatRusak: yaTidak(row.cepat_rusak),
    },
  };
}

/** Kembalikan himpunan barcode yang muncul lebih dari sekali (barcode wajib unik). */
export function cariBarcodeDuplikat(rows: Record<string, string>[]): Set<string> {
  const hitung = new Map<string, number>();
  for (const row of rows) {
    // PENTING: Pertahankan nol di depan, simpan sebagai string
    const barcode = (row.kode_barcode ?? "").trim();
    if (barcode === "") continue;
    hitung.set(barcode, (hitung.get(barcode) ?? 0) + 1);
  }
  const duplikat = new Set<string>();
  for (const [barcode, jumlah] of hitung) {
    if (jumlah > 1) duplikat.add(barcode);
  }
  return duplikat;
}
