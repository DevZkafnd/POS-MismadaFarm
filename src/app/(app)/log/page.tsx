"use client";

import { useEffect, useState } from "react";

type Log = {
  idLog: number;
  waktu: string;
  aksi: string;
  objek: string;
  detail: string | null;
  namaPengguna: string;
};

const waktu = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const LABEL_AKSI: Record<string, string> = {
  login: "Masuk",
  logout: "Keluar",
  ubah_harga: "Ubah Harga",
};

export default function HalamanLog() {
  const [log, setLog] = useState<Log[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/log?limit=200")
      .then(async (res) => {
        if (res.status === 403) {
          setGalat("Hanya pemilik yang bisa melihat riwayat aktivitas.");
          return;
        }
        if (!res.ok) {
          setGalat("Gagal memuat riwayat aktivitas.");
          return;
        }
        const data = (await res.json()) as { log: Log[] };
        setLog(data.log);
      })
      .catch(() => setGalat("Tidak bisa menghubungi server."))
      .finally(() => setMemuat(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Riwayat Aktivitas</h1>

      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
      {memuat && <p className="text-zinc-500">Memuat…</p>}

      {!memuat && !galat && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Waktu</th>
                <th className="px-3 py-2 font-medium">Pengguna</th>
                <th className="px-3 py-2 font-medium">Aksi</th>
                <th className="px-3 py-2 font-medium">Objek</th>
                <th className="px-3 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.idLog} className="border-t border-zinc-100">
                  <td className="px-3 py-2 whitespace-nowrap text-zinc-600">
                    {waktu.format(new Date(l.waktu))}
                  </td>
                  <td className="px-3 py-2 font-medium">{l.namaPengguna}</td>
                  <td className="px-3 py-2">{LABEL_AKSI[l.aksi] ?? l.aksi}</td>
                  <td className="px-3 py-2 text-zinc-600">{l.objek}</td>
                  <td className="px-3 py-2 text-zinc-600">{l.detail ?? "—"}</td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Belum ada aktivitas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
