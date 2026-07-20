export type QuantityUnit = "kg" | "quintal" | "tonne";
export type TransportMethod = "total" | "per_quintal" | "per_tonne";
export type ComparisonMode = "observed" | "forecast";

export interface ComparisonPrice {
  key: string;
  market: string;
  sourceDate: string;
  targetDate: string;
  price: number;
  lowPrice: number;
  highPrice: number;
}

export interface ComparisonInput {
  quantity: number;
  quantityUnit: QuantityUnit;
  transportValue: number;
  transportMethod: TransportMethod;
  otherCosts: number;
}

export interface ComparisonResult extends ComparisonPrice {
  quantityQuintals: number;
  transportCost: number;
  otherCosts: number;
  gross: number;
  grossLow: number;
  grossHigh: number;
  amount: number;
  amountLow: number;
  amountHigh: number;
}

export function quantityToQuintals(quantity: number, unit: QuantityUnit): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new RangeError("Quantity must be a non-negative finite number.");
  }
  if (unit === "kg") return quantity / 100;
  if (unit === "tonne") return quantity * 10;
  return quantity;
}

export function calculateTransportCost(
  value: number,
  method: TransportMethod,
  quantityQuintals: number,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("Transport cost must be a non-negative finite number.");
  }
  if (method === "per_quintal") return value * quantityQuintals;
  if (method === "per_tonne") return value * (quantityQuintals / 10);
  return value;
}

export function calculateComparison(
  price: ComparisonPrice,
  input: ComparisonInput,
): ComparisonResult {
  if (!Number.isFinite(input.otherCosts) || input.otherCosts < 0) {
    throw new RangeError("Other costs must be a non-negative finite number.");
  }
  const quantityQuintals = quantityToQuintals(input.quantity, input.quantityUnit);
  const transportCost = calculateTransportCost(
    input.transportValue,
    input.transportMethod,
    quantityQuintals,
  );
  const gross = price.price * quantityQuintals;
  const grossLow = price.lowPrice * quantityQuintals;
  const grossHigh = price.highPrice * quantityQuintals;
  const costs = transportCost + input.otherCosts;
  return {
    ...price,
    quantityQuintals,
    transportCost,
    otherCosts: input.otherCosts,
    gross,
    grossLow,
    grossHigh,
    amount: gross - costs,
    amountLow: grossLow - costs,
    amountHigh: grossHigh - costs,
  };
}

export function compareOnCommonDate(
  prices: ComparisonPrice[],
  inputs: Record<string, ComparisonInput>,
): ComparisonResult[] {
  const targetDates = new Set(prices.map((item) => item.targetDate));
  if (targetDates.size > 1) {
    throw new RangeError("Markets can only be compared on one common target date.");
  }
  return prices
    .map((price) => calculateComparison(price, inputs[price.key]))
    .sort((left, right) => right.amount - left.amount || right.amountLow - left.amountLow);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function comparisonToCsv(rows: ComparisonResult[]): string {
  const header = [
    "market",
    "source_report_date",
    "comparison_target_date",
    "price_rs_per_quintal",
    "low_price",
    "high_price",
    "quantity_quintals",
    "transport_cost_rs",
    "other_entered_costs_rs",
    "estimated_amount_rs",
    "estimated_amount_low_rs",
    "estimated_amount_high_rs",
  ];
  const body = rows.map((row) => [
    row.market,
    row.sourceDate,
    row.targetDate,
    row.price.toFixed(2),
    row.lowPrice.toFixed(2),
    row.highPrice.toFixed(2),
    row.quantityQuintals.toFixed(3),
    row.transportCost.toFixed(2),
    row.otherCosts.toFixed(2),
    row.amount.toFixed(2),
    row.amountLow.toFixed(2),
    row.amountHigh.toFixed(2),
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
}
