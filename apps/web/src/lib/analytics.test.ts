import { describe, expect, it } from "vitest";

import { buildPriceChartPoints, missingCalendarDays, selectHistory } from "@/lib/analytics";
import type { Forecast, Observation } from "@/lib/types";

const observations: Observation[] = [
  {
    commodity: "Onion",
    market_id: "1",
    date: "2026-01-01",
    min_price: 900,
    modal_price: 1_000,
    max_price: 1_100,
    arrivals_tonnes: 2,
    variety_count: 1,
    primary_variety: "Local",
    is_anomaly: false,
    anomaly_score: 0,
  },
  {
    commodity: "Onion",
    market_id: "1",
    date: "2026-01-03",
    min_price: 1_000,
    modal_price: 1_100,
    max_price: 1_200,
    arrivals_tonnes: 3,
    variety_count: 1,
    primary_variety: "Local",
    is_anomaly: false,
    anomaly_score: 0,
  },
];

const forecast: Forecast = {
  commodity: "Onion",
  market_id: "1",
  market: "Market 1",
  district: "Pune",
  observed_date: "2026-01-03",
  forecast_date: "2026-01-04",
  horizon: 1,
  current_min_price: 1_000,
  current_modal_price: 1_100,
  current_max_price: 1_200,
  current_arrivals_tonnes: 3,
  forecast_price: 1_150,
  forecast_low: 900,
  forecast_high: 1_400,
  interval_width_pct: 0.43,
  wide_interval: true,
  recent_change_pct: 0.1,
  seasonal_position_pct: 0.05,
  freshness_days: 0,
  coverage_tier: "high",
  method: "moving_average",
};

describe("history analytics", () => {
  it("filters only the requested series", () => {
    expect(selectHistory(observations, "Onion", "1", "all")).toHaveLength(2);
    expect(selectHistory(observations, "Tomato", "1", "all")).toHaveLength(0);
  });

  it("counts absent calendar reports without treating them as zero", () => {
    expect(missingCalendarDays(observations)).toBe(1);
  });

  it("joins observed history to future ranges without replacing observations", () => {
    const points = buildPriceChartPoints(observations, [forecast]);
    expect(points.at(-1)).toEqual({
      date: "2026-01-04",
      forecast: 1_150,
      forecastRange: [900, 1_400],
    });
    expect(points[1].observed).toBe(1_100);
    expect(points[1].forecast).toBe(1_100);
  });
});
