import { describe, expect, it } from "vitest";

import {
  calculateComparison,
  calculateTransportCost,
  compareOnCommonDate,
  comparisonToCsv,
  quantityToQuintals,
  type ComparisonPrice,
} from "@/lib/calculations";

const price = (key: string, value: number, targetDate = "2026-07-21"): ComparisonPrice => ({
  key,
  market: `Market ${key}`,
  sourceDate: "2026-07-20",
  targetDate,
  price: value,
  lowPrice: value - 200,
  highPrice: value + 200,
});

describe("quantity and cost conversion", () => {
  it("converts supported units to quintals", () => {
    expect(quantityToQuintals(250, "kg")).toBe(2.5);
    expect(quantityToQuintals(2.5, "quintal")).toBe(2.5);
    expect(quantityToQuintals(1.2, "tonne")).toBe(12);
  });

  it("rejects invalid quantities and costs", () => {
    expect(() => quantityToQuintals(-1, "kg")).toThrow(RangeError);
    expect(() => calculateTransportCost(-1, "total", 10)).toThrow(RangeError);
  });

  it("applies total, per-quintal, and per-tonne transport methods", () => {
    expect(calculateTransportCost(500, "total", 20)).toBe(500);
    expect(calculateTransportCost(50, "per_quintal", 20)).toBe(1_000);
    expect(calculateTransportCost(500, "per_tonne", 20)).toBe(1_000);
  });
});

describe("market comparison", () => {
  it("subtracts only entered costs from the point and range", () => {
    expect(
      calculateComparison(price("a", 2_500), {
        quantity: 1,
        quantityUnit: "tonne",
        transportValue: 2_000,
        transportMethod: "total",
        otherCosts: 500,
      }),
    ).toMatchObject({
      quantityQuintals: 10,
      gross: 25_000,
      amount: 22_500,
      amountLow: 20_500,
      amountHigh: 24_500,
    });
  });

  it("orders by estimated amount when entered costs outweigh price", () => {
    const rows = compareOnCommonDate([price("high", 3_000), price("lower", 2_800)], {
      high: {
        quantity: 1,
        quantityUnit: "tonne",
        transportValue: 5_000,
        transportMethod: "total",
        otherCosts: 0,
      },
      lower: {
        quantity: 1,
        quantityUnit: "tonne",
        transportValue: 500,
        transportMethod: "total",
        otherCosts: 0,
      },
    });
    expect(rows[0].key).toBe("lower");
  });

  it("refuses to compare incompatible target dates", () => {
    expect(() =>
      compareOnCommonDate([price("a", 2_000, "2026-07-21"), price("b", 2_100, "2026-07-22")], {
        a: {
          quantity: 1,
          quantityUnit: "tonne",
          transportValue: 0,
          transportMethod: "total",
          otherCosts: 0,
        },
        b: {
          quantity: 1,
          quantityUnit: "tonne",
          transportValue: 0,
          transportMethod: "total",
          otherCosts: 0,
        },
      }),
    ).toThrow("common target date");
  });

  it("creates a precise auditable CSV", () => {
    const row = calculateComparison(price("1", 2_269.53), {
      quantity: 10,
      quantityUnit: "quintal",
      transportValue: 0,
      transportMethod: "total",
      otherCosts: 0,
    });
    const csv = comparisonToCsv([row]);
    expect(csv).toContain("comparison_target_date");
    expect(csv).toContain("Market 1");
    expect(csv).toContain("22695.30");
    expect(csv.split("\n")).toHaveLength(2);
  });
});
