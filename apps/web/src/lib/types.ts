export type Commodity = "Onion" | "Potato" | "Tomato";
export type CoverageTier = "high" | "lower";

export interface MarketSeries {
  commodity: Commodity;
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
  commodity: Commodity;
  market_id: string;
  date: string;
  min_price: number;
  modal_price: number;
  max_price: number;
  arrivals_tonnes: number;
  variety_count: number;
  primary_variety: string;
  is_anomaly: boolean;
  anomaly_score: number;
}

export interface Forecast {
  commodity: Commodity;
  market_id: string;
  market: string;
  district: string;
  observed_date: string;
  forecast_date: string;
  horizon: number;
  current_min_price: number;
  current_modal_price: number;
  current_max_price: number;
  current_arrivals_tonnes: number;
  forecast_price: number;
  forecast_low: number;
  forecast_high: number;
  interval_width_pct: number;
  wide_interval: boolean;
  recent_change_pct: number;
  seasonal_position_pct: number;
  freshness_days: number;
  coverage_tier: CoverageTier;
  method: string;
}

export interface SeasonalPoint {
  commodity: Commodity;
  market_id: string;
  month: number;
  median_price: number;
  observations: number;
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

export interface MandiData {
  schemaVersion: number;
  meta: {
    generatedAt: string;
    state: string;
    dateRange: [string, string];
    observedRecords: number;
    series: number;
    markets: number;
    commodities: Commodity[];
    priceUnit: string;
    arrivalUnit: string;
    forecastHorizonDays: number;
    freshnessThresholdDays: number;
    sourceRetrievedAt: string;
  };
  sources: Array<{
    name: string;
    provider: string;
    catalogUrl: string;
    apiUrl: string;
    license: string;
    licenseUrl: string;
    attributionRequired: boolean;
    endorsement: boolean;
  }>;
  markets: MarketSeries[];
  observations: Observation[];
  forecasts: Forecast[];
  seasonal: SeasonalPoint[];
  quality: {
    generated_at: string;
    validation: {
      source_file_count: number;
      input_records: number;
      accepted_variety_records: number;
      excluded_records: number;
      corrected_records: number;
      unresolved_market_references: number;
      exclusion_reasons: Record<string, number>;
    };
    published: {
      records: number;
      series: number;
      markets: number;
      state: string;
      commodities: Commodity[];
      date_min: string;
      date_max: string;
      stale_series: number;
      long_gap_series: number;
      anomaly_records: number;
      missing_district_records: number;
    };
  };
  model: {
    selected_method: string;
    selected_label: string;
    method_comparison: ModelMetric[];
    rolling_folds: Array<{
      fold_index: number;
      test_start: string;
      test_end_exclusive: string;
      training_rows: number;
      test_rows: number;
    }>;
    prediction_interval: {
      nominal_coverage: number;
      empirical_coverage: number;
      n: number;
      method: string;
    };
    performance_by_horizon: ModelMetric[];
    performance_by_commodity: ModelMetric[];
    performance_by_market: ModelMetric[];
    performance_by_coverage: ModelMetric[];
    feature_importance: Array<{ feature: string; importance: number }>;
    selected_metrics: ModelMetric;
    training: {
      rows: number;
      date_min: string;
      date_max: string;
      features: string[];
    };
  };
  modelMetadata: {
    model_version: string;
    trained_at: string;
    selected_method: string;
    selected_label: string;
    training_rows: number;
    training_date_range: [string, string];
    forecast_horizon_days: number;
    interval_coverage_target: number;
    validation: string;
    metrics: ModelMetric;
    feature_importance: Array<{ feature: string; importance: number }>;
    artifact_sha256: string;
  };
  definitions: Record<string, string>;
}
