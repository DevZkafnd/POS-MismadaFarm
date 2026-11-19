"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Beranda() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => router.replace(res.ok ? "/dashboard" : "/login"))
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center p-8 text-zinc-500">Memuat…</main>
  );
}
