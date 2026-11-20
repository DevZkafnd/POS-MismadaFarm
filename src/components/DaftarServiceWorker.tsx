"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan Service Worker (PWA) agar kerangka aplikasi dan data barang tetap
 * tersedia saat sinyal lemah (F19 / FR-18).
 */
export default function DaftarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const daftar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* pendaftaran gagal (mis. mode pengembangan tanpa https) — abaikan */
      });
    };
    if (document.readyState === "complete") daftar();
    else window.addEventListener("load", daftar, { once: true });
  }, []);

  return null;
}
