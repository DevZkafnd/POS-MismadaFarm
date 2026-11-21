"use client";

import { useCallback, useEffect, useState } from "react";
import Ikon from "@/components/Ikon";
import { PERAN, type NamaPeran } from "@/lib/auth/peran";

type Barang = {
  idBarang: number;
  kodeBarcode: string | null;
  namaBarang: string;
  namaLini: string;
  tipe: string;
  satuan: string;
  hargaJualAktif: number;
  hargaBeliTerakhir: number | null;
  stokMinimum: number;
  stokTotal: number;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function HalamanBarang() {
  const [peran, setPeran] = useState<NamaPeran | null>(null);
  const [q, setQ] = useState("");
  const [barang, setBarang] = useState<Barang[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [diubah, setDiubah] = useState<Barang | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { pengguna: { peran: NamaPeran } };
        setPeran(data.pengguna.peran);
      })
      .catch(() => undefined);
  }, []);

  const cari = useCallback(async (kata: string) => {
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/barang?q=${encodeURIComponent(kata)}&limit=100`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal memuat data barang.");
        return;
      }
      const data = (await res.json()) as { barang: Barang[] };
      setBarang(data.barang);
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void cari(q), 300);
    return () => clearTimeout(timer);
  }, [q, cari]);

  const bolehUbahHarga = peran === PERAN.PENERUS_USAHA;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Ikon nama="barang" className="h-6 w-6" />
        Data Barang
      </h1>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama atau barcode…"
        className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
      />

      {galat && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
          {galat}
        </p>
      )}

      <p className="text-sm text-zinc-500">
        {memuat ? "Memuat…" : `${barang.length} barang ditemukan`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-emerald-50 text-emerald-900">
            <tr>
              <th className="px-3 py-3 font-semibold">Nama</th>
              <th className="px-3 py-3 font-semibold">Lini</th>
              <th className="px-3 py-3 font-semibold">Stok</th>
              <th className="px-3 py-3 font-semibold">Harga Jual</th>
              <th className="px-3 py-3 font-semibold">Harga Beli</th>
              {bolehUbahHarga && <th className="px-3 py-3 font-semibold">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {barang.map((b) => (
              <tr key={b.idBarang} className="border-t border-zinc-100">
                <td className="px-3 py-3">
                  <span className="font-medium text-zinc-900">{b.namaBarang}</span>
                  {b.tipe === "jasa" && (
                    <span className="ml-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 align-middle text-xs font-medium text-amber-900">
                      jasa
                    </span>
                  )}
                  {b.kodeBarcode && (
                    <span className="block text-xs text-zinc-500">{b.kodeBarcode}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-zinc-600">{b.namaLini}</td>
                <td className="px-3 py-3">
                  {b.tipe === "jasa" ? "—" : `${b.stokTotal} ${b.satuan}`}
                </td>
                <td className="px-3 py-3 font-medium">{rupiah.format(b.hargaJualAktif)}</td>
                <td className="px-3 py-3 text-zinc-600">
                  {b.hargaBeliTerakhir === null ? "—" : rupiah.format(b.hargaBeliTerakhir)}
                </td>
                {bolehUbahHarga && (
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setDiubah(b)}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      <Ikon nama="barang" className="h-4 w-4" />
                      Ubah Harga
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {barang.length === 0 && !memuat && (
              <tr>
                <td colSpan={bolehUbahHarga ? 6 : 5} className="px-3 py-8 text-center text-zinc-500">
                  Tidak ada barang.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {diubah && (
        <DialogUbahHarga
          barang={diubah}
          onTutup={() => setDiubah(null)}
          onSukses={() => {
            setDiubah(null);
            void cari(q);
          }}
        />
      )}
    </div>
  );
}

function DialogUbahHarga({
  barang,
  onTutup,
  onSukses,
}: {
  barang: Barang;
  onTutup: () => void;
  onSukses: () => void;
}) {
  const [hargaJual, setHargaJual] = useState(String(barang.hargaJualAktif));
  const [hargaBeli, setHargaBeli] = useState(
    barang.hargaBeliTerakhir === null ? "0" : String(barang.hargaBeliTerakhir),
  );
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function simpan() {
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/barang/${barang.idBarang}/harga`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hargaJual: Number(hargaJual),
          hargaBeli: Number(hargaBeli),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan harga.");
        return;
      }
      onSukses();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Ikon nama="barang" className="h-5 w-5" />
          Ubah Harga
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{barang.namaBarang}</p>

        <label className="mt-4 block text-sm font-medium text-zinc-700">Harga Jual (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={hargaJual}
          onChange={(e) => setHargaJual(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
        />

        <label className="mt-3 block text-sm font-medium text-zinc-700">Harga Beli (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={hargaBeli}
          onChange={(e) => setHargaBeli(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
        />

        {galat && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700">
            <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
            {galat}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onTutup}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Ikon nama="tutup" className="h-4 w-4" />
            Batal
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={memuat}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Ikon nama="centang" className="h-4 w-4" />
            {memuat ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
