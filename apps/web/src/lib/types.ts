export const SUPPORTED_LOCALES = [
  "en",
  "hi",
  "kn",
  "te",
  "ta",
  "ml",
  "mr",
  "or",
  "bn",
  "gu",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type CoverageTier = "high" | "standard" | string;
export type FreshnessStatus = "fresh" | "recent" | "stale";

export interface StateMeta {
  id: number;
  name: string;
  slug: string;
  commodityCount: number;
  marketCount: number;
}

export interface PartitionMeta {
  state: string;
  stateSlug: string;
  commodity: string;
  commoditySlug: string;
  url: string;
  marketCount: number;
  observationCount: number;
  forecastCount: number;
  dateRange: [string, string];
  bytes: number;
  sha256: string;
}

export interface SourceInfo {
  name: string;
  provider: string;
  catalogUrl: string;
  apiUrl: string;
  license: string;
  licenseUrl: string;
  attributionRequired: boolean;
  endorsement: boolean;
}

export interface ValidationSummary {
  source_file_count: number;
  input_records: number;
  accepted_variety_records?: number;
  accepted_records?: number;
  excluded_records: number;
  corrected_records?: number;
  unresolved_market_references?: number;
  exclusion_reasons?: Record<string, number>;
}

export interface PublishedQuality {
  records: number;
  series: number;
  markets: number;
  states: string[];
  commodities: string[];
  date_min: string;
  date_max: string;
  stale_series: number;
  long_gap_series: number;
  anomaly_records: number;
  missing_district_records: number;
}

export interface ModelMetric {
  method?: string;
  label?: string;
  segment?: string;
  n: number;
  mae: number;
  wape: number;
  smape: number;
  directional_accuracy: number;
}

export interface Manifest {
  schemaVersion: 2;
  meta: {
    generatedAt: string;
    dateRange: [string, string];
    comparisonDate: string;
    observedRecords: number;
    series: number;
    markets: number;
    states: StateMeta[];
    commodities: string[];
    priceUnit: string;
    arrivalUnit: string;
    forecastHorizonDays: number;
    freshnessThresholdDays: number;
    sourceRetrievedAt: string;
  };
  partitions: PartitionMeta[];
  source: SourceInfo;
  qualitySummary: {
    currentRefresh: ValidationSummary;
    cumulative: ValidationSummary;
    selectionWindow: {
      records: number;
      series: number;
      states: string[];
      commodities: string[];
      date_min: string;
      date_max: string;
    };
    published: PublishedQuality;
  };
  modelSummary: {
    selectedMethod: string;
    selectedLabel: string;
    holdout: {
      start: string;
      end: string;
      training_rows: number;
      test_rows: number;
      method_comparison: ModelMetric[];
    };
    selectedMetrics: ModelMetric;
    predictionInterval: {
      nominal_coverage: number;
      empirical_coverage: number;
      n: number;
      mean_width: number;
      method: string;
    };
    selectionStability: {
      required_improvement: number;
      required_fold_win_share: number;
      candidate_method: string;
      candidate_label: string;
      candidate_improvement: number;
      candidate_fold_wins: number;
      usable_folds: number;
      candidate_fold_win_share: number;
      strongest_baseline: string;
      blend: {
        method: string;
        baseline_method: string;
        baseline_label: string;
        baseline_weight: number;
        tree_weight: number;
        tested_tree_weights: number[];
        level_drift_weight: number;
        tested_level_drift_weights: number[];
      };
    };
  };
  definitions: Record<string, string>;
}

export interface MarketRecord {
  state_id: number;
  state: string;
  market_id: string;
  market: string;
  district: string;
  first_date: string;
  last_date: string;
  record_count: number;
  weekly_coverage: number;
  latest_age_days: number;
  maximum_gap_days: number;
  price_cv: number;
  coverage_tier: CoverageTier;
}

export interface Observation {
  market_id: string;
  date: string;
  min_price: number;
  representative_price: number;
  max_price: number;
  arrivals_tonnes: number | null;
  arrival_coverage: string;
  variety_count: number;
  example_variety: string;
  example_variety_basis: string;
  aggregation_method: string;
  is_anomaly: boolean;
  anomaly_score: number;
}

export interface Forecast {
  state: string;
  commodity: string;
  market_id: string;
  market: string;
  district: string;
  comparison_date: string;
  observed_date: string;
  forecast_date: string;
  target_offset_days: number;
  lead_days: number;
  current_min_price: number;
  current_representative_price: number;
  current_max_price: number;
  current_arrivals_tonnes: number | null;
  arrival_coverage: string;
  forecast_price: number;
  forecast_low: number;
  forecast_high: number;
  interval_width_pct: number;
  wide_interval: boolean;
  interval_calibration_level: string;
  interval_calibration_samples: number;
  recent_change_pct: number;
  seasonal_position_pct: number;
  relative_volatility_30d: number;
  volatility_bucket: string;
  freshness_days: number;
  coverage_tier: CoverageTier;
  method: string;
}

export interface SeasonalPoint {
  market_id: string;
  month: number;
  median_price: number;
  observations: number;
}

export interface PartitionData {
  schemaVersion: 2;
  state: string;
  commodity: string;
  markets: MarketRecord[];
  observations: Observation[];
  forecasts: Forecast[];
  seasonal: SeasonalPoint[];
}

export interface MarketSummary extends MarketRecord {
  key: string;
  stateSlug: string;
  commodity: string;
  commoditySlug: string;
  route: string;
  latest: Observation;
  sparkline: Array<{ date: string; value: number }>;
  varietyExamples: string[];
  hasArrivals: boolean;
  forecasts: Forecast[];
}

export interface StateSummary extends StateMeta {
  districtCount: number;
  seriesCount: number;
  observationCount: number;
  latestDate: string;
  freshSeries: number;
  recentSeries: number;
  staleSeries: number;
}

export interface CommoditySummary {
  name: string;
  slug: string;
  marketCount: number;
  seriesCount: number;
  latestDate: string;
  latestMin: number;
  latestMax: number;
  sparkline: Array<{ date: string; value: number }>;
  freshSeries: number;
}

export interface Catalog {
  markets: MarketSummary[];
  states: StateSummary[];
  commodities: CommoditySummary[];
  districts: string[];
  varietyExamples: string[];
  arrivalsMarketCount: number;
  forecastMarketCount: number;
}

export interface Evidence {
  schemaVersion: 2;
  quality: {
    generated_at: string;
    current_refresh_validation: ValidationSummary;
    cumulative_validation: ValidationSummary;
    selection_window: Manifest["qualitySummary"]["selectionWindow"];
    published: PublishedQuality;
  };
  model: {
    generated_at: string;
    selected_method: string;
    selected_label: string;
    selection_stability: Manifest["modelSummary"]["selectionStability"];
    selection_method_comparison: ModelMetric[];
    locked_holdout: Manifest["modelSummary"]["holdout"];
    prediction_interval: Manifest["modelSummary"]["predictionInterval"] & {
      coverage_by_state?: Array<{
        segment: string;
        n: number;
        empirical_coverage: number;
        mean_width: number;
      }>;
      coverage_by_commodity?: Array<{
        segment: string;
        n: number;
        empirical_coverage: number;
        mean_width: number;
      }>;
    };
    selected_metrics: ModelMetric;
    rolling_folds?: Array<{
      fold_index: number;
      test_start: string;
      test_end_exclusive: string;
      training_rows: number;
      test_rows: number;
    }>;
    performance_by_horizon?: ModelMetric[];
    performance_by_commodity?: ModelMetric[];
    performance_by_state?: ModelMetric[];
  };
  modelMetadata: Record<string, unknown>;
  dataset: Record<string, unknown>;
  source: SourceInfo;
}

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function freshnessStatus(days: number, threshold: number): FreshnessStatus {
  if (days <= 2) return "fresh";
  if (days <= threshold) return "recent";
  return "stale";
}
