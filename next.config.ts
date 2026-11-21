import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Izinkan akses dev dari IP jaringan lokal (mis. saat diuji dari HP).
  allowedDevOrigins: ["192.168.18.247"],
  experimental: {
    // Halaman di dalam grup (app) menahan render `{children}` sampai status login
    // selesai dicek di klien (lihat src/app/(app)/layout.tsx), sehingga navigasi
    // ke sana memang tidak "instant". Karena kita tidak mengadopsi Instant
    // Navigation, matikan validasi implisitnya agar tidak menimbulkan galat di
    // terminal dev ("Could not validate that a segment ... has instant navigation").
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
