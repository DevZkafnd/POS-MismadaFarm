"use client";

import { useEffect, useMemo, useState } from "react";
import { hitungSelisihOpname, LABEL_STATUS_OPNAME, type StatusOpname } from "@/lib/domain/opname";
import { PERAN } from "@/lib/auth/peran";

/**
 * Stok opname (F16 / FR-11, BR-08).
 * Stok baru berubah setelah disetujui Penerus Usaha; alasan selisih wajib.
 */

type Barang = {
  idBarang: number;
  namaBarang: string;
  satuan: string;
  tipe: string;
  stokTotal: number;
};

type ItemHitung = {
  kunci: string;
  idBarang: number;
  namaBarang: string;
  satuan: string;
  stokSistem: number;
  stokFisik: string;
  alasan: string;
};

type RincianOpname = {
  idBarang: number;
  namaBarang: string;
  satuan: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  alasan: string | null;
};

type Opname = {
  idOpname: number;
  tanggal: string;
  status: StatusOpname;
  items: RincianOpname[];
};

export default function HalamanOpname() {
  const [versi, setVersi] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Stok Opname</h1>
      <p className="text-sm text-zinc-500">
        Hitung stok fisik. Stok baru berubah setelah disetujui Penerus Usaha.
      </p>
      <FormOpname key={`form-${versi}`} onSukses={() => setVersi((v) => v + 1)} />
      <DaftarOpname key={`daftar-${versi}`} onSukses={() => setVersi((v) => v + 1)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form hitung fisik
// ---------------------------------------------------------------------------

function FormOpname({ onSukses }: { onSukses: () => void }) {
  const [items, setItems] = useState<ItemHitung[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  function tambahBarang(b: Barang) {
    setItems((lama) => {
      if (lama.some((i) => i.idBarang === b.idBarang)) return lama;
      return [
        ...lama,
        {
          kunci: String(b.idBarang),
          idBarang: b.idBarang,
          namaBarang: b.namaBarang,
          satuan: b.satuan,
          stokSistem: b.tipe === "jasa" ? 0 : b.stokTotal,
          stokFisik: String(b.tipe === "jasa" ? 0 : b.stokTotal),
          alasan: "",
        },
      ];
    });
    setGalat(null);
  }

  function ubah(kunci: string, perubahan: Partial<ItemHitung>) {
    setItems((lama) => lama.map((i) => (i.kunci === kunci ? { ...i, ...perubahan } : i)));
  }

  const adaSelisihTanpaAlasan = items.some(
    (i) => hitungSelisihOpname(i.stokSistem, Number(i.stokFisik || 0)) !== 0 && i.alasan.trim() === "",
  );

  async function simpan() {
    if (items.length === 0) return setGalat("Tambahkan minimal satu barang.");
    for (const i of items) {
      if (Number(i.stokFisik) < 0 || Number.isNaN(Number(i.stokFisik))) {
        return setGalat(`Stok fisik ${i.namaBarang} tidak valid.`);
      }
    }
    if (adaSelisihTanpaAlasan) return setGalat("Alasan wajib diisi untuk setiap barang yang berselisih.");
    setMemuat(true);
    setGalat(null);
    setPesan(null);
    try {
      const res = await fetch("/api/opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            idBarang: i.idBarang,
            stokFisik: Number(i.stokFisik),
            alasan: i.alasan.trim() || null,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan opname.");
        return;
      }
      setItems([]);
      setPesan("Opname tersimpan. Menunggu persetujuan Penerus Usaha.");
      onSukses();
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <>
      <CariBarang onPilih={tambahBarang} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Barang dihitung</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Belum ada barang. Cari barang di atas.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((i) => {
              const selisih = hitungSelisihOpname(i.stokSistem, Number(i.stokFisik || 0));
              return (
                <li
                  key={i.kunci}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {i.namaBarang} <span className="text-xs text-zinc-500">({i.satuan})</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setItems((lama) => lama.filter((x) => x.kunci !== i.kunci))}
                      className="min-h-9 rounded-lg px-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <label className="text-xs text-zinc-500">Stok sistem</label>
                      <p className="min-h-11 rounded-lg bg-zinc-100 px-3 py-3 font-medium">
                        {i.stokSistem}
                      </p>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-zinc-500">Stok fisik</label>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={i.stokFisik}
                        onChange={(e) => ubah(i.kunci, { stokFisik: e.target.value })}
                        className="min-h-11 rounded-lg border border-zinc-300 px-2"
                      />
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
                      selisih === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    <span>Selisih</span>
                    <span>{selisih > 0 ? `+${selisih}` : selisih}</span>
                  </div>

                  {selisih !== 0 && (
                    <>
                      <label className="text-xs text-zinc-500">Alasan selisih (wajib)</label>
                      <input
                        value={i.alasan}
                        onChange={(e) => ubah(i.kunci, { alasan: e.target.value })}
                        placeholder="mis. susut, rusak, salah catat"
                        className="min-h-11 rounded-lg border border-zinc-300 px-3"
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
      {pesan && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pesan}</p>}

      <button
        type="button"
        onClick={() => void simpan()}
        disabled={memuat || items.length === 0}
        className="min-h-14 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
      >
        {memuat ? "Menyimpan…" : "Simpan Opname"}
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
        placeholder="Cari barang untuk dihitung…"
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
              <span className="text-xs text-zinc-500">
                stok sistem {b.stokTotal} {b.satuan}
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Daftar opname + persetujuan
// ---------------------------------------------------------------------------

function DaftarOpname({ onSukses }: { onSukses: () => void }) {
  const [daftar, setDaftar] = useState<Opname[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [peran, setPeran] = useState<string | null>(null);
  const [pilih, setPilih] = useState<Opname | null>(null);

  const bisaSetujui = peran === PERAN.PENERUS_USAHA;

  useEffect(() => {
    let batal = false;
    Promise.all([
      fetch("/api/opname").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([dataOpname, dataMe]: [{ opname: Opname[] }, { pengguna?: { peran: string } }]) => {
        if (batal) return;
        setDaftar(dataOpname.opname);
        setPeran(dataMe.pengguna?.peran ?? null);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar opname.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  const daftarTampil = useMemo(() => daftar, [daftar]);

  if (memuat) return <p className="text-sm text-zinc-500">Memuat…</p>;
  if (galat) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Riwayat Opname</h2>
      {daftarTampil.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Belum ada opname.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {daftarTampil.map((o) => (
            <li key={o.idOpname} className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Opname #{o.idOpname}</p>
                  <p className="text-xs text-zinc-500">
                    {o.tanggal} · {o.items.length} barang
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    o.status === "disetujui"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {LABEL_STATUS_OPNAME[o.status]}
                </span>
              </div>

              <ul className="flex flex-col gap-1 text-sm">
                {o.items.map((r) => (
                  <li key={r.idBarang} className="flex justify-between gap-2 text-zinc-600">
                    <span>
                      {r.namaBarang}
                      {r.alasan ? <span className="text-xs text-zinc-400"> · {r.alasan}</span> : null}
                    </span>
                    <span className={r.selisih === 0 ? "text-zinc-500" : "font-medium text-amber-700"}>
                      {r.selisih > 0 ? `+${r.selisih}` : r.selisih} {r.satuan}
                    </span>
                  </li>
                ))}
              </ul>

              {o.status === "menunggu" && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">
                    {bisaSetujui ? "Perlu persetujuan Anda." : "Menunggu Penerus Usaha."}
                  </span>
                  {bisaSetujui && (
                    <button
                      type="button"
                      onClick={() => setPilih(o)}
                      className="min-h-11 rounded-xl bg-emerald-600 px-4 font-medium text-white"
                    >
                      Setujui
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pilih && (
        <DialogSetujui
          opname={pilih}
          onTutup={() => setPilih(null)}
          onSukses={() => {
            setPilih(null);
            onSukses();
          }}
        />
      )}
    </section>
  );
}

function DialogSetujui({
  opname,
  onTutup,
  onSukses,
}: {
  opname: Opname;
  onTutup: () => void;
  onSukses: () => void;
}) {
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const ringkas = opname.items.filter((i) => i.selisih !== 0).length;

  async function setujui() {
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/opname/${opname.idOpname}/setujui`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyetujui opname.");
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
        <h2 className="text-lg font-bold">Setujui Opname #{opname.idOpname}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {ringkas} barang akan disesuaikan stoknya. Tindakan ini tercatat di log aktivitas.
        </p>
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
            onClick={() => void setujui()}
            disabled={memuat}
            className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
          >
            {memuat ? "Memproses…" : "Setujui & Sesuaikan Stok"}
          </button>
        </div>
      </div>
    </div>
  );
}
