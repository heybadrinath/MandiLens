import type { Forecast } from "@/lib/types";

export type QuantityUnit = "kg" | "quintal" | "tonne";
export type TransportMethod = "total" | "per_quintal" | "per_tonne";

export interface RealizationInput {
  quantity: number;
  quantityUnit: QuantityUnit;
  transportValue: number;
  transportMethod: TransportMethod;
  price: number;
  lowPrice: number;
  highPrice: number;
}

export interface RankedMarket {
  forecast: Forecast;
  rank: number;
  quantityQuintals: number;
  transportCost: number;
  gross: number;
  grossLow: number;
  grossHigh: number;
  net: number;
  netLow: number;
  netHigh: number;
}

export function quantityToQuintals(quantity: number, unit: QuantityUnit): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError("Quantity must be a non-negative finite number.");
  }

  switch (unit) {
    case "kg":
      return quantity / 100;
    case "quintal":
      return quantity;
    case "tonne":
      return quantity * 10;
  }
}

export function calculateTransportCost(
  value: number,
  method: TransportMethod,
  quantityQuintals: number,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("Transport cost must be a non-negative finite number.");
  }

  switch (method) {
    case "total":
      return value;
    case "per_quintal":
      return value * quantityQuintals;
    case "per_tonne":
      return value * (quantityQuintals / 10);
  }
}

export function calculateRealization(input: RealizationInput) {
  const quantityQuintals = quantityToQuintals(input.quantity, input.quantityUnit);
  const transportCost = calculateTransportCost(
    input.transportValue,
    input.transportMethod,
    quantityQuintals,
  );
  const gross = input.price * quantityQuintals;
  const grossLow = input.lowPrice * quantityQuintals;
  const grossHigh = input.highPrice * quantityQuintals;

  return {
    quantityQuintals,
    transportCost,
    gross,
    grossLow,
    grossHigh,
    net: gross - transportCost,
    netLow: grossLow - transportCost,
    netHigh: grossHigh - transportCost,
  };
}

export function rankMarkets(
  forecasts: Forecast[],
  quantity: number,
  quantityUnit: QuantityUnit,
  transportMethod: TransportMethod,
  costsByMarket: Record<string, number>,
): RankedMarket[] {
  const ranked = forecasts.map((forecast) => ({
    forecast,
    ...calculateRealization({
      quantity,
      quantityUnit,
      transportValue: costsByMarket[forecast.market_id] ?? 0,
      transportMethod,
      price: forecast.forecast_price,
      lowPrice: forecast.forecast_low,
      highPrice: forecast.forecast_high,
    }),
  }));

  return ranked
    .sort((left, right) => right.net - left.net || right.netLow - left.netLow)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvDecimal(value: number, places: number): string {
  return value.toFixed(places);
}

export function rankingsToCsv(rows: RankedMarket[]): string {
  const header = [
    "rank",
    "commodity",
    "district",
    "market",
    "forecast_date",
    "forecast_price_rs_per_quintal",
    "forecast_low",
    "forecast_high",
    "quantity_quintals",
    "transport_cost_rs",
    "estimated_net_rs",
    "estimated_net_low_rs",
    "estimated_net_high_rs",
    "freshness_days",
  ];
  const lines = rows.map((row) => [
    row.rank,
    row.forecast.commodity,
    row.forecast.district,
    row.forecast.market,
    row.forecast.forecast_date,
    csvDecimal(row.forecast.forecast_price, 2),
    csvDecimal(row.forecast.forecast_low, 2),
    csvDecimal(row.forecast.forecast_high, 2),
    csvDecimal(row.quantityQuintals, 3),
    csvDecimal(row.transportCost, 2),
    csvDecimal(row.net, 2),
    csvDecimal(row.netLow, 2),
    csvDecimal(row.netHigh, 2),
    row.forecast.freshness_days,
  ]);

  return [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\n");
}
