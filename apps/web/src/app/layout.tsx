import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Noto_Sans } from "next/font/google";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getManifest } from "@/lib/server-data";

import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });
const body = Noto_Sans({ variable: "--font-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(productionHost ? `https://${productionHost}` : "http://localhost:3000"),
  title: { default: "MandiLens — South India mandi information", template: "%s · MandiLens" },
  description:
    "Explore available mandi reports across South India, compare represented markets, study price history, and inspect data freshness and reliability.",
  applicationName: "MandiLens",
  keywords: [
    "mandi prices",
    "AGMARKNET",
    "South India agriculture",
    "market reports",
    "commodity prices",
  ],
  authors: [{ name: "MandiLens project" }],
  openGraph: {
    title: "MandiLens — Mandi information, in context",
    description:
      "Prepared market reports, comparison, history, data quality, and a carefully explained seven-day outlook.",
    type: "website",
    locale: "en_IN",
    siteName: "MandiLens",
  },
  twitter: {
    card: "summary_large_image",
    title: "MandiLens",
    description: "Available mandi information across South India.",
  },
  category: "agriculture",
};

export const viewport: Viewport = { themeColor: "#f1f2ee", colorScheme: "light" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const manifest = await getManifest();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="app-frame">
          <Suspense fallback={null}>
            <SiteHeader
              stateCount={manifest.meta.states.length}
              marketCount={manifest.meta.markets}
              latestDate={manifest.meta.dateRange[1]}
            />
          </Suspense>
          <div className="app-workspace">
            <main id="main-content">{children}</main>
            <SiteFooter sourceUrl={manifest.source.catalogUrl} />
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
