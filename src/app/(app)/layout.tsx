"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AntreanOffline from "@/components/AntreanOffline";
import Ikon, { type NamaIkon } from "@/components/Ikon";
import { LABEL_PERAN, PERAN, type NamaPeran } from "@/lib/auth/peran";

export type PenggunaAktif = {
  idPengguna: number;
  nama: string;
  username: string;
  peran: NamaPeran;
};

type ItemMenu = { href: string; label: string; ikon: NamaIkon; peran?: NamaPeran[] };

/**
 * Menu navigasi + hak akses (Tabel 4.10).
 * Lapisan UI menyembunyikan menu; server tetap menolak lewat `requireRole`.
 */
const MENU: ItemMenu[] = [
  { href: "/dashboard", label: "Dasbor", ikon: "dasbor" },
  { href: "/jual", label: "Jual", ikon: "jual" },
  { href: "/kasbon", label: "Kasbon", ikon: "kasbon" },
  { href: "/barang", label: "Data Barang", ikon: "barang" },
  {
    href: "/penerimaan",
    label: "Penerimaan",
    ikon: "penerimaan",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  {
    href: "/opname",
    label: "Stok Opname",
    ikon: "opname",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  { href: "/retur", label: "Retur", ikon: "retur" },
  {
    href: "/titip",
    label: "Titip Jual",
    ikon: "titip",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  { href: "/belanja", label: "Daftar Belanja", ikon: "belanja" },
  {
    href: "/keuangan",
    label: "Keuangan",
    ikon: "keuangan",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  { href: "/rekap", label: "Rekap", ikon: "rekap" },
  { href: "/notifikasi", label: "Notifikasi", ikon: "notifikasi" },
  {
    href: "/laporan",
    label: "Laporan",
    ikon: "laporan",
    peran: [PERAN.PEMILIK, PERAN.PENERUS_USAHA],
  },
  { href: "/log", label: "Riwayat Aktivitas", ikon: "log", peran: [PERAN.PEMILIK] },
];

export default function LayoutAplikasi({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pengguna, setPengguna] = useState<PenggunaAktif | null>(null);
  const [siap, setSiap] = useState(false);
  const [menuTerbuka, setMenuTerbuka] = useState(false);

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

  const penggunaAktif = pengguna;
  const menu = MENU.filter((m) => !m.peran || m.peran.includes(penggunaAktif.peran));

  /** Isi sidebar (dipakai versi tetap di desktop & drawer di layar kecil). */
  function isiMenu(onPilih?: () => void) {
    return (
      <>
        <div className="mx-3 mb-2 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 ring-inset">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Ikon nama="akun" className="h-4 w-4 shrink-0" />
            <span className="truncate">{penggunaAktif.nama}</span>
          </p>
          <p className="mt-0.5 pl-6 text-xs text-emerald-100">{LABEL_PERAN[penggunaAktif.peran]}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-2">
          <ul className="flex flex-col gap-1">
            {menu.map((m) => {
              const aktif = pathname === m.href || pathname.startsWith(`${m.href}/`);
              return (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    onClick={onPilih}
                    aria-current={aktif ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      aktif ? "bg-emerald-600 text-white" : "text-emerald-50 hover:bg-white/10"
                    }`}
                  >
                    <Ikon nama={m.ikon} className="h-5 w-5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              onPilih?.();
              void keluar();
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <Ikon nama="keluar" className="h-5 w-5 shrink-0" />
            Keluar
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-1">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-emerald-800 bg-emerald-900 text-white lg:flex">
        <div className="flex items-center gap-3 px-4 py-4">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-lg font-bold text-white"
          >
            M
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight">POS Mismada Farm</p>
            <p className="truncate text-xs text-emerald-100">Prototipe POS</p>
          </div>
        </div>
        {isiMenu()}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — layar kecil */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-emerald-900 px-3 py-2.5 text-white shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMenuTerbuka(true)}
            aria-label="Buka menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20 ring-inset transition-colors hover:bg-white/20"
          >
            <Ikon nama="menu" className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500 text-sm font-bold text-white"
            >
              M
            </span>
            <span className="truncate font-semibold">POS Mismada Farm</span>
          </div>
          <button
            type="button"
            onClick={() => void keluar()}
            aria-label="Keluar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20 ring-inset transition-colors hover:bg-white/20"
          >
            <Ikon nama="keluar" className="h-5 w-5" />
          </button>
        </header>

        <AntreanOffline />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>

      {/* Drawer — layar kecil */}
      {menuTerbuka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMenuTerbuka(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-emerald-900 text-white shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-lg font-bold text-white"
                >
                  M
                </span>
                <p className="truncate font-semibold">POS Mismada Farm</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuTerbuka(false)}
                aria-label="Tutup"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
              >
                <Ikon nama="tutup" className="h-5 w-5" />
              </button>
            </div>
            {isiMenu(() => setMenuTerbuka(false))}
          </div>
        </div>
      )}
    </div>
  );
}
