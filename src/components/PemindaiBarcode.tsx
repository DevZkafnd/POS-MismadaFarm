"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Komponen kamera pemindai barcode (F02 / CAPST-35).
 * Jalur utama: BarcodeDetector API. Cadangan: @zxing/browser (bila API tidak
 * tersedia, mis. Safari/Firefox). Hasil pindai dikirim lewat `onHasil`; kode
 * yang tidak dikenali ditangani pemanggil — komponen ini tidak menambah barang.
 */

type PendeteksiBarcode = {
  detect: (sumber: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type KonstruktorBarcodeDetector = {
  new (opsi?: { formats?: string[] }): PendeteksiBarcode;
  getSupportedFormats?: () => Promise<string[]>;
};

export default function PemindaiBarcode({
  onHasil,
  onTutup,
}: {
  onHasil: (kode: string) => void;
  onTutup: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onHasilRef = useRef(onHasil);

  useEffect(() => {
    onHasilRef.current = onHasil;
  }, [onHasil]);

  const [galat, setGalat] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);
  const [pakaiCadangan, setPakaiCadangan] = useState(false);

  useEffect(() => {
    let dibatalkan = false;
    let stream: MediaStream | null = null;
    let hentikanZxing: (() => void) | null = null;
    let rafId = 0;
    let sudahKirim = false;

    const kirim = (kode: string) => {
      if (sudahKirim) return;
      sudahKirim = true;
      onHasilRef.current(kode);
    };

    async function mulai() {
      const video = videoRef.current;
      if (!video) return;

      const Konstruktor = (window as unknown as { BarcodeDetector?: KonstruktorBarcodeDetector })
        .BarcodeDetector;

      try {
        if (Konstruktor) {
          const format = await Konstruktor.getSupportedFormats?.().catch(() => undefined);
          const pendeteksi = new Konstruktor(
            format && format.length > 0 ? { formats: format } : undefined,
          );

          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          if (dibatalkan) return;
          video.srcObject = stream;
          await video.play();
          if (dibatalkan) return;
          setSiap(true);

          const pindai = async () => {
            if (dibatalkan || sudahKirim) return;
            try {
              const hasil = await pendeteksi.detect(video);
              const kode = hasil[0]?.rawValue?.trim();
              if (kode) {
                kirim(kode);
                return;
              }
            } catch {
              // Bingkai belum siap; coba lagi bingkai berikutnya.
            }
            rafId = requestAnimationFrame(() => void pindai());
          };
          rafId = requestAnimationFrame(() => void pindai());
          return;
        }

        // Cadangan: @zxing/browser.
        setPakaiCadangan(true);
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const pembaca = new BrowserMultiFormatReader();
        const kontrol = await pembaca.decodeFromVideoDevice(undefined, video, (hasil) => {
          const kode = hasil?.getText()?.trim();
          if (kode) kirim(kode);
        });
        if (dibatalkan) {
          kontrol.stop();
          return;
        }
        hentikanZxing = () => kontrol.stop();
        setSiap(true);
      } catch {
        if (!dibatalkan) {
          setGalat("Kamera tidak bisa dibuka. Beri izin kamera, atau pakai pencarian manual.");
        }
      }
    }

    void mulai();

    return () => {
      dibatalkan = true;
      cancelAnimationFrame(rafId);
      hentikanZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-black/80 p-4">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3">
        <div className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold">Pindai Barcode</h2>
          <button
            type="button"
            onClick={onTutup}
            className="min-h-11 rounded-lg bg-white/20 px-4 text-sm font-medium"
          >
            Tutup
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            aria-label="Pratinjau kamera"
          />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/80" />
          {!siap && !galat && (
            <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white">
              Menyiapkan kamera…
            </p>
          )}
        </div>

        <p className="text-center text-sm text-white/80">
          {galat ??
            (pakaiCadangan
              ? "Memakai pemindai cadangan (ZXing)."
              : "Arahkan barcode ke dalam kotak.")}
        </p>
      </div>
    </div>
  );
}
