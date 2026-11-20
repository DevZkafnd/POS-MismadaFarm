"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AntreanOffline from "@/components/AntreanOffline";
import { LABEL_PERAN, PERAN, type NamaPeran } from "@/lib/auth/peran";

export type PenggunaAktif = {
  idPengguna: number;
  nama: string;
  username: string;
  peran: NamaPeran;
};

/**
 * Menu navigasi + hak akses (Tabel 4.10).
 * Lapisan UI menyembunyikan menu; server tetap menolak lewat `requireRole`.
 */
const MENU: { href: string; label: string; peran?: NamaPeran[] }[] = [
  { href: "/dashboard", label: "Dasbor" },
  { href: "/jual", label: "Jual" },
  { href: "/kasbon", label: "Kasbon" },
  { href: "/barang", label: "Data Barang" },
  { href: "/penerimaan", label: "Penerimaan", peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA] },
  { href: "/opname", label: "Stok Opname", peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA] },
  { href: "/retur", label: "Retur" },
  { href: "/titip", label: "Titip Jual", peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA] },
  { href: "/belanja", label: "Daftar Belanja" },
  { href: "/keuangan", label: "Keuangan", peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA] },
  { href: "/rekap", label: "Rekap" },
  { href: "/notifikasi", label: "Notifikasi" },
  { href: "/laporan", label: "Laporan", peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA] },
  { href: "/log", label: "Riwayat Aktivitas", peran: [PERAN.PEMILIK] },
];

export default function LayoutAplikasi({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pengguna, setPengguna] = useState<PenggunaAktif | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let batal = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (batal) return;
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as { pengguna: PenggunaAktif };
        setPengguna(data.pengguna);
        setSiap(true);
      })
      .catch(() => {
        if (!batal) router.replace("/login");
      });
    return () => {
      batal = true;
    };
  }, [router]);

  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!siap || !pengguna) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-zinc-500">Memuat…</main>
    );
  }

  const menu = MENU.filter((m) => !m.peran || m.peran.includes(pengguna.peran));

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-lg font-semibold">POS Mismada Farm</p>
            <p className="text-sm text-zinc-500">
              {pengguna.nama} · {LABEL_PERAN[pengguna.peran]}
            </p>
          </div>
          <button
            type="button"
            onClick={keluar}
            className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100"
          >
            Keluar
          </button>
        </div>
        <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-1 px-4 pb-2">
          {menu.map((m) => {
            const aktif = pathname === m.href || pathname.startsWith(`${m.href}/`);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium ${
                  aktif ? "bg-emerald-600 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <AntreanOffline />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
