"use client";

import { useCallback, useEffect, useState } from "react";
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
      <h1 className="text-xl font-bold">Data Barang</h1>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama atau barcode…"
        className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base"
      />

      {galat && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>
      )}

      <p className="text-sm text-zinc-500">
        {memuat ? "Memuat…" : `${barang.length} barang ditemukan`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Nama</th>
              <th className="px-3 py-2 font-medium">Lini</th>
              <th className="px-3 py-2 font-medium">Stok</th>
              <th className="px-3 py-2 font-medium">Harga Jual</th>
              <th className="px-3 py-2 font-medium">Harga Beli</th>
              {bolehUbahHarga && <th className="px-3 py-2 font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {barang.map((b) => (
              <tr key={b.idBarang} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  <span className="font-medium">{b.namaBarang}</span>
                  {b.tipe === "jasa" && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      jasa
                    </span>
                  )}
                  {b.kodeBarcode && (
                    <span className="block text-xs text-zinc-400">{b.kodeBarcode}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-600">{b.namaLini}</td>
                <td className="px-3 py-2">
                  {b.tipe === "jasa" ? "—" : `${b.stokTotal} ${b.satuan}`}
                </td>
                <td className="px-3 py-2">{rupiah.format(b.hargaJualAktif)}</td>
                <td className="px-3 py-2 text-zinc-600">
                  {b.hargaBeliTerakhir === null ? "—" : rupiah.format(b.hargaBeliTerakhir)}
                </td>
                {bolehUbahHarga && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setDiubah(b)}
                      className="min-h-9 rounded-lg border border-emerald-600 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Ubah Harga
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {barang.length === 0 && !memuat && (
              <tr>
                <td colSpan={bolehUbahHarga ? 6 : 5} className="px-3 py-6 text-center text-zinc-500">
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
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="text-lg font-bold">Ubah Harga</h2>
        <p className="mt-1 text-sm text-zinc-500">{barang.namaBarang}</p>

        <label className="mt-4 block text-sm font-medium">Harga Jual (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={hargaJual}
          onChange={(e) => setHargaJual(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-base"
        />

        <label className="mt-3 block text-sm font-medium">Harga Beli (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={hargaBeli}
          onChange={(e) => setHargaBeli(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-base"
        />

        {galat && <p className="mt-3 text-sm text-red-700">{galat}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onTutup}
            className="min-h-12 flex-1 rounded-xl border border-zinc-300 font-medium"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={memuat}
            className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
          >
            {memuat ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
