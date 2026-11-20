"use client";

import { useEffect, useState } from "react";

/**
 * Notifikasi (F10 / FR-08, BR-04): stok ≤ minimum, hampir kedaluwarsa,
 * kasbon jatuh tempo. Kartu berwarna + ikon + label agar mudah dipindai.
 */

type StokRendah = {
  idBarang: number;
  namaBarang: string;
  satuan: string;
  stokMinimum: number;
  stokTotal: number;
};

type HampirKedaluwarsa = {
  idBatch: number;
  idBarang: number;
  namaBarang: string;
  satuan: string;
  jumlahSisa: number;
  tglKedaluwarsa: string | null;
};

type KasbonJatuhTempo = {
  idPiutang: number;
  namaPelanggan: string;
  noHp: string | null;
  saldo: number;
  jatuhTempo: string;
  status: string;
};

type DataNotifikasi = {
  hariIni: string;
  ambangKedaluwarsaHari: number;
  stokRendah: StokRendah[];
  hampirKedaluwarsa: HampirKedaluwarsa[];
  kasbonJatuhTempo: KasbonJatuhTempo[];
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function HalamanNotifikasi() {
  const [data, setData] = useState<DataNotifikasi | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/notifikasi")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as DataNotifikasi;
      })
      .then((d) => {
        if (!batal) setData(d);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat notifikasi.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  if (memuat) return <p className="text-sm text-zinc-500">Memuat…</p>;
  if (galat) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>;
  if (!data) return null;

  const totalPeringatan =
    data.stokRendah.length + data.hampirKedaluwarsa.length + data.kasbonJatuhTempo.length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Notifikasi</h1>
      <p className="text-sm text-zinc-500">
        Per {data.hariIni} · {totalPeringatan} peringatan
      </p>

      <Kartu
        warna="border-amber-300 bg-amber-50"
        warnaJudul="text-amber-800"
        judul="Stok Menipis"
        jumlah={data.stokRendah.length}
      >
        {data.stokRendah.map((b) => (
          <ItemBaris
            key={b.idBarang}
            kiri={b.namaBarang}
            kanan={`sisa ${b.stokTotal} / min ${b.stokMinimum} ${b.satuan}`}
          />
        ))}
      </Kartu>

      <Kartu
        warna="border-red-300 bg-red-50"
        warnaJudul="text-red-800"
        judul={`Hampir Kedaluwarsa (≤ ${data.ambangKedaluwarsaHari} hari)`}
        jumlah={data.hampirKedaluwarsa.length}
      >
        {data.hampirKedaluwarsa.map((b) => (
          <ItemBaris
            key={b.idBatch}
            kiri={b.namaBarang}
            kanan={`exp ${b.tglKedaluwarsa ?? "—"} · ${b.jumlahSisa} ${b.satuan}`}
          />
        ))}
      </Kartu>

      <Kartu
        warna="border-sky-300 bg-sky-50"
        warnaJudul="text-sky-800"
        judul="Kasbon Jatuh Tempo"
        jumlah={data.kasbonJatuhTempo.length}
      >
        {data.kasbonJatuhTempo.map((k) => (
          <ItemBaris
            key={k.idPiutang}
            kiri={`${k.namaPelanggan}${k.noHp ? ` · ${k.noHp}` : ""}`}
            kanan={`jatuh tempo ${k.jatuhTempo} · ${rupiah.format(k.saldo)}`}
          />
        ))}
      </Kartu>

      {totalPeringatan === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Tidak ada peringatan. Semua aman.
        </p>
      )}
    </div>
  );
}

function Kartu({
  warna,
  warnaJudul,
  judul,
  jumlah,
  children,
}: {
  warna: string;
  warnaJudul: string;
  judul: string;
  jumlah: number;
  children: React.ReactNode;
}) {
  if (jumlah === 0) return null;
  return (
    <section className={`rounded-xl border p-4 ${warna}`}>
      <div className="flex items-center gap-2">
        <IkonPeringatan />
        <h2 className={`font-semibold ${warnaJudul}`}>
          {judul} ({jumlah})
        </h2>
      </div>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function ItemBaris({ kiri, kanan }: { kiri: string; kanan: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-1 rounded-lg bg-white/70 px-3 py-2 text-sm">
      <span className="font-medium text-zinc-800">{kiri}</span>
      <span className="text-zinc-600">{kanan}</span>
    </li>
  );
}

function IkonPeringatan() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
