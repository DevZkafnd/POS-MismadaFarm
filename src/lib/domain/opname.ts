/**
 * Logika bisnis stok opname (F16 / FR-11, BR-08) — fungsi murni tanpa akses
 * basis data.
 *
 * Aturan yang dipenuhi:
 * - BR-08: stok baru berubah SETELAH disetujui penerus usaha; alasan selisih
 *   wajib diisi bila ada perbedaan antara stok sistem dan stok fisik.
 */

export const STATUS_OPNAME = ["menunggu", "disetujui"] as const;
export type StatusOpname = (typeof STATUS_OPNAME)[number];

export const LABEL_STATUS_OPNAME: Record<StatusOpname, string> = {
  menunggu: "Menunggu persetujuan",
  disetujui: "Disetujui",
};

/** Bulatkan ke 3 desimal (skala kolom `numeric(12,3)`) menahan galat float. */
export function bulatTiga(nilai: number): number {
  return Math.round(nilai * 1000) / 1000;
}

export type BarisOpname = {
  idBarang: number;
  stokSistem: number;
  stokFisik: number;
  alasan: string | null;
};

/** Selisih = stok fisik − stok sistem; positif berarti fisik lebih banyak. */
export function hitungSelisihOpname(stokSistem: number, stokFisik: number): number {
  return bulatTiga(stokFisik - stokSistem);
}

/** Selisih tidak nol wajib diberi alasan (BR-08). */
export function perluAlasan(selisih: number): boolean {
  return bulatTiga(selisih) !== 0;
}

/**
 * Cek seluruh baris: setiap baris yang berselisih harus punya alasan terisi.
 * Dipakai sebelum membuat maupun menyetujui opname.
 */
export function semuaAlasanLengkap(items: BarisOpname[]): boolean {
  return items.every((i) => {
    const selisih = hitungSelisihOpname(i.stokSistem, i.stokFisik);
    return !perluAlasan(selisih) || (i.alasan?.trim() ?? "") !== "";
  });
}

export type RingkasOpname = {
  totalBaris: number;
  barisBerselisih: number;
  totalSelisih: number;
};

export function ringkasOpname(items: BarisOpname[]): RingkasOpname {
  const selisih = items.map((i) => hitungSelisihOpname(i.stokSistem, i.stokFisik));
  return {
    totalBaris: items.length,
    barisBerselisih: selisih.filter((s) => s !== 0).length,
    totalSelisih: bulatTiga(selisih.reduce((t, s) => t + s, 0)),
  };
}
