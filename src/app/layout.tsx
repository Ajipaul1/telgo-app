import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telgo Hub",
  description: "Telgo Power Projects — Enterprise Operations Platform",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/assets/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  other: { "mobile-web-app-capable": "yes", "apple-mobile-web-app-capable": "yes", "apple-mobile-web-app-status-bar-style": "black-translucent" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060912"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#060912', margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
