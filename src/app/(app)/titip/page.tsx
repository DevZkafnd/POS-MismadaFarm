"use client";

import { useEffect, useState } from "react";
import Ikon from "@/components/Ikon";
import { LABEL_STATUS_TITIP, type StatusTitip } from "@/lib/domain/titip";

/**
 * Titip jual (F17 / FR-09, BR-07).
 * Kewajiban bayar naik saat barang laku dan turun saat dibayar (lewat menu
 * Keuangan → Hutang Pemasok).
 */

type Titip = {
  idTitip: number;
  namaPemasok: string;
  namaBarang: string;
  satuan: string;
  tglTitip: string;
  jumlahTitip: number;
  jumlahLaku: number;
  hargaTitip: number;
  kewajiban: number;
  dibayar: number;
  sisaKewajiban: number;
  status: StatusTitip;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function HalamanTitip() {
  const [daftar, setDaftar] = useState<Titip[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/titip")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { titip: Titip[] };
      })
      .then((data) => {
        if (!batal) setDaftar(data.titip);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat data titip jual.");
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
        <Ikon nama="titip" className="h-6 w-6 text-emerald-700" />
        <h1 className="text-xl font-bold">Titip Jual</h1>
      </div>
      <p className="text-sm text-zinc-500">
        Barang titipan masuk lewat menu Penerimaan (jenis titipan). Kewajiban bayar naik
        otomatis saat barang laku, dan dibayar lewat menu Keuangan → Hutang Pemasok.
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
          Belum ada titip jual.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {daftar.map((t) => {
          const persen = t.jumlahTitip > 0 ? Math.min(100, (t.jumlahLaku / t.jumlahTitip) * 100) : 0;
          return (
            <li
              key={t.idTitip}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Ikon nama="titip" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">{t.namaBarang}</p>
                    <p className="text-xs text-zinc-500">
                      {t.namaPemasok} · titip {t.tglTitip}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.status === "selesai"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {LABEL_STATUS_TITIP[t.status]}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>
                    Laku {t.jumlahLaku} / {t.jumlahTitip} {t.satuan}
                  </span>
                  <span>{Math.round(persen)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${persen}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-zinc-50 px-3 py-2">
                  <p className="text-xs text-zinc-500">Kewajiban (laku × harga titip)</p>
                  <p className="font-semibold text-zinc-900">{rupiah.format(t.kewajiban)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-xs text-zinc-500">Sisa belum dibayar</p>
                  <p className="font-semibold text-amber-900">{rupiah.format(t.sisaKewajiban)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
