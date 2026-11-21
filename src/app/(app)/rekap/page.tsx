"use client";

import { useEffect, useState } from "react";
import Ikon from "@/components/Ikon";

/**
 * Rekap harian + pembanding kas (F11 / FR-13, BR-09).
 * Kas seharusnya = kas awal + penjualan tunai + pelunasan piutang
 *                  − pengeluaran tunai − pembayaran tunai ke pemasok.
 * Bila ada selisih, keterangan wajib diisi sebelum rekap dikunci.
 */

type Komponen = {
  penjualanTunai: number;
  pelunasanPiutang: number;
  pengeluaranTunai: number;
  pembayaranPemasokTunai: number;
};

type Rekap = {
  idRekap: number;
  tanggal: string;
  kasSeharusnya: number;
  kasFisik: number;
  selisih: number;
  keterangan: string | null;
  statusKunci: boolean;
  kasAwal: number;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function HalamanRekap() {
  const [versi, setVersi] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Ikon nama="rekap" className="h-6 w-6 text-emerald-700" />
        <h1 className="text-xl font-bold">Rekap Kas Harian</h1>
      </div>
      <FormRekap key={versi} onSukses={() => setVersi((v) => v + 1)} />
    </div>
  );
}

function FormRekap({ onSukses }: { onSukses: () => void }) {
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [tanggal, setTanggal] = useState("");
  const [komponen, setKomponen] = useState<Komponen | null>(null);
  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [terkunci, setTerkunci] = useState(false);

  const [kasAwal, setKasAwal] = useState("");
  const [kasFisik, setKasFisik] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [galatForm, setGalatForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/rekap")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { tanggal: string; komponen: Komponen; rekap: Rekap | null };
      })
      .then((data) => {
        if (batal) return;
        setTanggal(data.tanggal);
        setKomponen(data.komponen);
        setRekap(data.rekap);
        setTerkunci(Boolean(data.rekap?.statusKunci));
        if (data.rekap) {
          setKasAwal(String(data.rekap.kasAwal));
          setKasFisik(String(data.rekap.kasFisik));
          setKeterangan(data.rekap.keterangan ?? "");
        }
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat data rekap.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  const kasAwalAngka = Number(kasAwal || 0);
  const kasFisikAngka = Number(kasFisik || 0);
  const kasSeharusnya = komponen
    ? kasAwalAngka +
      komponen.penjualanTunai +
      komponen.pelunasanPiutang -
      komponen.pengeluaranTunai -
      komponen.pembayaranPemasokTunai
    : 0;
  const selisih = Math.round(kasFisikAngka - kasSeharusnya);
  const perluKeterangan = selisih !== 0;

  async function kirim(kunci: boolean) {
    if (!Number.isInteger(kasAwalAngka) || kasAwalAngka < 0) {
      return setGalatForm("Kas awal harus bilangan bulat (≥ 0).");
    }
    if (!Number.isInteger(kasFisikAngka) || kasFisikAngka < 0) {
      return setGalatForm("Uang fisik harus bilangan bulat (≥ 0).");
    }
    if (kunci && perluKeterangan && keterangan.trim() === "") {
      return setGalatForm("Selisih wajib diberi keterangan sebelum dikunci.");
    }
    setMenyimpan(true);
    setGalatForm(null);
    setPesan(null);
    try {
      const res = await fetch("/api/rekap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kasAwal: kasAwalAngka,
          kasFisik: kasFisikAngka,
          keterangan: keterangan.trim() || null,
          kunci,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalatForm(data.pesan ?? "Gagal menyimpan rekap.");
        return;
      }
      setPesan(kunci ? "Rekap tersimpan dan dikunci." : "Rekap tersimpan.");
      onSukses();
    } catch {
      setGalatForm("Tidak bisa menghubungi server.");
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) return <p className="text-sm text-zinc-500">Memuat…</p>;
  if (galat) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>;

  const barisKomponen: { label: string; nilai: number; tanda?: "kurang" }[] = komponen
    ? [
        { label: "Penjualan tunai", nilai: komponen.penjualanTunai },
        { label: "Pelunasan kasbon", nilai: komponen.pelunasanPiutang },
        { label: "Pengeluaran tunai", nilai: komponen.pengeluaranTunai, tanda: "kurang" },
        { label: "Bayar hutang pemasok", nilai: komponen.pembayaranPemasokTunai, tanda: "kurang" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Tanggal rekap: <span className="font-medium text-zinc-700">{tanggal}</span>
      </p>

      {terkunci && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
          <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
          Rekap hari ini sudah dikunci dan tidak bisa diubah.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-zinc-700">Kas awal (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={kasAwal}
          onChange={(e) => setKasAwal(e.target.value)}
          disabled={terkunci}
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 disabled:bg-zinc-100"
        />

        <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-3 text-sm">
          {barisKomponen.map((b) => (
            <div key={b.label} className="flex justify-between gap-2">
              <span className="text-zinc-600">
                {b.tanda === "kurang" ? "− " : "+ "}
                {b.label}
              </span>
              <span className="font-medium">{rupiah.format(b.nilai)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-2">
            <span className="font-medium">Kas seharusnya</span>
            <span className="font-bold">{rupiah.format(kasSeharusnya)}</span>
          </div>
        </div>

        <label className="text-sm font-medium text-zinc-700">Uang fisik dihitung (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={kasFisik}
          onChange={(e) => setKasFisik(e.target.value)}
          disabled={terkunci}
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 disabled:bg-zinc-100"
        />

        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
            selisih === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          <span>Selisih</span>
          <span>{rupiah.format(selisih)}</span>
        </div>

        <label className="text-sm font-medium text-zinc-700">
          Keterangan selisih{perluKeterangan ? " (wajib)" : " (opsional)"}
        </label>
        <textarea
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          disabled={terkunci}
          rows={2}
          placeholder="mis. uang kembalian belum dicatat"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:bg-zinc-100"
        />

        {galatForm && <p className="text-sm text-red-700">{galatForm}</p>}
        {pesan && <p className="text-sm text-emerald-700">{pesan}</p>}

        {!terkunci && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void kirim(false)}
              disabled={menyimpan}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              <Ikon nama="centang" className="h-4 w-4" />
              Simpan
            </button>
            <button
              type="button"
              onClick={() => void kirim(true)}
              disabled={menyimpan}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Ikon nama="centang" className="h-4 w-4" />
              {menyimpan ? "Menyimpan…" : "Simpan & Kunci"}
            </button>
          </div>
        )}

        {terkunci && rekap && (
          <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
            <p>
              Kas seharusnya {rupiah.format(rekap.kasSeharusnya)} · fisik{" "}
              {rupiah.format(rekap.kasFisik)} · selisih {rupiah.format(rekap.selisih)}
            </p>
            {rekap.keterangan && <p className="mt-1">Keterangan: {rekap.keterangan}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
