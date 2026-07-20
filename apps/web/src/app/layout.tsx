import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Noto_Sans } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(productionHost ? `https://${productionHost}` : "http://localhost:3000"),
  title: {
    default: "MandiLens — Maharashtra mandi intelligence",
    template: "%s · MandiLens",
  },
  description:
    "Compare observed mandi prices, seven-day forecast ranges, data quality, and estimated net realization using official Maharashtra market reports.",
  applicationName: "MandiLens",
  keywords: [
    "mandi prices",
    "AGMARKNET",
    "Maharashtra agriculture",
    "onion price",
    "tomato price",
    "potato price",
  ],
  authors: [{ name: "MandiLens project" }],
  openGraph: {
    title: "MandiLens — See the range before choosing the market",
    description:
      "Official mandi observations, honest forecasting evidence, and user-controlled cost assumptions.",
    type: "website",
    locale: "en_IN",
    siteName: "MandiLens",
  },
  twitter: {
    card: "summary_large_image",
    title: "MandiLens",
    description: "Evidence-led Maharashtra mandi intelligence.",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#0d2d52",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
