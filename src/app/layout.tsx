import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

// the fonts are downloaded at build time and served from the app itself (nothing outside holds up a screen)
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: "Telgo",
  description: "Telgo Power Projects site app",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/icons/favicon-64.png", sizes: "64x64" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Telgo", statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers(); // every page is made per request, so it gets the security policy's nonce
  return (
    <html lang="en-IN" className={`${manrope.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
