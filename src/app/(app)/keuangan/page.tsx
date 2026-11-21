"use client";

import { useEffect, useState } from "react";
import Ikon from "@/components/Ikon";

/**
 * Halaman Keuangan (F14 pengeluaran + F18 hutang pemasok).
 * Hanya pemilik / penerus usaha yang boleh membuka (Tabel 4.10).
 */

type Lini = { idLini: number; namaLini: string };

type Pengeluaran = {
  idPengeluaran: number;
  idLini: number;
  namaLini: string;
  kategori: string;
  jumlah: number;
  tanggal: string;
};

type StatusHutang = "belum" | "sebagian" | "lunas";

type Hutang = {
  idHutang: number;
  idPemasok: number;
  namaPemasok: string;
  idPenerimaan: number | null;
  idTitip: number | null;
  saldo: number;
  jatuhTempo: string | null;
  status: StatusHutang;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const LABEL_STATUS: Record<StatusHutang, string> = {
  belum: "Belum bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
};

const WARNA_STATUS: Record<StatusHutang, string> = {
  belum: "bg-red-50 text-red-700",
  sebagian: "bg-amber-50 text-amber-700",
  lunas: "bg-emerald-50 text-emerald-700",
};

type Tab = "pengeluaran" | "hutang";

export default function HalamanKeuangan() {
  const [tab, setTab] = useState<Tab>("pengeluaran");
  const [versi, setVersi] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Keuangan</h1>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("pengeluaran")}
          className={`min-h-12 rounded-xl border px-3 text-sm font-medium ${
            tab === "pengeluaran"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700"
          }`}
        >
          Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => setTab("hutang")}
          className={`min-h-12 rounded-xl border px-3 text-sm font-medium ${
            tab === "hutang"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-zinc-300 bg-white text-zinc-700"
          }`}
        >
          Hutang Pemasok
        </button>
      </div>

      {tab === "pengeluaran" && (
        <TabPengeluaran key={versi} onSukses={() => setVersi((v) => v + 1)} />
      )}
      {tab === "hutang" && <TabHutang key={versi} onSukses={() => setVersi((v) => v + 1)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// F14 — Pengeluaran per lini
// ---------------------------------------------------------------------------

function TabPengeluaran({ onSukses }: { onSukses: () => void }) {
  const [lini, setLini] = useState<Lini[]>([]);
  const [daftar, setDaftar] = useState<Pengeluaran[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [idLini, setIdLini] = useState<number | "">("");
  const [kategori, setKategori] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [galatForm, setGalatForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    let batal = false;
    Promise.all([
      fetch("/api/lini").then((r) => r.json() as Promise<{ lini?: Lini[] }>),
      fetch("/api/pengeluaran").then((r) => r.json() as Promise<{ pengeluaran: Pengeluaran[] }>),
    ])
      .then(([dataLini, dataKeluar]) => {
        if (batal) return;
        setLini(dataLini.lini ?? []);
        setIdLini(dataLini.lini?.[0]?.idLini ?? "");
        setDaftar(dataKeluar.pengeluaran);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat data pengeluaran.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  async function simpan() {
    const jumlahAngka = Number(jumlah);
    if (!idLini) return setGalatForm("Lini usaha wajib dipilih.");
    if (!kategori.trim()) return setGalatForm("Kategori wajib diisi.");
    if (!Number.isInteger(jumlahAngka) || jumlahAngka <= 0) {
      return setGalatForm("Jumlah harus bilangan bulat lebih dari 0.");
    }
    setMenyimpan(true);
    setGalatForm(null);
    try {
      const res = await fetch("/api/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idLini,
          kategori: kategori.trim(),
          jumlah: jumlahAngka,
          tanggal: tanggal || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalatForm(data.pesan ?? "Gagal menyimpan pengeluaran.");
        return;
      }
      setKategori("");
      setJumlah("");
      setTanggal("");
      onSukses();
    } catch {
      setGalatForm("Tidak bisa menghubungi server.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) return <p className="text-sm text-zinc-500">Memuat…</p>;
  if (galat) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>;

  return (
    <>
      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold">Catat Pengeluaran</h2>
        <p className="text-xs text-zinc-500">
          Pengeluaran yang tidak bisa dipisah dicatat di lini “Umum”.
        </p>

        <label className="text-sm font-medium">Lini usaha</label>
        <select
          value={idLini}
          onChange={(e) => setIdLini(Number(e.target.value))}
          className="min-h-12 rounded-xl border border-zinc-300 bg-white px-3"
        >
          {lini.map((l) => (
            <option key={l.idLini} value={l.idLini}>
              {l.namaLini}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium">Kategori</label>
        <input
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          placeholder="mis. Beli plastik, bensin, listrik"
          className="min-h-12 rounded-xl border border-zinc-300 px-3"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Jumlah (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              className="min-h-12 rounded-xl border border-zinc-300 px-3"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Tanggal (opsional)</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="min-h-12 rounded-xl border border-zinc-300 px-3"
            />
          </div>
        </div>

        {galatForm && <p className="text-sm text-red-700">{galatForm}</p>}

        <button
          type="button"
          onClick={() => void simpan()}
          disabled={menyimpan}
          className="min-h-12 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
        >
          {menyimpan ? "Menyimpan…" : "Simpan Pengeluaran"}
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Pengeluaran Terbaru</h2>
        {daftar.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Belum ada pengeluaran.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {daftar.map((p) => (
              <li
                key={p.idPengeluaran}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div>
                  <p className="font-medium">{p.kategori}</p>
                  <p className="text-xs text-zinc-500">
                    {p.namaLini} · {p.tanggal}
                  </p>
                </div>
                <span className="font-semibold">{rupiah.format(p.jumlah)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// F18 — Hutang ke pemasok
// ---------------------------------------------------------------------------

function TabHutang({ onSukses }: { onSukses: () => void }) {
  const [daftar, setDaftar] = useState<Hutang[]>([]);
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [pilih, setPilih] = useState<Hutang | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/hutang")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { hutang: Hutang[]; totalBelumLunas: number };
      })
      .then((data) => {
        if (batal) return;
        setDaftar(data.hutang);
        setTotal(data.totalBelumLunas);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar hutang.");
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
    <>
      <section className="rounded-2xl bg-emerald-600 px-5 py-4 text-white">
        <p className="text-sm opacity-90">Total hutang belum lunas</p>
        <p className="text-2xl font-bold">{rupiah.format(total)}</p>
      </section>

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Tidak ada hutang ke pemasok.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftar.map((h) => (
            <li
              key={h.idHutang}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{h.namaPemasok}</p>
                  <p className="text-xs text-zinc-500">
                    {h.jatuhTempo ? `Jatuh tempo ${h.jatuhTempo}` : "Tanpa jatuh tempo"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${WARNA_STATUS[h.status]}`}
                >
                  {LABEL_STATUS[h.status]}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-zinc-500">Sisa hutang</p>
                  <p className="text-lg font-bold">{rupiah.format(h.saldo)}</p>
                </div>
                {h.status !== "lunas" && (
                  <button
                    type="button"
                    onClick={() => setPilih(h)}
                    className="min-h-11 rounded-xl bg-emerald-600 px-4 font-medium text-white"
                  >
                    Bayar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pilih && (
        <DialogBayarHutang
          hutang={pilih}
          onTutup={() => setPilih(null)}
          onSukses={() => {
            setPilih(null);
            onSukses();
          }}
        />
      )}
    </>
  );
}

function DialogBayarHutang({
  hutang,
  onTutup,
  onSukses,
}: {
  hutang: Hutang;
  onTutup: () => void;
  onSukses: () => void;
}) {
  const [jumlah, setJumlah] = useState(String(hutang.saldo));
  const [tanggal, setTanggal] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function simpan() {
    const nilai = Number(jumlah);
    if (!Number.isInteger(nilai) || nilai <= 0) {
      return setGalat("Jumlah harus bilangan bulat lebih dari 0.");
    }
    if (nilai > hutang.saldo) return setGalat("Jumlah bayar melebihi sisa hutang.");
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch("/api/hutang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idHutang: hutang.idHutang, jumlah: nilai, tanggal: tanggal || null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan pembayaran.");
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Ikon nama="kasbon" className="h-5 w-5 text-emerald-700" />
          Bayar Hutang
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {hutang.namaPemasok} · sisa {rupiah.format(hutang.saldo)}
        </p>

        <label className="mt-4 block text-sm font-medium">Jumlah bayar (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-lg"
        />

        <button
          type="button"
          onClick={() => setJumlah(String(hutang.saldo))}
          className="mt-2 min-h-10 rounded-lg border border-zinc-300 px-3 text-sm"
        >
          Lunasi
        </button>

        <label className="mt-4 block text-sm font-medium">Tanggal (opsional)</label>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-zinc-300 px-3"
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
            onClick={() => void simpan()}
            disabled={memuat || jumlah === ""}
            className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
          >
            {memuat ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
