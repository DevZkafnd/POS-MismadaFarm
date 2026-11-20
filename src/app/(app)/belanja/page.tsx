"use client";

import { useEffect, useState } from "react";

/**
 * Daftar belanja (F20): barang dengan stok ≤ minimum.
 * Bantuan sederhana agar stok barang penting tidak habis.
 */

type Belanja = {
  idBarang: number;
  namaBarang: string;
  namaLini: string;
  satuan: string;
  stokMinimum: number;
  stokTotal: number;
  kekurangan: number;
};

export default function HalamanBelanja() {
  const [daftar, setDaftar] = useState<Belanja[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/belanja")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { belanja: Belanja[] };
      })
      .then((data) => {
        if (!batal) setDaftar(data.belanja);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar belanja.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Daftar Belanja</h1>
      <p className="text-sm text-zinc-500">
        Barang yang stoknya sudah mencapai atau di bawah stok minimum.
      </p>

      {memuat && <p className="text-sm text-zinc-500">Memuat…</p>}
      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}

      {!memuat && !galat && daftar.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Semua stok masih di atas minimum.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {daftar.map((b) => (
          <li
            key={b.idBarang}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{b.namaBarang}</p>
              <p className="text-xs text-zinc-500">{b.namaLini}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-zinc-600">
                stok {b.stokTotal} / min {b.stokMinimum} {b.satuan}
              </p>
              {b.kekurangan > 0 && (
                <p className="font-semibold text-amber-700">
                  kurang {b.kekurangan} {b.satuan}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
