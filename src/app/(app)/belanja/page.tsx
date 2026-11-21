"use client";

import { useEffect, useState } from "react";
import Ikon from "@/components/Ikon";

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
      <div className="flex items-center gap-2">
        <Ikon nama="belanja" className="h-6 w-6 text-emerald-700" />
        <h1 className="text-xl font-bold">Daftar Belanja</h1>
      </div>
      <p className="text-sm text-zinc-500">
        Barang yang stoknya sudah mencapai atau di bawah stok minimum.
      </p>

      {memuat && <p className="text-sm text-zinc-500">Memuat…</p>}
      {galat && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
          {galat}
        </p>
      )}

      {!memuat && !galat && daftar.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm">
          Semua stok masih di atas minimum.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {daftar.map((b) => (
          <li
            key={b.idBarang}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Ikon nama="barang" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{b.namaBarang}</p>
                <p className="text-xs text-zinc-500">{b.namaLini}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm sm:items-end sm:text-right">
              <p className="text-zinc-600">
                stok {b.stokTotal} / min {b.stokMinimum} {b.satuan}
              </p>
              {b.kekurangan > 0 && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                  <Ikon nama="peringatan" className="h-3.5 w-3.5" />
                  kurang {b.kekurangan} {b.satuan}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
