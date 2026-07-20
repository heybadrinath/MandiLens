from __future__ import annotations

from datetime import date
from typing import Any, cast

import joblib  # type: ignore[import-untyped]
import numpy as np
import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.evaluation import (
    BASELINE_COLUMNS,
    BLENDED_METHOD,
    TREE_METHOD,
    FeatureEncoder,
    blend_predictions,
    interval_for_row,
)
from mandilens_pipeline.logging_utils import log_event


def generate_forecasts(settings: PipelineSettings) -> pl.DataFrame:
    processed_root = settings.absolute_path(settings.paths.processed)
    models_root = settings.absolute_path(settings.paths.models_published)
    published_root = settings.absolute_path(settings.paths.published)
    features = pl.read_parquet(processed_root / "forecast_features.parquet")
    bundle = cast(dict[str, Any], joblib.load(models_root / "selected_model.joblib"))
    selected_method = str(bundle["selected_method"])
    interval_quantiles = cast(dict[str, dict[str, float | int]], bundle["interval_quantiles"])

    if selected_method in {TREE_METHOD, BLENDED_METHOD}:
        encoder = cast(FeatureEncoder, bundle["encoder"])
        estimator = bundle["estimator"]
        tree_predictions = np.asarray(
            estimator.predict(encoder.transform(features)), dtype=np.float64
        )
        if selected_method == BLENDED_METHOD:
            baseline_method = str(bundle["blend_baseline_method"])
            baseline_predictions = np.asarray(
                features[BASELINE_COLUMNS[baseline_method]].to_list(), dtype=np.float64
            )
            point_predictions = blend_predictions(
                baseline_predictions,
                tree_predictions,
                float(bundle["blend_tree_weight"]),
                np.asarray(features["current_price"].to_list(), dtype=np.float64),
                np.asarray(features["rolling_mean_7d"].to_list(), dtype=np.float64),
                np.asarray(features["lead_days"].to_list(), dtype=np.float64),
                float(bundle["blend_level_drift_weight"]),
            )
        else:
            point_predictions = tree_predictions
    else:
        point_predictions = np.asarray(
            features[BASELINE_COLUMNS[selected_method]].to_list(), dtype=np.float64
        )

    point_predictions = np.clip(point_predictions, 1.0, settings.quality.maximum_price_per_quintal)
    records: list[dict[str, Any]] = []
    for row, prediction in zip(features.to_dicts(), point_predictions, strict=True):
        lower, upper, interval_level, calibration_n = interval_for_row(
            row, float(prediction), interval_quantiles
        )
        lag_7 = max(float(row["lag_7d"]), 1.0)
        rolling_90 = max(float(row["rolling_mean_90d"]), 1.0)
        origin_date = cast(date, row["origin_date"])
        target_date = cast(date, row["target_date"])
        comparison_date = date.fromordinal(target_date.toordinal() - int(row["target_offset_days"]))
        records.append(
            {
                "state": row["state"],
                "commodity": row["commodity"],
                "market_id": row["market_id"],
                "market": row["market"],
                "district": row["district"],
                "comparison_date": comparison_date,
                "observed_date": origin_date,
                "forecast_date": target_date,
                "target_offset_days": int(row["target_offset_days"]),
                "lead_days": int(row["lead_days"]),
                "current_min_price": round(float(row["current_min_price"]), 2),
                "current_representative_price": round(float(row["current_price"]), 2),
                "current_max_price": round(float(row["current_max_price"]), 2),
                "current_arrivals_tonnes": (
                    None
                    if float(row["current_arrivals_missing"]) == 1.0
                    else round(float(row["current_arrivals"]), 3)
                ),
                "arrival_coverage": row["arrival_coverage"],
                "forecast_price": round(float(prediction), 2),
                "forecast_low": round(lower, 2),
                "forecast_high": round(upper, 2),
                "interval_width_pct": round((upper - lower) / max(float(prediction), 1.0), 4),
                "wide_interval": (upper - lower) / max(float(prediction), 1.0) >= 0.35,
                "interval_calibration_level": interval_level,
                "interval_calibration_samples": calibration_n,
                "recent_change_pct": round(float(row["momentum_7d"]) / lag_7, 4),
                "seasonal_position_pct": round(
                    (float(row["current_price"]) - rolling_90) / rolling_90, 4
                ),
                "relative_volatility_30d": round(float(row["relative_volatility_30d"]), 4),
                "volatility_bucket": row["volatility_bucket"],
                "freshness_days": (comparison_date - origin_date).days,
                "coverage_tier": row["coverage_tier"],
                "method": selected_method,
            }
        )
    forecasts = pl.DataFrame(records).sort(["state", "commodity", "market", "target_offset_days"])
    forecasts.write_parquet(published_root / "forecasts.parquet", compression="zstd")
    log_event(
        "forecast_generation_complete",
        rows=forecasts.height,
        series=forecasts.select(["commodity", "market_id"]).unique().height,
        common_target_dates=forecasts["forecast_date"].n_unique(),
        method=selected_method,
    )
    return forecasts
