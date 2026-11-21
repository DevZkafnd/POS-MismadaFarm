import type { ReactNode, SVGProps } from "react";

/**
 * Ikon SVG lokal (stroke) — tanpa dependensi/CDN, mewarisi warna teks (`currentColor`).
 * Dipakai di menu navigasi, kartu, tombol, dan judul seksi agar antarmuka konsisten.
 */
export type NamaIkon =
  | "dasbor"
  | "jual"
  | "kasbon"
  | "barang"
  | "penerimaan"
  | "opname"
  | "retur"
  | "titip"
  | "belanja"
  | "keuangan"
  | "rekap"
  | "notifikasi"
  | "laporan"
  | "log"
  | "keluar"
  | "akun"
  | "tambah"
  | "cari"
  | "pindai"
  | "peringatan"
  | "centang"
  | "hapus"
  | "menu"
  | "tutup";

const JALUR: Record<NamaIkon, ReactNode> = {
  dasbor: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  jual: (
    <>
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="18" cy="20" r="1.6" />
      <path d="M2 3h2.2l2.3 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.96-1.6L21 7H5" />
    </>
  ),
  kasbon: (
    <>
      <path d="M6 2h11a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M8 7h6" />
      <path d="M8 11h6" />
      <path d="M8 15h3" />
    </>
  ),
  barang: (
    <>
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </>
  ),
  penerimaan: (
    <>
      <path d="M2 5h11v11H2z" />
      <path d="M13 8h4l4 4v4h-8z" />
      <circle cx="6" cy="18.5" r="1.7" />
      <circle cx="17" cy="18.5" r="1.7" />
    </>
  ),
  opname: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V4" />
      <path d="m9 13 2 2 4-4" />
    </>
  ),
  retur: (
    <>
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  titip: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 6.6a3 3 0 0 1 0 5.6" />
      <path d="M18.5 20a6 6 0 0 0-3.2-5.3" />
    </>
  ),
  belanja: (
    <>
      <path d="M3 9h18l-1.5 9.6a2 2 0 0 1-2 1.4H6.5a2 2 0 0 1-2-1.4L3 9Z" />
      <path d="M8.5 9 11 3" />
      <path d="M15.5 9 13 3" />
      <path d="M9 13v3" />
      <path d="M15 13v3" />
    </>
  ),
  keuangan: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M16 12h3" />
      <circle cx="16.6" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  rekap: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 7h7" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M12 15h.01M15.5 15h.01" />
    </>
  ),
  notifikasi: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10.5 21a1.9 1.9 0 0 0 3 0" />
    </>
  ),
  laporan: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 16V11" />
      <path d="M12 16V7" />
      <path d="M17 16v-3" />
    </>
  ),
  log: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  keluar: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  akun: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  tambah: <path d="M12 5v14M5 12h14" />,
  cari: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  pindai: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" />
    </>
  ),
  peringatan: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </>
  ),
  centang: <path d="m4 12 5 5L20 6" />,
  hapus: (
    <>
      <path d="M21 7a2 2 0 0 0-2-2H9.6a2 2 0 0 0-1.5.7L3 12l5.1 6.3a2 2 0 0 0 1.5.7H19a2 2 0 0 0 2-2V7Z" />
      <path d="m13.5 9.5 5 5" />
      <path d="m18.5 9.5-5 5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  tutup: <path d="M6 6l12 12M18 6 6 18" />,
};

export default function Ikon({
  nama,
  className = "h-5 w-5",
  ...rest
}: { nama: NamaIkon } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {JALUR[nama]}
    </svg>
  );
}
