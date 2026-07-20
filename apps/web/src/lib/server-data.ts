import "server-only";

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type {
  Catalog,
  CommoditySummary,
  Evidence,
  Manifest,
  MarketSummary,
  PartitionData,
  StateSummary,
} from "@/lib/types";
import { freshnessStatus } from "@/lib/types";

const dataRoot = path.join(process.cwd(), "public", "data");

let manifestPromise: Promise<Manifest> | undefined;
let evidencePromise: Promise<Evidence> | undefined;
let catalogPromise: Promise<Catalog> | undefined;
const partitionPromises = new Map<string, Promise<PartitionData>>();

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export function getManifest(): Promise<Manifest> {
  manifestPromise ??= readJson<Manifest>(path.join(dataRoot, "manifest.json"));
  return manifestPromise;
}

export async function getManifestFileSize(): Promise<number> {
  return (await stat(path.join(dataRoot, "manifest.json"))).size;
}

export function getEvidence(): Promise<Evidence> {
  evidencePromise ??= readJson<Evidence>(path.join(dataRoot, "evidence.json"));
  return evidencePromise;
}

export async function getEvidenceFileSize(): Promise<number> {
  return (await stat(path.join(dataRoot, "evidence.json"))).size;
}

export async function getPartition(
  stateSlug: string,
  commoditySlug: string,
): Promise<PartitionData> {
  const manifest = await getManifest();
  const meta = manifest.partitions.find(
    (item) => item.stateSlug === stateSlug && item.commoditySlug === commoditySlug,
  );
  if (!meta) throw new Error(`Unknown data partition: ${stateSlug}/${commoditySlug}`);

  const key = `${stateSlug}/${commoditySlug}`;
  let promise = partitionPromises.get(key);
  if (!promise) {
    promise = readJson<PartitionData>(path.join(process.cwd(), "public", meta.url));
    partitionPromises.set(key, promise);
  }
  return promise;
}

function sampledSparkline(
  points: Array<{ date: string; value: number }>,
  maximumPoints = 18,
): Array<{ date: string; value: number }> {
  if (points.length <= maximumPoints) return points;
  const interval = Math.ceil(points.length / maximumPoints);
  return points.filter((_, index) => index % interval === 0 || index === points.length - 1);
}

async function buildCatalog(): Promise<Catalog> {
  const manifest = await getManifest();
  const partitions = await Promise.all(
    manifest.partitions.map((item) => getPartition(item.stateSlug, item.commoditySlug)),
  );
  const markets: MarketSummary[] = [];
  const allVarieties = new Set<string>();

  for (const [partitionIndex, partition] of partitions.entries()) {
    const meta = manifest.partitions[partitionIndex];
    const observationsByMarket = new Map<string, typeof partition.observations>();
    const forecastsByMarket = new Map<string, typeof partition.forecasts>();

    for (const observation of partition.observations) {
      const values = observationsByMarket.get(observation.market_id) ?? [];
      values.push(observation);
      observationsByMarket.set(observation.market_id, values);
      if (observation.example_variety) allVarieties.add(observation.example_variety);
    }
    for (const forecast of partition.forecasts) {
      const values = forecastsByMarket.get(forecast.market_id) ?? [];
      values.push(forecast);
      forecastsByMarket.set(forecast.market_id, values);
    }

    for (const market of partition.markets) {
      const history = (observationsByMarket.get(market.market_id) ?? []).sort((left, right) =>
        left.date.localeCompare(right.date),
      );
      const latest = history.at(-1);
      if (!latest) continue;
      const varietyExamples = [
        ...new Set(history.map((item) => item.example_variety).filter(Boolean)),
      ].sort();
      const forecasts = (forecastsByMarket.get(market.market_id) ?? []).sort(
        (left, right) => left.target_offset_days - right.target_offset_days,
      );

      markets.push({
        ...market,
        key: `${meta.stateSlug}/${meta.commoditySlug}/${market.market_id}`,
        stateSlug: meta.stateSlug,
        commodity: partition.commodity,
        commoditySlug: meta.commoditySlug,
        route: `/markets/${meta.stateSlug}/${meta.commoditySlug}/${market.market_id}`,
        latest,
        sparkline: sampledSparkline(
          history
            .slice(-120)
            .map((item) => ({ date: item.date, value: item.representative_price })),
        ),
        varietyExamples,
        hasArrivals: history.some((item) => item.arrivals_tonnes !== null),
        forecasts,
      });
    }
  }

  markets.sort(
    (left, right) =>
      left.state.localeCompare(right.state) ||
      left.market.localeCompare(right.market) ||
      left.commodity.localeCompare(right.commodity),
  );

  const states: StateSummary[] = manifest.meta.states.map((state) => {
    const stateMarkets = markets.filter((item) => item.stateSlug === state.slug);
    const freshness = stateMarkets.map((item) =>
      freshnessStatus(item.latest_age_days, manifest.meta.freshnessThresholdDays),
    );
    const partitionRows = manifest.partitions.filter((item) => item.stateSlug === state.slug);
    return {
      ...state,
      districtCount: new Set(stateMarkets.map((item) => item.district)).size,
      seriesCount: stateMarkets.length,
      observationCount: partitionRows.reduce((total, item) => total + item.observationCount, 0),
      latestDate: stateMarkets.reduce(
        (latest, item) => (item.last_date > latest ? item.last_date : latest),
        "",
      ),
      freshSeries: freshness.filter((item) => item === "fresh").length,
      recentSeries: freshness.filter((item) => item === "recent").length,
      staleSeries: freshness.filter((item) => item === "stale").length,
    };
  });

  const commodities: CommoditySummary[] = manifest.meta.commodities.map((name) => {
    const commodityMarkets = markets.filter((item) => item.commodity === name);
    const latestByDate = new Map<string, number[]>();
    for (const market of commodityMarkets) {
      for (const point of market.sparkline) {
        const values = latestByDate.get(point.date) ?? [];
        values.push(point.value);
        latestByDate.set(point.date, values);
      }
    }
    const aggregatePoints = [...latestByDate.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, values]) => {
        const sorted = [...values].sort((left, right) => left - right);
        return { date, value: sorted[Math.floor(sorted.length / 2)] };
      });
    return {
      name,
      slug: manifest.partitions.find((item) => item.commodity === name)?.commoditySlug ?? "",
      marketCount: new Set(commodityMarkets.map((item) => item.market_id)).size,
      seriesCount: commodityMarkets.length,
      latestDate: commodityMarkets.reduce(
        (latest, item) => (item.last_date > latest ? item.last_date : latest),
        "",
      ),
      latestMin: Math.min(...commodityMarkets.map((item) => item.latest.representative_price)),
      latestMax: Math.max(...commodityMarkets.map((item) => item.latest.representative_price)),
      sparkline: sampledSparkline(aggregatePoints.slice(-90), 24),
      freshSeries: commodityMarkets.filter(
        (item) =>
          freshnessStatus(item.latest_age_days, manifest.meta.freshnessThresholdDays) === "fresh",
      ).length,
    };
  });

  return {
    markets,
    states,
    commodities,
    districts: [...new Set(markets.map((item) => item.district))].sort(),
    varietyExamples: [...allVarieties].sort(),
    arrivalsMarketCount: new Set(
      markets.filter((item) => item.hasArrivals).map((item) => item.market_id),
    ).size,
    forecastMarketCount: new Set(
      markets.filter((item) => item.forecasts.length > 0).map((item) => item.market_id),
    ).size,
  };
}

export function getCatalog(): Promise<Catalog> {
  catalogPromise ??= buildCatalog();
  return catalogPromise;
}

export async function getMarketDetail(stateSlug: string, commoditySlug: string, marketId: string) {
  const [manifest, partition] = await Promise.all([
    getManifest(),
    getPartition(stateSlug, commoditySlug),
  ]);
  const market = partition.markets.find((item) => item.market_id === marketId);
  if (!market) return null;
  return {
    manifest,
    partition,
    market,
    observations: partition.observations
      .filter((item) => item.market_id === marketId)
      .sort((left, right) => left.date.localeCompare(right.date)),
    forecasts: partition.forecasts
      .filter((item) => item.market_id === marketId)
      .sort((left, right) => left.target_offset_days - right.target_offset_days),
    seasonal: partition.seasonal
      .filter((item) => item.market_id === marketId)
      .sort((left, right) => left.month - right.month),
  };
}
