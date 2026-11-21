"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Ikon, { type NamaIkon } from "@/components/Ikon";
import { LABEL_PERAN, PERAN, type NamaPeran } from "@/lib/auth/peran";

type Pengguna = { nama: string; username: string; peran: NamaPeran };

type Kartu = { href: string; judul: string; keterangan: string; ikon: NamaIkon; peran?: NamaPeran[] };

const KARTU: Kartu[] = [
  {
    href: "/jual",
    judul: "Jual",
    keterangan: "Catat penjualan: pindai barcode, favorit, atau harga manual.",
    ikon: "jual",
  },
  {
    href: "/kasbon",
    judul: "Kasbon",
    keterangan: "Pantau kasbon pelanggan dan catat pelunasan.",
    ikon: "kasbon",
  },
  {
    href: "/barang",
    judul: "Data Barang",
    keterangan: "Cari barang, lihat stok, dan harga jual.",
    ikon: "barang",
  },
  {
    href: "/penerimaan",
    judul: "Penerimaan Barang",
    keterangan: "Catat barang masuk: tunai, kredit, atau titipan.",
    ikon: "penerimaan",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/keuangan",
    judul: "Keuangan",
    keterangan: "Catat pengeluaran per lini dan bayar hutang pemasok.",
    ikon: "keuangan",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/rekap",
    judul: "Rekap Kas Harian",
    keterangan: "Bandingkan uang fisik dengan kas seharusnya.",
    ikon: "rekap",
  },
  {
    href: "/notifikasi",
    judul: "Notifikasi",
    keterangan: "Peringatan stok menipis, hampir kedaluwarsa, kasbon jatuh tempo.",
    ikon: "notifikasi",
  },
  {
    href: "/laporan",
    judul: "Laporan",
    keterangan: "Laba-rugi per lini, margin barang, dan ekspor data.",
    ikon: "laporan",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/barang?ubah=1",
    judul: "Ubah Harga",
    keterangan: "Ubah harga jual/beli, riwayat lama tetap tersimpan.",
    ikon: "barang",
    peran: [PERAN.PENERUS_USAHA],
  },
  {
    href: "/log",
    judul: "Riwayat Aktivitas",
    keterangan: "Lihat catatan perubahan data.",
    ikon: "log",
    peran: [PERAN.PEMILIK],
  },
];

export default function HalamanDasbor() {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { pengguna: Pengguna };
        setPengguna(data.pengguna);
      })
      .catch(() => undefined);
  }, []);

  if (!pengguna) {
    return <p className="text-zinc-500">Memuat…</p>;
  }

  const kartu = KARTU.filter((k) => !k.peran || k.peran.includes(pengguna.peran));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-emerald-900 px-5 py-6 text-white shadow-sm">
        <p className="text-sm text-emerald-100">Selamat datang,</p>
        <h1 className="mt-0.5 text-2xl font-bold text-white">{pengguna.nama}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50 ring-1 ring-white/20 ring-inset">
          <Ikon nama="akun" className="h-3.5 w-3.5" />
          {LABEL_PERAN[pengguna.peran]}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Menu cepat</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kartu.map((k) => (
            <Link
              key={k.judul}
              href={k.href}
              className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Ikon nama={k.ikon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-emerald-900">{k.judul}</span>
                <span className="mt-0.5 block text-sm text-zinc-500">{k.keterangan}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
