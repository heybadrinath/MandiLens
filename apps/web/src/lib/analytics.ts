import type { Observation } from "@/lib/types";

export type HistoryRange = 90 | 365 | 730 | "all";

export interface PriceChartPoint {
  date: string;
  minimum: number;
  representative: number;
  maximum: number;
  arrivals: number | null;
  anomaly: boolean;
}

export function selectHistory(observations: Observation[], range: HistoryRange): Observation[] {
  if (range === "all" || observations.length === 0) return observations;
  const lastDate = new Date(`${observations.at(-1)?.date ?? "1970-01-01"}T00:00:00Z`);
  const cutoff = new Date(lastDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - range);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return observations.filter((item) => item.date >= cutoffIso);
}

export function sampleHistory(observations: Observation[], maximumPoints = 240): Observation[] {
  if (observations.length <= maximumPoints) return observations;
  const interval = Math.ceil(observations.length / maximumPoints);
  return observations.filter(
    (item, index) => index % interval === 0 || index === observations.length - 1 || item.is_anomaly,
  );
}

export function buildPriceChartPoints(observations: Observation[]): PriceChartPoint[] {
  return sampleHistory(observations).map((item) => ({
    date: item.date,
    minimum: item.min_price,
    representative: item.representative_price,
    maximum: item.max_price,
    arrivals: item.arrivals_tonnes,
    anomaly: item.is_anomaly,
  }));
}

export function missingCalendarDays(observations: Observation[]): number {
  if (observations.length < 2) return 0;
  const first = new Date(`${observations[0].date}T00:00:00Z`).getTime();
  const last = new Date(`${observations.at(-1)?.date ?? observations[0].date}T00:00:00Z`).getTime();
  const calendarDays = Math.floor((last - first) / 86_400_000) + 1;
  return Math.max(0, calendarDays - observations.length);
}

export function reportingDays(observations: Observation[]): Set<string> {
  return new Set(observations.map((item) => item.date));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
