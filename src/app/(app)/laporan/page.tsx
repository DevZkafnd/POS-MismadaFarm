"use client";

import { useEffect, useState } from "react";
import {
  bikinCsvLaporan,
  bikinExcel,
  bikinPdf,
  susunSeksiLaporan,
} from "@/lib/domain/ekspor";

/**
 * Laporan laba-rugi (F12 / FR-14, BR-10) + ekspor (F13 / FR-15).
 * Hanya pemilik / penerus usaha — kasir tidak melihat laba-rugi (Tabel 4.10).
 * Ekspor PDF / Excel / CSV memakai Web Share API bila tersedia; jika tidak,
 * berkas diunduh.
 */

type Konsolidasi = {
  omzet: number;
  labaKotor: number;
  pengeluaran: number;
  labaBersih: number;
};

type BarisLini = {
  idLini: number;
  namaLini: string;
  omzet: number;
  labaKotor: number;
  pengeluaran: number;
  labaRugi: number;
};

type MarginBarang = {
  idBarang: number;
  namaBarang: string;
  hargaJual: number;
  hargaBeli: number;
  marginPersen: number;
  terjual: number;
  omzet: number;
  labaKotor: number;
};

type Laporan = {
  periode: { dari: string | null; sampai: string | null };
  konsolidasi: Konsolidasi;
  perLini: BarisLini[];
  marginBarang: MarginBarang[];
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const persen = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function awalBulan(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hariIni(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export default function HalamanLaporan() {
  const [dari, setDari] = useState(awalBulan());
  const [sampai, setSampai] = useState(hariIni());
  const [data, setData] = useState<Laporan | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch(`/api/laporan?dari=${dari}&sampai=${sampai}`)
      .then(async (res) => {
        if (batal) return;
        if (res.status === 403) {
          setGalat("Hanya pemilik / penerus usaha yang bisa melihat laporan.");
          return;
        }
        if (!res.ok) {
          setGalat("Gagal memuat laporan.");
          return;
        }
        setGalat(null);
        setData((await res.json()) as Laporan);
      })
      .catch(() => {
        if (!batal) setGalat("Tidak bisa menghubungi server.");
      })
      .finally(() => {
        if (!batal) setMemuat(false);
      });
    return () => {
      batal = true;
    };
  }, [dari, sampai]);

  async function ekspor(format: "csv" | "excel" | "pdf") {
    if (!data) return;
    setPesan(null);
    const seksi = susunSeksiLaporan(data);
    let blob: Blob;
    let nama: string;

    if (format === "csv") {
      const teks = bikinCsvLaporan(seksi);
      blob = new Blob(["\uFEFF" + teks], { type: "text/csv;charset=utf-8" });
      nama = `laporan-${dari}-sd-${sampai}.csv`;
    } else if (format === "excel") {
      const bytes = await bikinExcel(seksi);
      blob = new Blob([new Uint8Array(bytes)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      nama = `laporan-${dari}-sd-${sampai}.xlsx`;
    } else {
      const bytes = await bikinPdf(seksi);
      blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      nama = `laporan-${dari}-sd-${sampai}.pdf`;
    }

    await unduhAtauBagikan(blob, nama);
  }

  // Web Share API bila mendukung berbagi berkas; jika tidak, unduh langsung.
  async function unduhAtauBagikan(blob: Blob, nama: string) {
    const berkas = new File([blob], nama, { type: blob.type });
    const bisaBagikan =
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [berkas] });

    if (bisaBagikan) {
      try {
        await navigator.share({ files: [berkas], title: "Laporan Mismada Farm" });
        setPesan("Laporan dibagikan.");
        return;
      } catch {
        // Pengguna membatalkan berbagi — lanjut ke unduhan.
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setPesan(`Berkas ${nama} diunduh.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Laporan</h1>

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Dari</label>
          <input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            className="min-h-11 rounded-xl border border-zinc-300 px-3"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Sampai</label>
          <input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className="min-h-11 rounded-xl border border-zinc-300 px-3"
          />
        </div>
        <button
          type="button"
          onClick={() => void ekspor("pdf")}
          disabled={!data}
          className="min-h-11 rounded-xl border border-emerald-600 px-4 font-medium text-emerald-700 disabled:opacity-50"
        >
          Ekspor PDF
        </button>
        <button
          type="button"
          onClick={() => void ekspor("excel")}
          disabled={!data}
          className="min-h-11 rounded-xl border border-emerald-600 px-4 font-medium text-emerald-700 disabled:opacity-50"
        >
          Ekspor Excel
        </button>
        <button
          type="button"
          onClick={() => void ekspor("csv")}
          disabled={!data}
          className="min-h-11 rounded-xl border border-zinc-300 px-4 font-medium text-zinc-700 disabled:opacity-50"
        >
          Ekspor CSV
        </button>
      </section>

      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
      {pesan && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pesan}</p>}
      {memuat && <p className="text-sm text-zinc-500">Memuat…</p>}

      {!memuat && data && (
        <>
          <section className="grid grid-cols-2 gap-3">
            <Kotak label="Omzet" nilai={rupiah.format(data.konsolidasi.omzet)} />
            <Kotak label="Laba kotor" nilai={rupiah.format(data.konsolidasi.labaKotor)} />
            <Kotak label="Pengeluaran" nilai={rupiah.format(data.konsolidasi.pengeluaran)} />
            <Kotak
              label="Laba bersih"
              nilai={rupiah.format(data.konsolidasi.labaBersih)}
              tebal
              warna={data.konsolidasi.labaBersih >= 0 ? "text-emerald-700" : "text-red-700"}
            />
          </section>

          <BagianTabel judul="Laba-Rugi per Lini Usaha">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <Th>Lini</Th>
                <Th kanan>Omzet</Th>
                <Th kanan>Laba Kotor</Th>
                <Th kanan>Pengeluaran</Th>
                <Th kanan>Laba/Rugi</Th>
              </tr>
            </thead>
            <tbody>
              {data.perLini.map((l) => (
                <tr key={l.idLini} className="border-t border-zinc-100">
                  <Td>{l.namaLini}</Td>
                  <Td kanan>{rupiah.format(l.omzet)}</Td>
                  <Td kanan>{rupiah.format(l.labaKotor)}</Td>
                  <Td kanan>{rupiah.format(l.pengeluaran)}</Td>
                  <Td kanan tebal>
                    <span className={l.labaRugi >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {rupiah.format(l.labaRugi)}
                    </span>
                  </Td>
                </tr>
              ))}
              {data.perLini.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Belum ada penjualan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </BagianTabel>

          <BagianTabel judul="Margin per Barang">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <Th>Barang</Th>
                <Th kanan>Harga Jual</Th>
                <Th kanan>Harga Beli</Th>
                <Th kanan>Margin</Th>
                <Th kanan>Terjual</Th>
                <Th kanan>Laba Kotor</Th>
              </tr>
            </thead>
            <tbody>
              {data.marginBarang.map((b) => (
                <tr key={b.idBarang} className="border-t border-zinc-100">
                  <Td>{b.namaBarang}</Td>
                  <Td kanan>{rupiah.format(b.hargaJual)}</Td>
                  <Td kanan>{rupiah.format(b.hargaBeli)}</Td>
                  <Td kanan>{persen.format(b.marginPersen)}%</Td>
                  <Td kanan>{b.terjual}</Td>
                  <Td kanan tebal>{rupiah.format(b.labaKotor)}</Td>
                </tr>
              ))}
              {data.marginBarang.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Belum ada barang terjual pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </BagianTabel>
        </>
      )}
    </div>
  );
}

function Kotak({
  label,
  nilai,
  tebal,
  warna,
}: {
  label: string;
  nilai: string;
  tebal?: boolean;
  warna?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 ${tebal ? "text-lg font-bold" : "font-semibold"} ${warna ?? ""}`}>
        {nilai}
      </p>
    </div>
  );
}

function BagianTabel({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">{judul}</h2>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
      </div>
    </section>
  );
}

function Th({ children, kanan }: { children: React.ReactNode; kanan?: boolean }) {
  return (
    <th className={`px-3 py-2 font-medium ${kanan ? "text-right" : ""}`}>{children}</th>
  );
}

function Td({
  children,
  kanan,
  tebal,
}: {
  children: React.ReactNode;
  kanan?: boolean;
  tebal?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2 ${kanan ? "text-right" : ""} ${tebal ? "font-semibold" : "text-zinc-600"}`}
    >
      {children}
    </td>
  );
}
