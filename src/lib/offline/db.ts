import Dexie, { type Table } from "dexie";
import type { ItemAntrean } from "./tipe";

/**
 * Basis data lokal (IndexedDB via Dexie) untuk antrean transaksi offline (F19).
 * Hanya tersedia di peramban; helper mengembalikan null saat SSR.
 */
class BasisAntrean extends Dexie {
  antrean!: Table<ItemAntrean, string>;

  constructor() {
    super("mismada_antrean");
    this.version(1).stores({ antrean: "id, status, dibuatPada" });
  }
}

let instans: BasisAntrean | null = null;

export function dbAntrean(): BasisAntrean | null {
  if (typeof indexedDB === "undefined") return null;
  if (!instans) instans = new BasisAntrean();
  return instans;
}
