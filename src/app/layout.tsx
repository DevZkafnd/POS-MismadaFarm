import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import DaftarServiceWorker from "@/components/DaftarServiceWorker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POS Mismada Farm",
  description: "Aplikasi kasir dan pencatatan usaha Mismada Farm.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "POS Mismada" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
        <DaftarServiceWorker />
      </body>
    </html>
  );
}
