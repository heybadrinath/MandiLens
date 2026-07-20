import { describe, expect, it } from "vitest";

import {
  calculateRealization,
  calculateTransportCost,
  quantityToQuintals,
  rankMarkets,
  rankingsToCsv,
} from "@/lib/calculations";
import type { Forecast } from "@/lib/types";

const forecast = (marketId: string, price: number): Forecast => ({
  commodity: "Onion",
  market_id: marketId,
  market: `Market ${marketId}`,
  district: "Pune",
  observed_date: "2026-07-20",
  forecast_date: "2026-07-21",
  horizon: 1,
  current_min_price: price - 100,
  current_modal_price: price,
  current_max_price: price + 100,
  current_arrivals_tonnes: 10,
  forecast_price: price,
  forecast_low: price - 200,
  forecast_high: price + 200,
  interval_width_pct: 0.2,
  wide_interval: false,
  recent_change_pct: 0,
  seasonal_position_pct: 0,
  freshness_days: 1,
  coverage_tier: "high",
  method: "moving_average",
});

describe("quantity conversion", () => {
  it("converts supported units to quintals", () => {
    expect(quantityToQuintals(250, "kg")).toBe(2.5);
    expect(quantityToQuintals(2.5, "quintal")).toBe(2.5);
    expect(quantityToQuintals(1.2, "tonne")).toBe(12);
  });

  it("rejects invalid quantities", () => {
    expect(() => quantityToQuintals(-1, "kg")).toThrow(RangeError);
    expect(() => quantityToQuintals(Number.NaN, "kg")).toThrow(RangeError);
  });
});

describe("transport and realization", () => {
  it("applies each transparent transport method", () => {
    expect(calculateTransportCost(500, "total", 20)).toBe(500);
    expect(calculateTransportCost(50, "per_quintal", 20)).toBe(1_000);
    expect(calculateTransportCost(500, "per_tonne", 20)).toBe(1_000);
  });

  it("calculates point and interval net realization", () => {
    expect(
      calculateRealization({
        quantity: 1,
        quantityUnit: "tonne",
        transportValue: 2_000,
        transportMethod: "total",
        price: 2_500,
        lowPrice: 2_000,
        highPrice: 3_000,
      }),
    ).toEqual({
      quantityQuintals: 10,
      transportCost: 2_000,
      gross: 25_000,
      grossLow: 20_000,
      grossHigh: 30_000,
      net: 23_000,
      netLow: 18_000,
      netHigh: 28_000,
    });
  });
});

describe("market ranking", () => {
  it("changes rank when user costs outweigh price", () => {
    const rows = rankMarkets(
      [forecast("high", 3_000), forecast("lower", 2_800)],
      1,
      "tonne",
      "total",
      { high: 5_000, lower: 500 },
    );
    expect(rows[0].forecast.market_id).toBe("lower");
    expect(rows[0].rank).toBe(1);
  });

  it("creates an auditable CSV export", () => {
    const rows = rankMarkets([forecast("1", 2_269.53)], 10, "quintal", "total", {});
    const csv = rankingsToCsv(rows);
    expect(csv).toContain("estimated_net_low_rs");
    expect(csv).toContain("Market 1");
    expect(csv).toContain("22695.30");
    expect(csv).not.toContain("0000000003");
    expect(csv.split("\n")).toHaveLength(2);
  });
});
