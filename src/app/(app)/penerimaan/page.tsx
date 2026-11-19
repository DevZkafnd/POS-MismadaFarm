"use client";

import { useEffect, useMemo, useState } from "react";
import { JENIS_PENERIMAAN, type JenisPenerimaan } from "@/lib/validasi/penerimaan";

type Pemasok = { idPemasok: number; nama: string; noHp: string | null };

type Barang = {
  idBarang: number;
  kodeBarcode: string | null;
  namaBarang: string;
  tipe: string;
  satuan: string;
  hargaBeliTerakhir: number | null;
};

type ItemTerima = {
  kunci: string;
  idBarang: number;
  namaItem: string;
  satuan: string;
  tipe: string;
  jumlah: number;
  hargaBeli: number;
  tglKedaluwarsa: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const LABEL_JENIS: Record<JenisPenerimaan, string> = {
  tunai: "Tunai",
  kredit: "Kredit",
  titipan: "Titipan",
};

export default function HalamanPenerimaan() {
  const [pemasok, setPemasok] = useState<Pemasok[]>([]);
  const [idPemasok, setIdPemasok] = useState<number | "">("");
  const [jenis, setJenis] = useState<JenisPenerimaan>("tunai");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [items, setItems] = useState<ItemTerima[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [versiPemasok, setVersiPemasok] = useState(0);

  const total = useMemo(
    () => items.reduce((t, i) => t + Math.round(i.hargaBeli * i.jumlah), 0),
    [items],
  );

  useEffect(() => {
    let batal = false;
    fetch("/api/pemasok")
      .then((res) => res.json())
      .then((data: { pemasok?: Pemasok[] }) => {
        if (batal) return;
        setPemasok(data.pemasok ?? []);
        if (data.pemasok && data.pemasok.length > 0) setIdPemasok(data.pemasok[0].idPemasok);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar pemasok.");
      });
    return () => {
      batal = true;
    };
  }, [versiPemasok]);

  function tambahBarang(b: Barang) {
    setItems((lama) => {
      if (lama.some((i) => i.idBarang === b.idBarang)) return lama;
      return [
        ...lama,
        {
          kunci: String(b.idBarang),
          idBarang: b.idBarang,
          namaItem: b.namaBarang,
          satuan: b.satuan,
          tipe: b.tipe,
          jumlah: 1,
          hargaBeli: b.hargaBeliTerakhir ?? 0,
          tglKedaluwarsa: "",
        },
      ];
    });
  }

  function ubahItem(kunci: string, perubahan: Partial<ItemTerima>) {
    setItems((lama) => lama.map((i) => (i.kunci === kunci ? { ...i, ...perubahan } : i)));
  }

  async function simpan() {
    if (!idPemasok) return setGalat("Pilih pemasok dulu.");
    if (items.length === 0) return setGalat("Tambahkan minimal satu barang.");
    setMemuat(true);
    setGalat(null);
    setSukses(null);
    try {
      const res = await fetch("/api/penerimaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPemasok,
          jenis,
          jatuhTempo: jenis === "kredit" && jatuhTempo ? jatuhTempo : null,
          items: items.map((i) => ({
            idBarang: i.idBarang,
            jumlah: i.jumlah,
            hargaBeli: i.hargaBeli,
            tglKedaluwarsa: i.tglKedaluwarsa || null,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan penerimaan.");
        return;
      }
      const data = (await res.json()) as { idPenerimaan: number; total: number };
      setSukses(`Penerimaan #${data.idPenerimaan} tersimpan. Total ${rupiah.format(data.total)}.`);
      setItems([]);
      setJatuhTempo("");
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Penerimaan Barang</h1>

      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
      {sukses && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{sukses}</p>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="text-sm font-medium">Pemasok</label>
        <select
          value={idPemasok}
          onChange={(e) => setIdPemasok(Number(e.target.value))}
          className="min-h-12 rounded-xl border border-zinc-300 bg-white px-3"
        >
          {pemasok.length === 0 && <option value="">Belum ada pemasok</option>}
          {pemasok.map((p) => (
            <option key={p.idPemasok} value={p.idPemasok}>
              {p.nama}
            </option>
          ))}
        </select>

        <FormPemasokBaru onSelesai={() => setVersiPemasok((v) => v + 1)} />

        <label className="mt-2 text-sm font-medium">Jenis penerimaan</label>
        <div className="grid grid-cols-3 gap-2">
          {JENIS_PENERIMAAN.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => setJenis(j)}
              className={`min-h-12 rounded-xl border text-sm font-medium ${
                jenis === j
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {LABEL_JENIS[j]}
            </button>
          ))}
        </div>

        {jenis === "kredit" && (
          <>
            <label className="text-sm font-medium">Jatuh tempo (opsional)</label>
            <input
              type="date"
              value={jatuhTempo}
              onChange={(e) => setJatuhTempo(e.target.value)}
              className="min-h-12 rounded-xl border border-zinc-300 px-3"
            />
          </>
        )}
      </section>

      <CariBarang onPilih={tambahBarang} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Daftar barang diterima</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Belum ada barang.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((i) => (
              <li key={i.kunci} className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-start justify-between">
                  <p className="font-medium">
                    {i.namaItem}{" "}
                    <span className="text-xs text-zinc-500">({i.satuan})</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setItems((lama) => lama.filter((x) => x.kunci !== i.kunci))}
                    className="min-h-9 rounded-lg px-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-zinc-500">Jumlah</label>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={i.jumlah}
                      onChange={(e) => ubahItem(i.kunci, { jumlah: Number(e.target.value) })}
                      className="min-h-11 rounded-lg border border-zinc-300 px-2"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-zinc-500">Harga beli</label>
                    <input
                      type="number"
                      min={0}
                      value={i.hargaBeli}
                      onChange={(e) => ubahItem(i.kunci, { hargaBeli: Number(e.target.value) })}
                      className="min-h-11 rounded-lg border border-zinc-300 px-2"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-zinc-500">Kedaluwarsa</label>
                    <input
                      type="date"
                      value={i.tglKedaluwarsa}
                      onChange={(e) => ubahItem(i.kunci, { tglKedaluwarsa: e.target.value })}
                      className="min-h-11 rounded-lg border border-zinc-300 px-2"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <p className="text-sm text-zinc-500">Total</p>
          <p className="text-xl font-bold">{rupiah.format(total)}</p>
        </div>
        <button
          type="button"
          onClick={simpan}
          disabled={memuat || items.length === 0}
          className="min-h-14 rounded-xl bg-emerald-600 px-6 font-semibold text-white disabled:opacity-50"
        >
          {memuat ? "Menyimpan…" : "Simpan Penerimaan"}
        </button>
      </div>
    </div>
  );
}

function CariBarang({ onPilih }: { onPilih: (b: Barang) => void }) {
  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<Barang[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/barang?q=${encodeURIComponent(q.trim())}&limit=20`);
        const data = (await res.json()) as { barang: Barang[] };
        setHasil(data.barang);
      } catch {
        setHasil([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <section className="flex flex-col gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari barang untuk diterima…"
        className="min-h-12 rounded-xl border border-zinc-300 bg-white px-4"
      />
      <div className="flex flex-col gap-1">
        {hasil.slice(0, 6).map((b) => (
          <button
            key={b.idBarang}
            type="button"
            onClick={() => onPilih(b)}
            className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm hover:border-emerald-500"
          >
            <span>{b.namaBarang}</span>
            <span className="text-xs text-zinc-500">
              beli terakhir {b.hargaBeliTerakhir === null ? "—" : rupiah.format(b.hargaBeliTerakhir)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FormPemasokBaru({ onSelesai }: { onSelesai: () => void }) {
  const [buka, setBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function simpan() {
    if (!nama.trim()) return setGalat("Nama pemasok wajib diisi.");
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch("/api/pemasok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, noHp }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menambah pemasok.");
        return;
      }
      setNama("");
      setNoHp("");
      setBuka(false);
      onSelesai();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="min-h-11 self-start rounded-lg border border-emerald-600 px-4 text-sm font-medium text-emerald-700"
      >
        + Tambah pemasok baru
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama pemasok"
        className="min-h-11 rounded-lg border border-zinc-300 px-3"
      />
      <input
        value={noHp}
        onChange={(e) => setNoHp(e.target.value)}
        placeholder="No. HP (opsional)"
        className="min-h-11 rounded-lg border border-zinc-300 px-3"
      />
      {galat && <p className="text-sm text-red-700">{galat}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="min-h-11 flex-1 rounded-lg border border-zinc-300 font-medium"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={simpan}
          disabled={memuat}
          className="min-h-11 flex-1 rounded-lg bg-emerald-600 font-semibold text-white disabled:opacity-50"
        >
          {memuat ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}
