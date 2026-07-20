import type { MetadataRoute } from "next";

import { localizePath } from "@/i18n/config";
import { getCatalog, getManifest } from "@/lib/server-data";
import { SUPPORTED_LOCALES } from "@/lib/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = host ? `https://${host}` : "http://localhost:3000";
  const [manifest, catalog] = await Promise.all([getManifest(), getCatalog()]);
  const primary = [
    "/",
    "/markets",
    "/compare",
    "/data",
    "/how-it-works",
    "/data-quality",
    "/forecast-reliability",
    "/methodology",
    "/sources",
    "/limitations",
    "/architecture",
  ];
  const localized = SUPPORTED_LOCALES.flatMap((locale) =>
    primary.map((route) => ({
      url: `${base}${localizePath(route, locale)}`,
      lastModified: new Date(manifest.meta.generatedAt),
      changeFrequency:
        route === "/" || route === "/markets" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "/" ? 1 : route === "/markets" ? 0.9 : 0.7,
    })),
  );
  const details = catalog.markets.map((market) => ({
    url: `${base}${market.route}`,
    lastModified: new Date(manifest.meta.generatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  return [...localized, ...details];
}
