/* Service Worker POS Mismada Farm (F19 / FR-18).
 *
 * Tujuan: menyediakan kerangka aplikasi (app shell) dan data barang saat sinyal
 * lemah. Strategi:
 * - navigasi & berkas statis: network-first, jatuh ke cache bila offline;
 * - /api/barang: network-first, simpan salinan terakhir ke cache.
 * Versi cache dinaikkan (CACHE) setiap kali daftar berkas inti berubah.
 */
const CACHE = "mismada-v1";
const SHELL = ["/", "/jual", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Data barang: network-first agar harga/stok terbaru, dengan salinan cache.
  if (url.pathname.startsWith("/api/barang")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const salinan = res.clone();
          caches.open(CACHE).then((c) => c.put(req, salinan));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Navigasi halaman: network-first, jatuh ke cache saat offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const salinan = res.clone();
          caches.open(CACHE).then((c) => c.put(req, salinan));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
  }
});
