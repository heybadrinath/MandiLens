import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ComparePage } from "@/components/compare-page";
import { DataPage } from "@/components/data-page";
import { HomePage } from "@/components/home-page";
import { HowPage } from "@/components/how-page";
import { InfoPage, type InfoKind } from "@/components/info-page";
import { MarketDetailPage } from "@/components/market-detail-page";
import { MarketsPage } from "@/components/markets-page";
import { LOCALES, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCatalog } from "@/lib/server-data";
import { isLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/types";

const primarySlugs = [
  [],
  ["markets"],
  ["compare"],
  ["data"],
  ["how-it-works"],
  ["data-quality"],
  ["forecast-reliability"],
  ["methodology"],
  ["sources"],
  ["limitations"],
  ["architecture"],
];

export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap((locale) => primarySlugs.map((slug) => ({ locale, slug })));
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug = [] } = await params;
  if (!isLocale(rawLocale)) return {};
  const dictionary = await getDictionary(rawLocale);
  const basePath = `/${slug.join("/")}`.replace(/\/$/, "") || "/";
  let title: Metadata["title"] = {
    absolute: `MandiLens — ${dictionary.common.brandTagline}`,
  };
  let description = dictionary.home.heroBody;
  if (slug[0] === "markets" && slug.length === 1) {
    title = dictionary.common.markets;
    description = dictionary.markets.body;
  } else if (slug[0] === "markets" && slug.length === 4) {
    const catalog = await getCatalog();
    const market = catalog.markets.find(
      (item) =>
        item.stateSlug === slug[1] && item.commoditySlug === slug[2] && item.market_id === slug[3],
    );
    if (market) {
      title = `${market.market} ${market.commodity}`;
      description = dictionary.detail.observedBody;
    }
  } else if (slug[0] === "compare") {
    title = dictionary.common.compare;
    description = dictionary.compare.body;
  } else if (slug[0] === "data") {
    title = dictionary.common.data;
    description = dictionary.data.body;
  } else if (slug[0] === "how-it-works") {
    title = dictionary.common.howItWorks;
    description = dictionary.how.body;
  } else {
    const kind = infoKind(slug[0]);
    if (kind) {
      title = dictionary.info[kind].title;
      description = dictionary.info[kind].body;
    }
  }
  return {
    title,
    description,
    alternates: {
      canonical: localizePath(basePath, rawLocale),
      languages: Object.fromEntries(
        LOCALES.map((item) => [item.code, localizePath(basePath, item.code)]),
      ),
    },
  };
}

export default async function LocalizedRoute({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale: rawLocale, slug = [] } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  if (slug.length === 0) return <HomePage locale={locale} />;
  if (slug[0] === "markets" && slug.length === 1) return <MarketsPage locale={locale} />;
  if (slug[0] === "markets" && slug.length === 4) {
    return (
      <MarketDetailPage
        locale={locale}
        stateSlug={slug[1]}
        commoditySlug={slug[2]}
        marketId={slug[3]}
      />
    );
  }
  if (slug[0] === "compare" && slug.length === 1) return <ComparePage locale={locale} />;
  if (slug[0] === "data" && slug.length === 1) return <DataPage locale={locale} />;
  if (slug[0] === "how-it-works" && slug.length === 1) return <HowPage locale={locale} />;
  if (slug[0] === "model-performance" && slug.length === 1) {
    redirect(localizePath("/forecast-reliability", locale));
  }
  const kind = infoKind(slug[0]);
  if (kind && slug.length === 1) return <InfoPage locale={locale} kind={kind} />;
  notFound();
}

function infoKind(value?: string): InfoKind | null {
  if (value === "data-quality") return "dataQuality";
  if (value === "forecast-reliability") return "forecastReliability";
  if (value === "methodology") return "methodology";
  if (value === "sources") return "sources";
  if (value === "limitations") return "limitations";
  if (value === "architecture") return "architecture";
  return null;
}
