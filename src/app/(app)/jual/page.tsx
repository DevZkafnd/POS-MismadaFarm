"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PemindaiBarcode from "@/components/PemindaiBarcode";
import { cocokkanBarcode, pesanHasilBarcode, type BarangRingkas } from "@/lib/domain/barcode";
import { hitungKembalian, hitungTotal } from "@/lib/domain/stok";
import { JALUR_INPUT, type JalurInput } from "@/lib/validasi/penjualan";

type Barang = BarangRingkas & {
  kodeBarcode: string | null;
  stokMinimum: number;
  favorit: boolean;
  stokTotal: number;
};

type Lini = { idLini: number; namaLini: string };

type ItemKeranjang = {
  kunci: string;
  idBarang: number | null;
  namaItem: string;
  satuan: string;
  hargaSatuan: number;
  jumlah: number;
  jalurInput: JalurInput;
  idLini: number;
  stokTotal: number | null;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const LABEL_JALUR: Record<JalurInput, string> = {
  scan: "Pindai Barcode",
  favorit: "Favorit",
  manual: "Harga Manual",
};

function kunciItem(item: { idBarang: number | null; hargaSatuan: number; jalurInput: JalurInput }): string {
  return `${item.idBarang ?? "manual"}:${item.jalurInput}:${item.hargaSatuan}`;
}

export default function HalamanJual() {
  const [jalur, setJalur] = useState<JalurInput>("scan");
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const total = useMemo(() => hitungTotal(keranjang), [keranjang]);

  const itemKurang = keranjang.filter(
    (i) => i.stokTotal !== null && i.jumlah > i.stokTotal,
  );

  const tambahItem = useCallback((item: Omit<ItemKeranjang, "kunci">) => {
    setKeranjang((lama) => {
      const kunci = kunciItem(item);
      const ada = lama.find((i) => i.kunci === kunci);
      if (ada) {
        return lama.map((i) => (i.kunci === kunci ? { ...i, jumlah: i.jumlah + item.jumlah } : i));
      }
      return [...lama, { ...item, kunci }];
    });
  }, []);

  const tambahBarang = useCallback(
    (b: Barang, j: JalurInput) => {
      tambahItem({
        idBarang: b.idBarang,
        namaItem: b.namaBarang,
        satuan: b.satuan,
        hargaSatuan: b.hargaJualAktif,
        jumlah: 1,
        jalurInput: j,
        idLini: b.idLini,
        stokTotal: b.tipe === "jasa" ? null : b.stokTotal,
      });
      setPesan(`${b.namaBarang} ditambahkan`);
      setGalat(null);
    },
    [tambahItem],
  );

  const ubahJumlah = (kunci: string, delta: number) => {
    setKeranjang((lama) =>
      lama
        .map((i) => (i.kunci === kunci ? { ...i, jumlah: Math.max(0, i.jumlah + delta) } : i))
        .filter((i) => i.jumlah > 0),
    );
  };

  const ubahHarga = (kunci: string, harga: number) => {
    setKeranjang((lama) => lama.map((i) => (i.kunci === kunci ? { ...i, hargaSatuan: harga } : i)));
  };

  const hapusItem = (kunci: string) => {
    setKeranjang((lama) => lama.filter((i) => i.kunci !== kunci));
  };

  return (
    <div className="flex flex-col gap-4 pb-40">
      <h1 className="text-xl font-bold">Jual</h1>

      <div className="grid grid-cols-3 gap-2">
        {JALUR_INPUT.map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => setJalur(j)}
            className={`min-h-12 rounded-xl border px-2 text-sm font-medium ${
              jalur === j
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {LABEL_JALUR[j]}
          </button>
        ))}
      </div>

      {galat && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}
      {pesan && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pesan}</p>
      )}

      {jalur === "scan" && <JalurScan onTambah={tambahBarang} setGalat={setGalat} />}
      {jalur === "favorit" && <JalurFavorit onTambah={tambahBarang} setGalat={setGalat} />}
      {jalur === "manual" && <JalurManual onTambah={tambahItem} />}

      <Keranjang
        keranjang={keranjang}
        total={total}
        onUbahJumlah={ubahJumlah}
        onUbahHarga={ubahHarga}
        onHapus={hapusItem}
        itemKurang={itemKurang}
        onSelesai={() => {
          setKeranjang([]);
          setPesan(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jalur 1: Pindai barcode
// ---------------------------------------------------------------------------

function JalurScan({
  onTambah,
  setGalat,
}: {
  onTambah: (b: Barang, j: JalurInput) => void;
  setGalat: (s: string | null) => void;
}) {
  const [bukaKamera, setBukaKamera] = useState(false);
  const [kode, setKode] = useState("");
  const [pesanScan, setPesanScan] = useState<string | null>(null);
  const [mencari, setMencari] = useState(false);

  const cari = useCallback(
    async (kodeDicari: string) => {
      const kodeBersih = kodeDicari.trim();
      if (kodeBersih === "") return;
      setMencari(true);
      setPesanScan(null);
      setGalat(null);
      try {
        const res = await fetch(`/api/barang?q=${encodeURIComponent(kodeBersih)}&limit=10`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { barang: Barang[] };
        const hasil = cocokkanBarcode(kodeBersih, data.barang);
        setPesanScan(pesanHasilBarcode(hasil));
        if (hasil.jenis === "ditemukan") onTambah(hasil.barang as Barang, "scan");
      } catch {
        setGalat("Tidak bisa mencari barcode. Coba lagi atau cari manual.");
      } finally {
        setMencari(false);
      }
    },
    [onTambah, setGalat],
  );

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <button
        type="button"
        onClick={() => setBukaKamera(true)}
        className="min-h-14 rounded-xl bg-emerald-600 text-base font-semibold text-white"
      >
        Buka Kamera
      </button>

      <div className="flex gap-2">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void cari(kode);
          }}
          placeholder="Ketik / tempel kode barcode…"
          className="min-h-12 flex-1 rounded-xl border border-zinc-300 px-3"
        />
        <button
          type="button"
          onClick={() => void cari(kode)}
          disabled={mencari}
          className="min-h-12 rounded-xl border border-emerald-600 px-4 font-medium text-emerald-700 disabled:opacity-50"
        >
          {mencari ? "…" : "Cari"}
        </button>
      </div>

      {pesanScan && <p className="text-sm text-zinc-600">{pesanScan}</p>}
      <p className="text-xs text-zinc-500">
        Barcode tak dikenal? Pakai tab Harga Manual atau Favorit.
      </p>

      {bukaKamera && (
        <PemindaiBarcode
          onTutup={() => setBukaKamera(false)}
          onHasil={(hasilKode) => {
            setBukaKamera(false);
            setKode(hasilKode);
            void cari(hasilKode);
          }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Jalur 2: Favorit
// ---------------------------------------------------------------------------

function JalurFavorit({
  onTambah,
  setGalat,
}: {
  onTambah: (b: Barang, j: JalurInput) => void;
  setGalat: (s: string | null) => void;
}) {
  const [daftar, setDaftar] = useState<Barang[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    fetch("/api/barang?favorit=1&limit=100")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { barang: Barang[] };
        setDaftar(data.barang);
      })
      .catch(() => setGalat("Gagal memuat barang favorit."))
      .finally(() => setMemuat(false));
  }, [setGalat]);

  if (memuat) return <p className="text-sm text-zinc-500">Memuat favorit…</p>;

  return (
    <section className="flex flex-col gap-2">
      {daftar.length === 0 && (
        <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
          Belum ada barang favorit. Tandai favorit dari data master.
        </p>
      )}
      {daftar.map((b) => (
        <button
          key={b.idBarang}
          type="button"
          onClick={() => onTambah(b, "favorit")}
          className="flex min-h-14 items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left hover:border-emerald-500"
        >
          <span>
            <span className="block font-medium">{b.namaBarang}</span>
            <span className="text-xs text-zinc-500">
              {b.namaLini} · stok {b.tipe === "jasa" ? "—" : `${b.stokTotal} ${b.satuan}`}
            </span>
          </span>
          <span className="font-semibold">{rupiah.format(b.hargaJualAktif)}</span>
        </button>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Jalur 3: Harga manual (tidak mengubah harga master — BR-02)
// ---------------------------------------------------------------------------

function JalurManual({
  onTambah,
}: {
  onTambah: (item: Omit<ItemKeranjang, "kunci">) => void;
}) {
  const [lini, setLini] = useState<Lini[]>([]);
  const [idLini, setIdLini] = useState<number | "">("");
  const [nama, setNama] = useState("");
  const [harga, setHarga] = useState("");
  const [jumlah, setJumlah] = useState("1");
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lini")
      .then(async (res) => {
        const data = (await res.json()) as { lini?: Lini[] };
        setLini(data.lini ?? []);
        if (data.lini && data.lini.length > 0) setIdLini(data.lini[0].idLini);
      })
      .catch(() => setGalat("Gagal memuat daftar lini usaha."));
  }, []);

  const simpan = () => {
    const hargaAngka = Number(harga);
    const jumlahAngka = Number(jumlah);
    if (!nama.trim()) return setGalat("Nama item wajib diisi.");
    if (!idLini) return setGalat("Lini usaha wajib dipilih.");
    if (!Number.isInteger(hargaAngka) || hargaAngka < 0)
      return setGalat("Harga harus bilangan bulat rupiah.");
    if (!(jumlahAngka > 0)) return setGalat("Jumlah harus lebih dari 0.");

    onTambah({
      idBarang: null,
      namaItem: nama.trim(),
      satuan: "pcs",
      hargaSatuan: hargaAngka,
      jumlah: jumlahAngka,
      jalurInput: "manual",
      idLini: idLini as number,
      stokTotal: null,
    });
    setNama("");
    setHarga("");
    setJumlah("1");
    setGalat(null);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">
        Harga manual hanya berlaku untuk transaksi ini dan tidak mengubah harga master.
      </p>

      <label className="text-sm font-medium">Nama item</label>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="mis. Plastik bening 1 kg"
        className="min-h-12 rounded-xl border border-zinc-300 px-3"
      />

      <label className="text-sm font-medium">Lini usaha (F07)</label>
      <select
        value={idLini}
        onChange={(e) => setIdLini(Number(e.target.value))}
        className="min-h-12 rounded-xl border border-zinc-300 bg-white px-3"
      >
        {lini.map((l) => (
          <option key={l.idLini} value={l.idLini}>
            {l.namaLini}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Harga (Rp)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            className="min-h-12 rounded-xl border border-zinc-300 px-3"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Jumlah</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.001"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="min-h-12 rounded-xl border border-zinc-300 px-3"
          />
        </div>
      </div>

      {galat && <p className="text-sm text-red-700">{galat}</p>}

      <button
        type="button"
        onClick={simpan}
        className="min-h-12 rounded-xl bg-emerald-600 font-semibold text-white"
      >
        Tambah ke Keranjang
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Keranjang + bayar tunai
// ---------------------------------------------------------------------------

function Keranjang({
  keranjang,
  total,
  onUbahJumlah,
  onUbahHarga,
  onHapus,
  itemKurang,
  onSelesai,
}: {
  keranjang: ItemKeranjang[];
  total: number;
  onUbahJumlah: (kunci: string, delta: number) => void;
  onUbahHarga: (kunci: string, harga: number) => void;
  onHapus: (kunci: string) => void;
  itemKurang: ItemKeranjang[];
  onSelesai: () => void;
}) {
  const [bukaBayar, setBukaBayar] = useState(false);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Keranjang</h2>
        {keranjang.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
            Belum ada item.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {keranjang.map((i) => (
              <li
                key={i.kunci}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{i.namaItem}</p>
                    <p className="text-xs text-zinc-500">
                      {LABEL_JALUR[i.jalurInput]}
                      {i.jalurInput === "manual" && " · harga hanya transaksi ini"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onHapus(i.kunci)}
                    className="min-h-9 rounded-lg px-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUbahJumlah(i.kunci, -1)}
                      className="min-h-10 min-w-10 rounded-lg border border-zinc-300 text-lg"
                    >
                      −
                    </button>
                    <span className="min-w-12 text-center font-semibold">{i.jumlah}</span>
                    <button
                      type="button"
                      onClick={() => onUbahJumlah(i.kunci, 1)}
                      className="min-h-10 min-w-10 rounded-lg border border-zinc-300 text-lg"
                    >
                      +
                    </button>
                  </div>

                  {i.jalurInput === "manual" ? (
                    <input
                      type="number"
                      min={0}
                      value={i.hargaSatuan}
                      onChange={(e) => onUbahHarga(i.kunci, Number(e.target.value))}
                      className="min-h-10 w-28 rounded-lg border border-zinc-300 px-2"
                    />
                  ) : (
                    <span className="text-sm text-zinc-600">
                      {rupiah.format(i.hargaSatuan)} × {i.jumlah}
                    </span>
                  )}

                  <span className="ml-auto font-semibold">
                    {rupiah.format(Math.round(i.hargaSatuan * i.jumlah))}
                  </span>
                </div>

                {i.stokTotal !== null && i.jumlah > i.stokTotal && (
                  <p className="text-xs text-amber-700">
                    Stok tercatat hanya {i.stokTotal} {i.satuan}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white p-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Total</p>
            <p className="text-2xl font-bold">{rupiah.format(total)}</p>
          </div>
          <button
            type="button"
            disabled={keranjang.length === 0}
            onClick={() => setBukaBayar(true)}
            className="min-h-14 rounded-xl bg-emerald-600 px-6 text-lg font-semibold text-white disabled:opacity-50"
          >
            Bayar Tunai
          </button>
        </div>
      </div>

      {bukaBayar && (
        <DialogBayar
          keranjang={keranjang}
          total={total}
          itemKurang={itemKurang}
          onTutup={() => setBukaBayar(false)}
          onSukses={() => {
            setBukaBayar(false);
            onSelesai();
          }}
        />
      )}
    </>
  );
}

function DialogBayar({
  keranjang,
  total,
  itemKurang,
  onTutup,
  onSukses,
}: {
  keranjang: ItemKeranjang[];
  total: number;
  itemKurang: ItemKeranjang[];
  onTutup: () => void;
  onSukses: () => void;
}) {
  const [dibayar, setDibayar] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [struk, setStruk] = useState<{ noTransaksi: string; total: number; kembalian: number } | null>(
    null,
  );
  const [lanjutStokKurang, setLanjutStokKurang] = useState(itemKurang.length === 0);
  const adaStokKurang = itemKurang.length > 0;

  const dibayarAngka = Number(dibayar || 0);
  const kembalian = hitungKembalian(total, dibayarAngka);

  async function kirim() {
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch("/api/penjualan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idTransaksi: crypto.randomUUID(),
          metode: "tunai",
          dibayar: dibayarAngka,
          items: keranjang.map((i) => ({
            idBarang: i.idBarang,
            namaItem: i.namaItem,
            jumlah: i.jumlah,
            hargaSatuan: i.hargaSatuan,
            jalurInput: i.jalurInput,
            idLini: i.idLini,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menyimpan transaksi.");
        return;
      }
      const data = (await res.json()) as {
        noTransaksi: string;
        total: number;
        kembalian: number;
      };
      setStruk(data);
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  if (struk) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center">
          <p className="text-emerald-600">Transaksi tersimpan</p>
          <p className="mt-2 text-sm text-zinc-500">{struk.noTransaksi}</p>
          <p className="mt-4 text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-bold">{rupiah.format(struk.total)}</p>
          <p className="mt-3 text-sm text-zinc-500">Kembalian</p>
          <p className="text-2xl font-bold text-emerald-700">{rupiah.format(struk.kembalian)}</p>
          <button
            type="button"
            onClick={onSukses}
            className="mt-5 min-h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white"
          >
            Transaksi Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="text-lg font-bold">Bayar Tunai</h2>
        <p className="mt-1 text-sm text-zinc-500">Total: {rupiah.format(total)}</p>

        {adaStokKurang && (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Stok kurang dari yang dicatat:</p>
            <ul className="mt-1 list-disc pl-5">
              {itemKurang.map((i) => (
                <li key={i.kunci}>
                  {i.namaItem}: diminta {i.jumlah}, tersedia {i.stokTotal}
                </li>
              ))}
            </ul>
            <p className="mt-1">Transaksi tetap bisa dilanjutkan.</p>
            {!lanjutStokKurang && (
              <button
                type="button"
                onClick={() => setLanjutStokKurang(true)}
                className="mt-2 min-h-10 w-full rounded-lg border border-amber-600 font-medium text-amber-800"
              >
                Ya, lanjutkan walau stok kurang
              </button>
            )}
          </div>
        )}

        <label className="mt-4 block text-sm font-medium">Uang diterima (Rp)</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={dibayar}
          onChange={(e) => setDibayar(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-zinc-300 px-3 text-lg"
        />

        <p className="mt-3 text-sm text-zinc-500">Kembalian</p>
        <p className="text-xl font-bold">{rupiah.format(kembalian)}</p>

        {galat && <p className="mt-3 text-sm text-red-700">{galat}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onTutup}
            className="min-h-12 flex-1 rounded-xl border border-zinc-300 font-medium"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void kirim()}
            disabled={memuat || dibayar === "" || (adaStokKurang && !lanjutStokKurang)}
            className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
          >
            {memuat ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
