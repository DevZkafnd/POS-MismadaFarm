"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LABEL_PERAN, PERAN, type NamaPeran } from "@/lib/auth/peran";

type Pengguna = { nama: string; username: string; peran: NamaPeran };

type Kartu = { href: string; judul: string; keterangan: string; peran?: NamaPeran[] };

const KARTU: Kartu[] = [
  {
    href: "/jual",
    judul: "Jual",
    keterangan: "Catat penjualan: pindai barcode, favorit, atau harga manual.",
  },
  {
    href: "/kasbon",
    judul: "Kasbon",
    keterangan: "Pantau kasbon pelanggan dan catat pelunasan.",
  },
  {
    href: "/barang",
    judul: "Data Barang",
    keterangan: "Cari barang, lihat stok, dan harga jual.",
  },
  {
    href: "/penerimaan",
    judul: "Penerimaan Barang",
    keterangan: "Catat barang masuk: tunai, kredit, atau titipan.",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/keuangan",
    judul: "Keuangan",
    keterangan: "Catat pengeluaran per lini dan bayar hutang pemasok.",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/rekap",
    judul: "Rekap Kas Harian",
    keterangan: "Bandingkan uang fisik dengan kas seharusnya.",
  },
  {
    href: "/notifikasi",
    judul: "Notifikasi",
    keterangan: "Peringatan stok menipis, hampir kedaluwarsa, kasbon jatuh tempo.",
  },
  {
    href: "/laporan",
    judul: "Laporan",
    keterangan: "Laba-rugi per lini, margin barang, dan ekspor data.",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/barang?ubah=1",
    judul: "Ubah Harga",
    keterangan: "Ubah harga jual/beli, riwayat lama tetap tersimpan.",
    peran: [PERAN.PENERUS_USAHA],
  },
  {
    href: "/log",
    judul: "Riwayat Aktivitas",
    keterangan: "Lihat catatan perubahan data.",
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
      <section className="rounded-2xl bg-emerald-600 px-5 py-6 text-white">
        <p className="text-sm opacity-90">Selamat datang,</p>
        <h1 className="text-2xl font-bold">{pengguna.nama}</h1>
        <p className="mt-1 text-sm opacity-90">Peran: {LABEL_PERAN[pengguna.peran]}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {kartu.map((k) => (
          <Link
            key={k.judul}
            href={k.href}
            className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-5 py-5 hover:border-emerald-500 hover:bg-emerald-50"
          >
            <span className="text-lg font-semibold">{k.judul}</span>
            <span className="text-sm text-zinc-500">{k.keterangan}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
