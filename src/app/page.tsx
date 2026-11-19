"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Halaman beranda: arahkan ke dasbor bila sudah masuk, atau ke login bila belum.
 *
 * Catatan: React Strict Mode (mode dev) menjalankan effect dua kali. Tanpa penjaga,
 * `router.replace` dipanggil dua kali sehingga permintaan RSC pertama dibatalkan
 * (`net::ERR_ABORTED ... ?_rsc=...`). Ref di bawah memastikan pengalihan hanya jalan
 * sekali; ref tetap hidup di antara siklus effect Strict Mode.
 */
export default function Beranda() {
  const router = useRouter();
  const sudahDialihkan = useRef(false);

  useEffect(() => {
    if (sudahDialihkan.current) return;
    sudahDialihkan.current = true;

    fetch("/api/auth/me")
      .then((res) => router.replace(res.ok ? "/dashboard" : "/login"))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-zinc-500">Memuat…</main>
  );
}
