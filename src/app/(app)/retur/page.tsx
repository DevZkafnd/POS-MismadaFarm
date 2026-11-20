"use client";

import { useCallback, useEffect, useState } from "react";
import { JENIS_RETUR, LABEL_JENIS_RETUR, nilaiRetur, type JenisRetur } from "@/lib/domain/retur";

/**
 * Retur (F15 / FR-09, BR-06).
 * Retur pelanggan dinilai dari harga satuan transaksi asal; retur ke pemasok
 * dinilai dari harga beli penerimaan atau riwayat harga.
 */

type Barang = {
  idBarang: number;
  namaBarang: string;
  satuan: string;
  tipe: string;
  hargaBeliTerakhir: number | null;
};

type Sumber = {
  idDetailPenjualan?: number;
  idPenerimaan?: number;
  label: string;
  hargaSatuan?: number;
  hargaBeli?: number;
  jumlah: number;
};

type DaftarRetur = {
  idRetur: number;
  jenis: JenisRetur;
  namaBarang: string;
  satuan: string;
  jumlah: number;
  nilai: number;
  alasan: string;
  tanggal: string;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function HalamanRetur() {
  const [versi, setVersi] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Retur</h1>
      <FormRetur key={`form-${versi}`} onSukses={() => setVersi((v) => v + 1)} />
      <DaftarRetur key={`daftar-${versi}`} />
    </div>
  );
}

function FormRetur({ onSukses }: { onSukses: () => void }) {
  const [jenis, setJenis] = useState<JenisRetur>("pelanggan");
  const [barang, setBarang] = useState<Barang | null>(null);
  const [sumber, setSumber] = useState<Sumber[]>([]);
  const [idSumber, setIdSumber] = useState<string>("");
  const [jumlah, setJumlah] = useState("1");
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const muatSumber = useCallback(
    async (b: Barang, j: JenisRetur) => {
      setSumber([]);
      setIdSumber("");
      try {
        const res = await fetch(`/api/retur/sumber?jenis=${j}&idBarang=${b.idBarang}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { sumber: Sumber[] };
        setSumber(data.sumber);
        if (j === "pemasok") {
          setIdSumber(data.sumber[0] ? String(data.sumber[0].idPenerimaan) : "");
        } else if (data.sumber[0]) {
          setIdSumber(String(data.sumber[0].idDetailPenjualan));
        }
      } catch {
        setGalat("Gagal memuat data asal retur.");
      }
    },
    [],
  );

  function pilihBarang(b: Barang) {
    setBarang(b);
    setGalat(null);
    void muatSumber(b, jenis);
  }

  function gantiJenis(j: JenisRetur) {
    setJenis(j);
    if (barang) void muatSumber(barang, j);
  }

  const sumberTerpilih = sumber.find((s) =>
    jenis === "pelanggan"
      ? String(s.idDetailPenjualan) === idSumber
      : String(s.idPenerimaan ?? "") === idSumber,
  );

  const hargaSatuan =
    jenis === "pelanggan"
      ? (sumberTerpilih?.hargaSatuan ?? 0)
      : (sumberTerpilih?.hargaBeli ?? barang?.hargaBeliTerakhir ?? 0);

  const nilai = barang ? nilaiRetur(Number(jumlah || 0), hargaSatuan) : 0;

  async function simpan() {
    if (!barang) return setGalat("Pilih barang dulu.");
    if (jenis === "pelanggan" && !sumberTerpilih) return setGalat("Pilih item penjualan asal.");
    if (!(Number(jumlah) > 0)) return setGalat("Jumlah harus lebih dari 0.");
    if (!alasan.trim()) return setGalat("Alasan retur wajib diisi.");
    setMemuat(true);
    setGalat(null);
    setPesan(null);
    try {
      const res = await fetch("/api/retur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis,
          idBarang: barang.idBarang,
          jumlah: Number(jumlah),
          alasan: alasan.trim(),
          idDetailPenjualan: jenis === "pelanggan" ? sumberTerpilih?.idDetailPenjualan : null,
          idPenerimaan: jenis === "pemasok" ? (sumberTerpilih?.idPenerimaan ?? null) : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan retur.");
        return;
      }
      const data = (await res.json()) as { nilai: number };
      setPesan(`Retur tersimpan. Nilai ${rupiah.format(data.nilai)}.`);
      setBarang(null);
      setSumber([]);
      setIdSumber("");
      setJumlah("1");
      setAlasan("");
      onSukses();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {JENIS_RETUR.map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => gantiJenis(j)}
            className={`min-h-12 rounded-xl border text-sm font-medium ${
              jenis === j
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {LABEL_JENIS_RETUR[j]}
          </button>
        ))}
      </div>

      <CariBarang onPilih={pilihBarang} />

      {barang && (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div>
            <p className="font-medium">{barang.namaBarang}</p>
            <p className="text-xs text-zinc-500">satuan {barang.satuan}</p>
          </div>

          <label className="text-sm font-medium">
            {jenis === "pelanggan" ? "Item penjualan asal" : "Penerimaan asal"}
          </label>
          <select
            value={idSumber}
            onChange={(e) => setIdSumber(e.target.value)}
            className="min-h-12 rounded-xl border border-zinc-300 bg-white px-3"
          >
            {jenis === "pemasok" && <option value="">Tanpa rujukan (pakai harga beli terakhir)</option>}
            {jenis === "pelanggan" && sumber.length === 0 && (
              <option value="">Tidak ada penjualan untuk barang ini</option>
            )}
            {sumber.map((s) => (
              <option
                key={s.idDetailPenjualan ?? s.idPenerimaan}
                value={s.idDetailPenjualan ?? s.idPenerimaan}
              >
                {s.label} · {rupiah.format(s.hargaSatuan ?? s.hargaBeli ?? 0)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium">Jumlah</label>
              <input
                type="number"
                min={0}
                step="0.001"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="min-h-12 rounded-xl border border-zinc-300 px-3"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">Harga satuan</label>
              <p className="min-h-12 rounded-xl bg-zinc-100 px-3 py-3 font-medium">
                {rupiah.format(hargaSatuan)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
            <span className="text-sm text-zinc-600">Nilai retur</span>
            <span className="font-bold">{rupiah.format(nilai)}</span>
          </div>

          <label className="text-sm font-medium">Alasan retur (wajib)</label>
          <textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={2}
            placeholder="mis. barang rusak, salah kirim"
            className="rounded-xl border border-zinc-300 px-3 py-2"
          />
        </section>
      )}

      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
      {pesan && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pesan}</p>}

      <button
        type="button"
        onClick={() => void simpan()}
        disabled={memuat || !barang}
        className="min-h-14 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
      >
        {memuat ? "Menyimpan…" : "Simpan Retur"}
      </button>
    </>
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
        placeholder="Cari barang untuk diretur…"
        className="min-h-12 rounded-xl border border-zinc-300 bg-white px-4"
      />
      <div className="flex flex-col gap-1">
        {hasil
          .filter((b) => b.tipe !== "jasa")
          .slice(0, 6)
          .map((b) => (
            <button
              key={b.idBarang}
              type="button"
              onClick={() => onPilih(b)}
              className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm hover:border-emerald-500"
            >
              <span>{b.namaBarang}</span>
              <span className="text-xs text-zinc-500">satuan {b.satuan}</span>
            </button>
          ))}
      </div>
    </section>
  );
}

function DaftarRetur() {
  const [daftar, setDaftar] = useState<DaftarRetur[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/retur")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { retur: DaftarRetur[] };
      })
      .then((data) => {
        if (!batal) setDaftar(data.retur);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar retur.");
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

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Riwayat Retur</h2>
      {daftar.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Belum ada retur.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftar.map((r) => (
            <li
              key={r.idRetur}
              className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3"
            >
              <div>
                <p className="font-medium">
                  {r.namaBarang}{" "}
                  <span className="text-xs text-zinc-500">
                    {LABEL_JENIS_RETUR[r.jenis]}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  {r.jumlah} {r.satuan} · {r.tanggal} · {r.alasan}
                </p>
              </div>
              <span className="font-semibold">{rupiah.format(r.nilai)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
