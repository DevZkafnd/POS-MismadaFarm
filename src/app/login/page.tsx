"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      <header className="text-center">
        <h1 className="text-2xl font-bold">POS Mismada Farm</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {dipilih ? "Masukkan PIN 6 angka" : "Pilih akun Anda"}
        </p>
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
              className="flex min-h-14 flex-col items-start rounded-xl border border-zinc-300 bg-white px-4 py-3 text-left hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="text-base font-semibold">{akun.nama}</span>
              <span className="text-sm text-zinc-500">{LABEL_PERAN[akun.peran]}</span>
            </button>
          ))}
          {daftar.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              Belum ada akun. Jalankan <code>npm run seed</code> dulu.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-300 bg-white px-4 py-3">
            <p className="text-base font-semibold">{dipilih.nama}</p>
            <p className="text-sm text-zinc-500">{LABEL_PERAN[dipilih.peran]}</p>
          </div>

          <div
            aria-label="PIN"
            className="flex min-h-14 items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white text-3xl tracking-[0.5em]"
          >
            {pin.length === 0 ? <span className="text-zinc-300">••••••</span> : "•".repeat(pin.length)}
          </div>

          {galat && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
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
                  onClick={() => {
                    setGalat(null);
                    if (t === "hapus") setPin((p) => p.slice(0, -1));
                    else setPin((p) => (p.length >= 6 ? p : p + t));
                  }}
                  className="min-h-14 rounded-xl border border-zinc-300 bg-white text-xl font-semibold hover:bg-zinc-100"
                >
                  {t === "hapus" ? "⌫" : t}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            onClick={masuk}
            disabled={pin.length === 0 || memuat}
            className="min-h-14 rounded-xl bg-emerald-600 text-lg font-semibold text-white disabled:opacity-50"
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
            className="min-h-11 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Ganti akun
          </button>
        </div>
      )}
    </main>
  );
}
