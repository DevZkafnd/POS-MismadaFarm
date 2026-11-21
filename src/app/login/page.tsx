"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Ikon from "@/components/Ikon";
import { LABEL_PERAN, type NamaPeran } from "@/lib/auth/peran";

type Akun = { username: string; nama: string; peran: NamaPeran };

const TOMBOL_PIN = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "kosong", "0", "hapus"];

export default function HalamanLogin() {
  const router = useRouter();
  const [daftar, setDaftar] = useState<Akun[]>([]);
  const [dipilih, setDipilih] = useState<Akun | null>(null);
  const [pin, setPin] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [memuatAkun, setMemuatAkun] = useState(true);

  useEffect(() => {
    fetch("/api/auth/akun")
      .then(async (res) => {
        const data = (await res.json()) as { akun?: Akun[] };
        setDaftar(data.akun ?? []);
      })
      .catch(() => setGalat("Gagal memuat daftar akun."))
      .finally(() => setMemuatAkun(false));
  }, []);

  async function masuk() {
    if (!dipilih || pin.length === 0) return;
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: dipilih.username, pin }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Akun atau PIN salah.");
        setPin("");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setGalat("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-sm"
        >
          M
        </span>
        <div>
          <h1 className="text-2xl font-bold">POS Mismada Farm</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {dipilih ? "Masukkan PIN 6 angka" : "Pilih akun Anda"}
          </p>
        </div>
      </header>

      {memuatAkun ? (
        <p className="text-center text-zinc-500">Memuat akun…</p>
      ) : !dipilih ? (
        <div className="flex flex-col gap-3">
          {daftar.map((akun) => (
            <button
              key={akun.username}
              type="button"
              onClick={() => {
                setDipilih(akun);
                setPin("");
                setGalat(null);
              }}
              className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Ikon nama="akun" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-emerald-900">
                  {akun.nama}
                </span>
                <span className="block text-sm text-zinc-500">{LABEL_PERAN[akun.peran]}</span>
              </span>
            </button>
          ))}
          {daftar.length === 0 && !galat && (
            <p className="text-center text-sm text-zinc-500">
              Belum ada akun. Jalankan <code>npm run seed</code> dulu.
            </p>
          )}
          {galat && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
              {galat}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Ikon nama="akun" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-emerald-900">{dipilih.nama}</p>
              <p className="text-sm text-zinc-500">{LABEL_PERAN[dipilih.peran]}</p>
            </div>
          </div>

          <div
            aria-label="PIN"
            aria-live="polite"
            className="flex min-h-16 items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white text-3xl tracking-[0.5em] text-emerald-900 shadow-sm"
          >
            {pin.length === 0 ? (
              <span className="text-zinc-300">••••••</span>
            ) : (
              "•".repeat(pin.length)
            )}
          </div>

          {galat && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
              {galat}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {TOMBOL_PIN.map((t) =>
              t === "kosong" ? (
                <span key={t} />
              ) : (
                <button
                  key={t}
                  type="button"
                  aria-label={t === "hapus" ? "Hapus" : t}
                  onClick={() => {
                    setGalat(null);
                    if (t === "hapus") setPin((p) => p.slice(0, -1));
                    else setPin((p) => (p.length >= 6 ? p : p + t));
                  }}
                  className="flex min-h-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-xl font-semibold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50 active:bg-emerald-100"
                >
                  {t === "hapus" ? <Ikon nama="hapus" className="h-6 w-6" /> : t}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={masuk}
            disabled={pin.length === 0 || memuat}
            className="min-h-14 rounded-xl bg-emerald-600 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {memuat ? "Memproses…" : "Masuk"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDipilih(null);
              setPin("");
              setGalat(null);
            }}
            className="min-h-11 rounded-xl text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            Ganti akun
          </button>
        </div>
      )}
    </main>
  );
}
