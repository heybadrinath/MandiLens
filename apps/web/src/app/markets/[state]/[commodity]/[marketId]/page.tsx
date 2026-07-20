import type { Metadata } from "next";

import { MarketDetailPage } from "@/components/market-detail-page";
import { getCatalog } from "@/lib/server-data";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.markets.map((item) => ({
    state: item.stateSlug,
    commodity: item.commoditySlug,
    marketId: item.market_id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; commodity: string; marketId: string }>;
}): Promise<Metadata> {
  const { state, commodity, marketId } = await params;
  const catalog = await getCatalog();
  const market = catalog.markets.find(
    (item) =>
      item.stateSlug === state && item.commoditySlug === commodity && item.market_id === marketId,
  );
  return market
    ? {
        title: `${market.market} ${market.commodity}`,
        description: `Observed ${market.commodity} reports, history, arrivals, seasonality, data completeness, and seven-day outlook for ${market.market}.`,
      }
    : { title: "Market not found" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ state: string; commodity: string; marketId: string }>;
}) {
  const { state, commodity, marketId } = await params;
  return (
    <MarketDetailPage locale="en" stateSlug={state} commoditySlug={commodity} marketId={marketId} />
  );
}
