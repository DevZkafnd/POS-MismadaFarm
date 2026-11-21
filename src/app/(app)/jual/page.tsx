"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Ikon, { type NamaIkon } from "@/components/Ikon";
import PemindaiBarcode from "@/components/PemindaiBarcode";
import { cocokkanBarcode, pesanHasilBarcode, type BarangRingkas } from "@/lib/domain/barcode";
import { hitungKembalian, hitungTotal } from "@/lib/domain/stok";
import { simpanKeAntrean } from "@/lib/offline/sinkron";
import { JALUR_INPUT, type JalurInput } from "@/lib/validasi/penjualan";

type Barang = BarangRingkas & {
  kodeBarcode: string | null;
  stokMinimum: number;
  favorit: boolean;
  stokTotal: number;
};

type Lini = { idLini: number; namaLini: string };

type Pelanggan = { idPelanggan: number; nama: string; noHp: string | null };

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

const IKON_JALUR: Record<JalurInput, NamaIkon> = {
  scan: "pindai",
  favorit: "centang",
  manual: "tambah",
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
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Ikon nama="jual" className="h-6 w-6" />
        Jual
      </h1>

      <div className="grid grid-cols-3 gap-2">
        {JALUR_INPUT.map((j) => (
          <button
            key={j}
            type="button"
            onClick={() => setJalur(j)}
            className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-center text-sm font-semibold transition-colors ${
              jalur === j
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Ikon nama={IKON_JALUR[j]} className="h-4 w-4 shrink-0" />
            {LABEL_JALUR[j]}
          </button>
        ))}
      </div>

      {galat && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
          {galat}
        </p>
      )}
      {pesan && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <Ikon nama="centang" className="h-4 w-4 shrink-0" />
          {pesan}
        </p>
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
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setBukaKamera(true)}
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-base font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <Ikon nama="pindai" className="h-5 w-5" />
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
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
        />
        <button
          type="button"
          onClick={() => void cari(kode)}
          disabled={mencari}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          <Ikon nama="cari" className="h-4 w-4" />
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
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm">
          Belum ada barang favorit. Tandai favorit dari data master.
        </p>
      )}
      {daftar.map((b) => (
        <button
          key={b.idBarang}
          type="button"
          onClick={() => onTambah(b, "favorit")}
          className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Ikon nama="barang" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{b.namaBarang}</span>
              <span className="text-xs text-zinc-500">
                {b.namaLini} · stok {b.tipe === "jasa" ? "—" : `${b.stokTotal} ${b.satuan}`}
              </span>
            </span>
          </span>
          <span className="shrink-0 font-semibold">{rupiah.format(b.hargaJualAktif)}</span>
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
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">
        Harga manual hanya berlaku untuk transaksi ini dan tidak mengubah harga master.
      </p>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Nama item</label>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="mis. Plastik bening 1 kg"
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Lini usaha (F07)</label>
        <select
          value={idLini}
          onChange={(e) => setIdLini(Number(e.target.value))}
          className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
        >
          {lini.map((l) => (
            <option key={l.idLini} value={l.idLini}>
              {l.namaLini}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Harga (Rp)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Jumlah</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.001"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
          />
        </div>
      </div>

      {galat && (
        <p className="flex items-center gap-2 text-sm font-medium text-red-700">
          <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
          {galat}
        </p>
      )}

      <button
        type="button"
        onClick={simpan}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        <Ikon nama="tambah" className="h-4 w-4" />
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
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Ikon nama="jual" className="h-5 w-5" />
          Keranjang
        </h2>
        {keranjang.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm">
            Belum ada item.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {keranjang.map((i) => (
              <li
                key={i.kunci}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{i.namaItem}</p>
                    <p className="text-xs text-zinc-500">
                      {LABEL_JALUR[i.jalurInput]}
                      {i.jalurInput === "manual" && " · harga hanya transaksi ini"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onHapus(i.kunci)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    <Ikon nama="hapus" className="h-4 w-4" />
                    Hapus
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUbahJumlah(i.kunci, -1)}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-lg text-zinc-700 transition-colors hover:bg-zinc-100"
                    >
                      −
                    </button>
                    <span className="min-w-12 text-center font-semibold">{i.jumlah}</span>
                    <button
                      type="button"
                      onClick={() => onUbahJumlah(i.kunci, 1)}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-300 bg-white text-lg text-zinc-700 transition-colors hover:bg-zinc-100"
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
                      className="min-h-10 w-28 rounded-lg border border-zinc-300 bg-white px-2 text-zinc-900"
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
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <Ikon nama="peringatan" className="h-3.5 w-3.5 shrink-0" />
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
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-lg font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Ikon nama="keuangan" className="h-5 w-5" />
            Bayar
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
  const [metode, setMetode] = useState<"tunai" | "kasbon">("tunai");
  const [dibayar, setDibayar] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [struk, setStruk] = useState<
    { noTransaksi: string; total: number; kembalian: number; offline?: boolean } | null
  >(null);
  const [lanjutStokKurang, setLanjutStokKurang] = useState(itemKurang.length === 0);
  const adaStokKurang = itemKurang.length > 0;

  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [idPelanggan, setIdPelanggan] = useState<number | "">("");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [bukaPelangganBaru, setBukaPelangganBaru] = useState(false);
  const [namaBaru, setNamaBaru] = useState("");
  const [hpBaru, setHpBaru] = useState("");

  useEffect(() => {
    if (metode !== "kasbon") return;
    let batal = false;
    fetch("/api/pelanggan")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { pelanggan: Pelanggan[] };
      })
      .then((data) => {
        if (!batal) setPelanggan(data.pelanggan);
      })
      .catch(() => {
        if (!batal) setGalat("Gagal memuat daftar pelanggan.");
      });
    return () => {
      batal = true;
    };
  }, [metode]);

  const dibayarAngka = Number(dibayar || 0);
  const kembalian = hitungKembalian(total, dibayarAngka);

  async function tambahPelanggan() {
    if (!namaBaru.trim()) return setGalat("Nama pelanggan wajib diisi.");
    setGalat(null);
    try {
      const res = await fetch("/api/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: namaBaru.trim(), noHp: hpBaru.trim() || null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { pesan?: string };
        setGalat(data.pesan ?? "Gagal menambah pelanggan.");
        return;
      }
      const data = (await res.json()) as { pelanggan: Pelanggan };
      setPelanggan((lama) =>
        [...lama, data.pelanggan].sort((a, b) => a.nama.localeCompare(b.nama)),
      );
      setIdPelanggan(data.pelanggan.idPelanggan);
      setNamaBaru("");
      setHpBaru("");
      setBukaPelangganBaru(false);
    } catch {
      setGalat("Tidak bisa menghubungi server.");
    }
  }

  async function kirim() {
    if (metode === "kasbon" && !idPelanggan) {
      return setGalat("Pilih pelanggan untuk transaksi kasbon.");
    }
    if (metode === "kasbon" && !jatuhTempo) {
      return setGalat("Isi tanggal jatuh tempo kasbon.");
    }
    setMemuat(true);
    setGalat(null);

    const muatan = {
      idTransaksi: crypto.randomUUID(),
      metode,
      dibayar: metode === "tunai" ? dibayarAngka : undefined,
      idPelanggan: metode === "kasbon" ? idPelanggan : undefined,
      jatuhTempo: metode === "kasbon" ? jatuhTempo : undefined,
      items: keranjang.map((i) => ({
        idBarang: i.idBarang,
        namaItem: i.namaItem,
        jumlah: i.jumlah,
        hargaSatuan: i.hargaSatuan,
        jalurInput: i.jalurInput,
        idLini: i.idLini,
      })),
    };

    // F19: tanpa sinyal, transaksi disimpan ke antrean di HP (IndexedDB).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await simpanKeAntrean(muatan);
      setStruk({ noTransaksi: "Tersimpan di HP", total, kembalian, offline: true });
      setMemuat(false);
      return;
    }

    try {
      const res = await fetch("/api/penjualan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(muatan),
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
      // Koneksi putus di tengah jalan: simpan ke antrean, kirim saat online.
      await simpanKeAntrean(muatan);
      setStruk({ noTransaksi: "Tersimpan di HP", total, kembalian, offline: true });
    } finally {
      setMemuat(false);
    }
  }

  if (struk) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Ikon nama="centang" className="h-7 w-7" />
          </span>
          <p className="mt-3 font-semibold text-emerald-700">
            {struk.offline
              ? "Tersimpan di HP"
              : metode === "kasbon"
                ? "Kasbon tersimpan"
                : "Transaksi tersimpan"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">{struk.noTransaksi}</p>
          {struk.offline && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
              <Ikon nama="peringatan" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Tidak ada sinyal. Transaksi tersimpan di HP dan akan terkirim otomatis — tercatat
                tepat sekali saat kembali online.
              </span>
            </p>
          )}
          <p className="mt-4 text-sm text-zinc-500">Total</p>
          <p className="text-2xl font-bold">{rupiah.format(struk.total)}</p>
          {metode === "tunai" ? (
            <>
              <p className="mt-3 text-sm text-zinc-500">Kembalian</p>
              <p className="text-2xl font-bold text-emerald-700">{rupiah.format(struk.kembalian)}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-amber-700">
              Dicatat sebagai kasbon. Kas bertambah saat pelunasan.
            </p>
          )}
          <button
            type="button"
            onClick={onSukses}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Ikon nama="tambah" className="h-4 w-4" />
            Transaksi Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Ikon nama="keuangan" className="h-5 w-5" />
          Pembayaran
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Total: {rupiah.format(total)}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMetode("tunai")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors ${
              metode === "tunai"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Ikon nama="keuangan" className="h-4 w-4" />
            Tunai
          </button>
          <button
            type="button"
            onClick={() => setMetode("kasbon")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors ${
              metode === "kasbon"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Ikon nama="kasbon" className="h-4 w-4" />
            Kasbon
          </button>
        </div>

        {adaStokKurang && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-semibold">
              <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
              Stok kurang dari yang dicatat:
            </p>
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
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-600 bg-white px-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                <Ikon nama="centang" className="h-4 w-4" />
                Ya, lanjutkan walau stok kurang
              </button>
            )}
          </div>
        )}

        {metode === "tunai" ? (
          <>
            <label className="mt-4 block text-sm font-medium text-zinc-700">Uang diterima (Rp)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={dibayar}
              onChange={(e) => setDibayar(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-lg text-zinc-900"
            />

            <p className="mt-3 text-sm text-zinc-500">Kembalian</p>
            <p className="text-xl font-bold">{rupiah.format(kembalian)}</p>
          </>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-zinc-700">Pelanggan (wajib)</label>
            <select
              value={idPelanggan}
              onChange={(e) => setIdPelanggan(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
            >
              <option value="">— pilih pelanggan —</option>
              {pelanggan.map((p) => (
                <option key={p.idPelanggan} value={p.idPelanggan}>
                  {p.nama}
                  {p.noHp ? ` · ${p.noHp}` : ""}
                </option>
              ))}
            </select>

            {!bukaPelangganBaru ? (
              <button
                type="button"
                onClick={() => setBukaPelangganBaru(true)}
                className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <Ikon nama="akun" className="h-4 w-4" />
                + Pelanggan baru
              </button>
            ) : (
              <div className="mt-2 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <input
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  placeholder="Nama pelanggan"
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                />
                <input
                  value={hpBaru}
                  onChange={(e) => setHpBaru(e.target.value)}
                  placeholder="No. HP (opsional)"
                  className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBukaPelangganBaru(false)}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => void tambahPelanggan()}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Simpan Pelanggan
                  </button>
                </div>
              </div>
            )}

            <label className="mt-4 block text-sm font-medium text-zinc-700">Jatuh tempo (wajib)</label>
            <input
              type="date"
              value={jatuhTempo}
              onChange={(e) => setJatuhTempo(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900"
            />
          </>
        )}

        {galat && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700">
            <Ikon nama="peringatan" className="h-4 w-4 shrink-0" />
            {galat}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onTutup}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Ikon nama="tutup" className="h-4 w-4" />
            Batal
          </button>
          <button
            type="button"
            onClick={() => void kirim()}
            disabled={
              memuat ||
              (metode === "tunai" && dibayar === "") ||
              (adaStokKurang && !lanjutStokKurang)
            }
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <Ikon nama="centang" className="h-4 w-4" />
            {memuat ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
