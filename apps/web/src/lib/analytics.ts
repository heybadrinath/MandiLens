import type { Commodity, Forecast, Observation } from "@/lib/types";

export type HistoryRange = 90 | 365 | 1095 | "all";

export interface PriceChartPoint {
  date: string;
  observed?: number;
  forecast?: number;
  forecastRange?: [number, number];
  anomaly?: boolean;
}

export function selectHistory(
  observations: Observation[],
  commodity: Commodity,
  marketId: string,
  range: HistoryRange,
): Observation[] {
  const matching = observations.filter(
    (item) => item.commodity === commodity && item.market_id === marketId,
  );
  if (range === "all" || matching.length === 0) return matching;

  const lastDate = new Date(`${matching.at(-1)?.date ?? "1970-01-01"}T00:00:00Z`);
  const cutoff = new Date(lastDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - range);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return matching.filter((item) => item.date >= cutoffIso);
}

function sampledHistory(history: Observation[], maximumPoints: number): Observation[] {
  if (history.length <= maximumPoints) return history;
  const interval = Math.ceil(history.length / maximumPoints);
  return history.filter(
    (item, index) => index % interval === 0 || index === history.length - 1 || item.is_anomaly,
  );
}

export function buildPriceChartPoints(
  history: Observation[],
  forecasts: Forecast[],
  maximumHistoryPoints = 650,
): PriceChartPoint[] {
  const points = new Map<string, PriceChartPoint>();
  for (const item of sampledHistory(history, maximumHistoryPoints)) {
    points.set(item.date, {
      date: item.date,
      observed: item.modal_price,
      anomaly: item.is_anomaly,
    });
  }

  const latest = history.at(-1);
  if (latest) {
    points.set(latest.date, {
      ...(points.get(latest.date) ?? { date: latest.date }),
      observed: latest.modal_price,
      forecast: latest.modal_price,
      forecastRange: [latest.modal_price, latest.modal_price],
    });
  }

  for (const item of forecasts) {
    points.set(item.forecast_date, {
      date: item.forecast_date,
      forecast: item.forecast_price,
      forecastRange: [item.forecast_low, item.forecast_high],
    });
  }
  return [...points.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function missingCalendarDays(history: Observation[]): number {
  if (history.length < 2) return 0;
  const first = new Date(`${history[0].date}T00:00:00Z`).getTime();
  const last = new Date(`${history.at(-1)?.date ?? history[0].date}T00:00:00Z`).getTime();
  const calendarDays = Math.floor((last - first) / 86_400_000) + 1;
  return Math.max(0, calendarDays - history.length);
}
