import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";

/* Self-hosted at build time by next/font, which also emits the preload links.
   The countdown must not FOUT at 5:58 a.m., so both faces block on swap
   through a fallback with matching metrics. */
const caprasimo = Caprasimo({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const figtree = Figtree({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Dibs",
  description: "Never miss a kids' activity registration window.",
  applicationName: "Dibs",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    /* iOS ignores the manifest's icons for the home screen. Without this the
       installed app — the whole point of onboarding step 3 — gets a blurred
       screenshot instead of a mark. */
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Dibs",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b1916",
  width: "device-width",
  initialScale: 1,
  /* Race Mode is thumb-driven in the dark. A double-tap zoom there is a
     mis-tap, not a gesture. */
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
