"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Ikon from "@/components/Ikon";
import { EVENT_ANTREAN, hitungAntrean, kirimAntrean } from "@/lib/offline/sinkron";
import { pesanAntrean } from "@/lib/offline/tipe";

/**
 * Indikator antrean offline (F19 / FR-18).
 * Menampilkan jumlah transaksi yang menunggu sinyal dan mengirimkannya otomatis
 * saat kembali online.
 */
export default function AntreanOffline() {
  const [jumlah, setJumlah] = useState(0);
  const [online, setOnline] = useState(true);
  const [memproses, setMemproses] = useState(false);
  const sedangKirim = useRef(false);

  const segarkan = useCallback(async () => {
    try {
      setJumlah(await hitungAntrean());
    } catch {
      /* IndexedDB belum siap; abaikan */
    }
  }, []);

  const sinkron = useCallback(async () => {
    if (sedangKirim.current) return;
    sedangKirim.current = true;
    setMemproses(true);
    try {
      const hasil = await kirimAntrean();
      setJumlah(hasil.sisa);
    } catch {
      /* masih offline; coba lagi nanti */
    } finally {
      sedangKirim.current = false;
      setMemproses(false);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void sinkron();
    };
    const onOffline = () => setOnline(false);
    const onEvent = () => void segarkan();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(EVENT_ANTREAN, onEvent);
    const awal = setTimeout(() => void segarkan(), 0);
    const timer = setInterval(() => void segarkan(), 8000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(EVENT_ANTREAN, onEvent);
      clearTimeout(awal);
      clearInterval(timer);
    };
  }, [segarkan, sinkron]);

  if (online && jumlah === 0) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-3">
      <div
        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
          online
            ? "border border-amber-200 bg-amber-50 text-amber-900"
            : "bg-emerald-900 text-white"
        }`}
      >
        <span className="flex items-center gap-2">
          <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
          {online ? "" : "Mode offline — "}
          {pesanAntrean(jumlah)}
        </span>
        {online && jumlah > 0 && (
          <button
            type="button"
            onClick={() => void sinkron()}
            disabled={memproses}
            className="min-h-9 shrink-0 rounded-lg bg-emerald-600 px-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {memproses ? "Mengirim…" : "Sinkronkan"}
          </button>
        )}
      </div>
    </div>
  );
}
