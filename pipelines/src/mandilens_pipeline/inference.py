from __future__ import annotations

from datetime import date
from typing import Any, cast

import joblib  # type: ignore[import-untyped]
import numpy as np
import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.evaluation import BASELINE_COLUMNS, FeatureEncoder, _interval_key
from mandilens_pipeline.logging_utils import log_event


def generate_forecasts(settings: PipelineSettings) -> pl.DataFrame:
    processed_root = settings.absolute_path(settings.paths.processed)
    models_root = settings.absolute_path(settings.paths.models_published)
    published_root = settings.absolute_path(settings.paths.published)
    features = pl.read_parquet(processed_root / "forecast_features.parquet")
    bundle = cast(dict[str, Any], joblib.load(models_root / "selected_model.joblib"))
    selected_method = str(bundle["selected_method"])
    interval_quantiles = cast(dict[str, float], bundle["interval_quantiles"])

    if selected_method == "hist_gradient_boosting":
        encoder = cast(FeatureEncoder, bundle["encoder"])
        estimator = bundle["estimator"]
        point_predictions = np.asarray(
            estimator.predict(encoder.transform(features)), dtype=np.float64
        )
    else:
        point_predictions = np.asarray(
            features[BASELINE_COLUMNS[selected_method]].to_list(), dtype=np.float64
        )

    point_predictions = np.clip(point_predictions, 1.0, settings.quality.maximum_price_per_quintal)
    records: list[dict[str, Any]] = []
    global_radius = float(interval_quantiles.get("__global__", 0.0))
    for row, prediction in zip(features.to_dicts(), point_predictions, strict=True):
        key = _interval_key(str(row["commodity"]), int(row["horizon"]))
        radius = float(interval_quantiles.get(key, global_radius))
        lower = max(1.0, float(prediction) - radius)
        upper = float(prediction) + radius
        lag_7 = max(float(row["lag_7d"]), 1.0)
        rolling_90 = max(float(row["rolling_mean_90d"]), 1.0)
        origin_date = cast(date, row["origin_date"])
        records.append(
            {
                "commodity": row["commodity"],
                "market_id": row["market_id"],
                "market": row["market"],
                "district": row["district"],
                "observed_date": origin_date,
                "forecast_date": row["target_date"],
                "horizon": int(row["horizon"]),
                "current_min_price": round(float(row["current_min_price"]), 2),
                "current_modal_price": round(float(row["current_price"]), 2),
                "current_max_price": round(float(row["current_max_price"]), 2),
                "current_arrivals_tonnes": round(float(row["current_arrivals"]), 3),
                "forecast_price": round(float(prediction), 2),
                "forecast_low": round(lower, 2),
                "forecast_high": round(upper, 2),
                "interval_width_pct": round((upper - lower) / max(float(prediction), 1.0), 4),
                "wide_interval": (upper - lower) / max(float(prediction), 1.0) >= 0.35,
                "recent_change_pct": round(float(row["momentum_7d"]) / lag_7, 4),
                "seasonal_position_pct": round(
                    (float(row["current_price"]) - rolling_90) / rolling_90, 4
                ),
                "freshness_days": (settings.source.end_date - origin_date).days,
                "coverage_tier": row["coverage_tier"],
                "method": selected_method,
            }
        )
    forecasts = pl.DataFrame(records).sort(["commodity", "market", "horizon"])
    forecasts.write_parquet(published_root / "forecasts.parquet", compression="zstd")
    log_event(
        "forecast_generation_complete",
        rows=forecasts.height,
        series=forecasts.select(["commodity", "market_id"]).unique().height,
        method=selected_method,
    )
    return forecasts
