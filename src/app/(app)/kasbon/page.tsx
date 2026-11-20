"use client";

import { useEffect, useState } from "react";

type StatusKasbon = "belum" | "sebagian" | "lunas";

type Kasbon = {
  idPiutang: number;
  idTransaksi: string;
  namaPelanggan: string;
  noHp: string | null;
  nilaiAwal: number;
  saldo: number;
  jatuhTempo: string;
  status: StatusKasbon;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const LABEL_STATUS: Record<StatusKasbon, string> = {
  belum: "Belum bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
};

const WARNA_STATUS: Record<StatusKasbon, string> = {
  belum: "bg-red-50 text-red-700",
  sebagian: "bg-amber-50 text-amber-700",
  lunas: "bg-emerald-50 text-emerald-700",
};

export default function HalamanKasbon() {
  const [versi, setVersi] = useState(0);
  const [pilih, setPilih] = useState<Kasbon | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Kasbon</h1>
      <DaftarKasbon key={versi} onPilih={setPilih} />
      {pilih && (
        <DialogBayarKasbon
          kasbon={pilih}
          onTutup={() => setPilih(null)}
          onSukses={() => {
            setPilih(null);
            setVersi((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function DaftarKasbon({ onPilih }: { onPilih: (k: Kasbon) => void }) {
  const [daftar, setDaftar] = useState<Kasbon[]>([]);
  const [total, setTotal] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/kasbon")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { kasbon: Kasbon[]; totalBelumLunas: number };
      })
      .then((data) => {
        if (batal) return;
        setDaftar(data.kasbon);
        setTotal(data.totalBelumLunas);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar kasbon.");
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
        <p className="text-sm opacity-90">Total kasbon belum lunas</p>
        <p className="text-2xl font-bold">{rupiah.format(total)}</p>
      </section>

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Belum ada kasbon.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftar.map((k) => (
            <li
              key={k.idPiutang}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{k.namaPelanggan}</p>
                  <p className="text-xs text-zinc-500">
                    Jatuh tempo {k.jatuhTempo}
                    {k.noHp ? ` · ${k.noHp}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${WARNA_STATUS[k.status]}`}>
                  {LABEL_STATUS[k.status]}
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-zinc-500">Sisa kasbon</p>
                  <p className="text-lg font-bold">{rupiah.format(k.saldo)}</p>
                  <p className="text-xs text-zinc-400">Awal {rupiah.format(k.nilaiAwal)}</p>
                </div>
                {k.status !== "lunas" && (
                  <button
                    type="button"
                    onClick={() => onPilih(k)}
                    className="min-h-11 rounded-xl bg-emerald-600 px-4 font-medium text-white"
                  >
                    Catat Bayar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DialogBayarKasbon({
  kasbon,
  onTutup,
  onSukses,
}: {
  kasbon: Kasbon;
  onTutup: () => void;
  onSukses: () => void;
}) {
  const [jumlah, setJumlah] = useState(String(kasbon.saldo));
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  async function simpan() {
    const nilai = Number(jumlah);
    if (!Number.isInteger(nilai) || nilai <= 0) {
      return setGalat("Jumlah harus bilangan bulat lebih dari 0.");
    }
    if (nilai > kasbon.saldo) return setGalat("Jumlah melebihi sisa kasbon.");
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch("/api/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPiutang: kasbon.idPiutang, jumlah: nilai }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan pelunasan.");
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
        <h2 className="text-lg font-bold">Catat Bayar Kasbon</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {kasbon.namaPelanggan} · sisa {rupiah.format(kasbon.saldo)}
        </p>

        <label className="mt-4 block text-sm font-medium">Jumlah dibayar (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-lg"
        />

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setJumlah(String(kasbon.saldo))}
            className="min-h-10 rounded-lg border border-zinc-300 px-3 text-sm"
          >
            Lunasi
          </button>
        </div>

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
