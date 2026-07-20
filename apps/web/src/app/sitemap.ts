import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = host ? `https://${host}` : "http://localhost:3000";
  const routes = [
    "",
    "/data-quality",
    "/model-performance",
    "/methodology",
    "/sources",
    "/limitations",
  ];
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date("2026-07-20T00:00:00Z"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
