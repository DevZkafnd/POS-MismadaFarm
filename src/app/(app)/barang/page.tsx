"use client";

import { useCallback, useEffect, useState } from "react";
import Ikon from "@/components/Ikon";
import PemindaiBarcode from "@/components/PemindaiBarcode";
import { PERAN, type NamaPeran } from "@/lib/auth/peran";

type Barang = {
  idBarang: number;
  kodeBarcode: string | null;
  namaBarang: string;
  namaLini: string;
  idLini: number;
  tipe: string;
  satuan: string;
  hargaJualAktif: number;
  hargaBeliTerakhir: number | null;
  stokMinimum: number;
  favorit: boolean;
  cepatRusak: boolean;
  stokTotal: number;
};

type Lini = { idLini: number; namaLini: string };

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
  const [tambahBaru, setTambahBaru] = useState(false);

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
  const bolehTambah = peran === PERAN.PEMILIK || peran === PERAN.PENERUS_USAHA;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Ikon nama="barang" className="h-6 w-6" />
          Data Barang
        </h1>
        {bolehTambah && (
          <button
            type="button"
            onClick={() => setTambahBaru(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Ikon nama="tambah" className="h-4 w-4" />
            Tambah Barang
          </button>
        )}
      </div>

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

      {tambahBaru && (
        <DialogTambahBarang
          onTutup={() => setTambahBaru(false)}
          onSukses={() => {
            setTambahBaru(false);
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

function DialogTambahBarang({
  onTutup,
  onSukses,
}: {
  onTutup: () => void;
  onSukses: () => void;
}) {
  const [lini, setLini] = useState<Lini[]>([]);
  const [kodeBarcode, setKodeBarcode] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [idLini, setIdLini] = useState<number | "">("");
  const [tipe, setTipe] = useState<"barang" | "jasa">("barang");
  const [satuan, setSatuan] = useState("pcs");
  const [hargaJual, setHargaJual] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [stokMinimum, setStokMinimum] = useState("0");
  const [stokAwal, setStokAwal] = useState("0");
  const [favorit, setFavorit] = useState(false);
  const [cepatRusak, setCepatRusak] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [bukaScanner, setBukaScanner] = useState(false);

  useEffect(() => {
    fetch("/api/lini")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { lini: Lini[] };
        setLini(data.lini);
        if (data.lini.length > 0) setIdLini(data.lini[0].idLini);
      })
      .catch(() => setGalat("Gagal memuat daftar lini usaha."));
  }, []);

  async function simpan() {
    if (!namaBarang.trim()) return setGalat("Nama barang wajib diisi.");
    if (!idLini) return setGalat("Lini usaha wajib dipilih.");
    if (!satuan.trim()) return setGalat("Satuan wajib diisi.");

    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch("/api/barang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeBarcode: kodeBarcode.trim() || null,
          namaBarang: namaBarang.trim(),
          idLini,
          tipe,
          satuan: satuan.trim(),
          hargaJualAktif: Number(hargaJual) || 0,
          hargaBeliTerakhir: Number(hargaBeli) || 0,
          stokMinimum: Number(stokMinimum) || 0,
          favorit,
          cepatRusak,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menambah barang.");
        return;
      }
      
      // Jika barang (bukan jasa), tambahkan stok awal
      if (tipe === "barang" && Number(stokAwal) > 0) {
        const dataBarang = (await res.json()) as { barang: { idBarang: number } };
        await fetch("/api/penerimaan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idPemasok: null,
            tanggalPenerimaan: new Date().toISOString().split("T")[0],
            metode: "tunai",
            items: [{
              idBarang: dataBarang.barang.idBarang,
              jumlah: Number(stokAwal),
              hargaBeli: Number(hargaBeli) || 0,
              tanggalKadaluwarsa: null,
            }],
          }),
        });
      }
      
      onSukses();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Ikon nama="barang" className="h-5 w-5" />
            Tambah Barang Baru
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Barcode (opsional)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={kodeBarcode}
                  onChange={(e) => setKodeBarcode(e.target.value)}
                  placeholder="EAN-13, QR, atau kosongkan"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setBukaScanner(true)}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <Ikon nama="pindai" className="h-4 w-4" />
                  Scan
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Scan barcode untuk mengisi otomatis, atau ketik manual
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Nama Barang *</label>
              <input
                type="text"
                value={namaBarang}
                onChange={(e) => setNamaBarang(e.target.value)}
                placeholder="Beras Premium 5kg"
                className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Lini Usaha *</label>
                <select
                  value={idLini}
                  onChange={(e) => setIdLini(Number(e.target.value))}
                  className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                >
                  {lini.map((l) => (
                    <option key={l.idLini} value={l.idLini}>
                      {l.namaLini}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Tipe *</label>
                <select
                  value={tipe}
                  onChange={(e) => setTipe(e.target.value as "barang" | "jasa")}
                  className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                >
                  <option value="barang">Barang</option>
                  <option value="jasa">Jasa</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Satuan *</label>
              <input
                type="text"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                placeholder="pcs, kg, liter, dll"
                className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Harga Jual (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={hargaJual}
                  onChange={(e) => setHargaJual(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">Harga Beli (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={hargaBeli}
                  onChange={(e) => setHargaBeli(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                />
              </div>
            </div>

            {tipe === "barang" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Stok Minimum</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={stokMinimum}
                    onChange={(e) => setStokMinimum(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Stok Awal</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.1"
                    value={stokAwal}
                    onChange={(e) => setStokAwal(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={favorit}
                  onChange={(e) => setFavorit(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                />
                <span className="text-sm text-zinc-700">Barang Favorit</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cepatRusak}
                  onChange={(e) => setCepatRusak(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                />
                <span className="text-sm text-zinc-700">Cepat Rusak</span>
              </label>
            </div>

            {galat && (
              <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
                {galat}
              </p>
            )}

            <div className="flex gap-2">
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
      </div>

      {bukaScanner && (
        <PemindaiBarcode
          onTutup={() => setBukaScanner(false)}
          onHasil={(kode) => {
            setKodeBarcode(kode);
            setBukaScanner(false);
          }}
        />
      )}
    </>
  );
}
