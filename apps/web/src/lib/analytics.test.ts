import { describe, expect, it } from "vitest";

import {
  buildPriceChartPoints,
  median,
  missingCalendarDays,
  sampleHistory,
  selectHistory,
} from "@/lib/analytics";
import type { Observation } from "@/lib/types";

function observation(date: string, representativePrice: number): Observation {
  return {
    market_id: "16-707",
    date,
    min_price: representativePrice - 100,
    representative_price: representativePrice,
    max_price: representativePrice + 100,
    arrivals_tonnes: 3,
    arrival_coverage: "complete",
    variety_count: 1,
    example_variety: "Tomato",
    example_variety_basis: "largest reported arrivals",
    aggregation_method: "arrival-weighted mean of variety modal prices",
    is_anomaly: false,
    anomaly_score: 0,
  };
}

const observations = [
  observation("2025-01-01", 1_000),
  observation("2025-12-31", 1_100),
  observation("2026-01-02", 1_200),
];

describe("history analytics", () => {
  it("limits history relative to the series' own latest report", () => {
    expect(selectHistory(observations, 90)).toEqual(observations.slice(1));
    expect(selectHistory(observations, "all")).toEqual(observations);
  });

  it("counts missing calendar reports without manufacturing zero values", () => {
    expect(
      missingCalendarDays([observation("2026-01-01", 1_000), observation("2026-01-03", 1_100)]),
    ).toBe(1);
  });

  it("builds a minimum, representative, maximum, arrivals chart contract", () => {
    expect(buildPriceChartPoints([observations[0]])).toEqual([
      {
        date: "2025-01-01",
        minimum: 900,
        representative: 1_000,
        maximum: 1_100,
        arrivals: 3,
        anomaly: false,
      },
    ]);
  });

  it("samples long history while retaining the latest point", () => {
    const history = Array.from({ length: 500 }, (_, index) =>
      observation(`2026-01-${String((index % 28) + 1).padStart(2, "0")}`, index),
    );
    const sampled = sampleHistory(history, 40);
    expect(sampled.length).toBeLessThan(50);
    expect(sampled.at(-1)).toBe(history.at(-1));
  });

  it("calculates medians for even and odd samples", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 2, 1, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
