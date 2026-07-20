from __future__ import annotations

from bisect import bisect_left, bisect_right
from datetime import date, timedelta
from statistics import mean, median, stdev
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.logging_utils import log_event

CATEGORICAL_FEATURES = ["commodity", "market_id", "district", "coverage_tier"]
NUMERIC_FEATURES = [
    "horizon",
    "current_price",
    "lag_1d",
    "lag_7d",
    "lag_14d",
    "lag_28d",
    "rolling_mean_7d",
    "rolling_mean_14d",
    "rolling_mean_30d",
    "rolling_mean_90d",
    "rolling_median_30d",
    "rolling_std_30d",
    "momentum_7d",
    "current_spread",
    "current_arrivals",
    "freshness_days",
    "reports_30d",
    "target_weekday",
    "target_week",
    "target_month",
]
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def _safe_mean(values: list[float]) -> float:
    return mean(values) if values else 0.0


def _series_features(
    rows: list[dict[str, Any]],
    coverage_tier: str,
    horizon_days: int,
    *,
    training: bool,
) -> list[dict[str, Any]]:
    dates: list[date] = [item["date"] for item in rows]
    prices = [float(item["modal_price"]) for item in rows]
    index_by_date = {item: index for index, item in enumerate(dates)}
    output: list[dict[str, Any]] = []

    def asof_price(origin_index: int, days_back: int) -> float:
        target = dates[origin_index] - timedelta(days=days_back)
        found = bisect_right(dates, target, 0, origin_index + 1) - 1
        return prices[found] if found >= 0 else prices[0]

    def window_values(origin_index: int, days_back: int) -> list[float]:
        lower = dates[origin_index] - timedelta(days=days_back)
        start = bisect_left(dates, lower, 0, origin_index + 1)
        return prices[start : origin_index + 1]

    origin_indices = range(8, len(rows)) if training else [len(rows) - 1]
    for origin_index in origin_indices:
        origin_date = dates[origin_index]
        current_price = prices[origin_index]
        prior_date = dates[origin_index - 1]
        rolling_7 = window_values(origin_index, 7)
        rolling_14 = window_values(origin_index, 14)
        rolling_30 = window_values(origin_index, 30)
        rolling_90 = window_values(origin_index, 90)
        lag_7 = asof_price(origin_index, 7)
        shared = {
            "origin_date": origin_date,
            "commodity": rows[origin_index]["commodity"],
            "market_id": rows[origin_index]["market_id"],
            "market": rows[origin_index]["market"],
            "district": rows[origin_index]["district"],
            "coverage_tier": coverage_tier,
            "current_price": current_price,
            "current_min_price": float(rows[origin_index]["min_price"]),
            "current_max_price": float(rows[origin_index]["max_price"]),
            "current_arrivals": float(rows[origin_index]["arrivals_tonnes"] or 0.0),
            "lag_1d": asof_price(origin_index, 1),
            "lag_7d": lag_7,
            "lag_14d": asof_price(origin_index, 14),
            "lag_28d": asof_price(origin_index, 28),
            "rolling_mean_7d": _safe_mean(rolling_7),
            "rolling_mean_14d": _safe_mean(rolling_14),
            "rolling_mean_30d": _safe_mean(rolling_30),
            "rolling_mean_90d": _safe_mean(rolling_90),
            "rolling_median_30d": median(rolling_30),
            "rolling_std_30d": stdev(rolling_30) if len(rolling_30) >= 2 else 0.0,
            "momentum_7d": current_price - lag_7,
            "current_spread": float(rows[origin_index]["max_price"])
            - float(rows[origin_index]["min_price"]),
            "freshness_days": (origin_date - prior_date).days,
            "reports_30d": len(rolling_30),
            "baseline_last": current_price,
            "baseline_moving_average": _safe_mean(rolling_7[-5:]),
            "baseline_seasonal_naive": lag_7,
        }
        for horizon in range(1, horizon_days + 1):
            target_date = origin_date + timedelta(days=horizon)
            target_index = index_by_date.get(target_date)
            if training and target_index is None:
                continue
            output.append(
                {
                    **shared,
                    "target_date": target_date,
                    "horizon": horizon,
                    "target_weekday": target_date.weekday(),
                    "target_week": target_date.isocalendar().week,
                    "target_month": target_date.month,
                    **({"target": prices[target_index]} if target_index is not None else {}),
                }
            )
    return output


def build_features(settings: PipelineSettings) -> tuple[pl.DataFrame, pl.DataFrame]:
    published_root = settings.absolute_path(settings.paths.published)
    processed_root = settings.absolute_path(settings.paths.processed)
    history = pl.read_parquet(published_root / "market_history.parquet").sort(
        ["commodity", "market_id", "date"]
    )
    coverage = pl.read_parquet(published_root / "market_coverage.parquet")
    coverage_map = {
        (str(item["commodity"]), str(item["market_id"])): str(item["coverage_tier"])
        for item in coverage.iter_rows(named=True)
    }

    training_rows: list[dict[str, Any]] = []
    forecast_rows: list[dict[str, Any]] = []
    for group in history.partition_by(["commodity", "market_id"], maintain_order=True):
        rows = group.sort("date").to_dicts()
        if len(rows) < 9:
            continue
        key = (str(rows[0]["commodity"]), str(rows[0]["market_id"]))
        tier = coverage_map.get(key, "lower")
        training_rows.extend(
            _series_features(
                rows,
                tier,
                settings.model.forecast_horizon_days,
                training=True,
            )
        )
        forecast_rows.extend(
            _series_features(
                rows,
                tier,
                settings.model.forecast_horizon_days,
                training=False,
            )
        )

    training = pl.DataFrame(training_rows).sort(["target_date", "commodity", "market"])
    forecast = pl.DataFrame(forecast_rows).sort(["commodity", "market", "horizon"])
    training.write_parquet(processed_root / "training_features.parquet", compression="zstd")
    forecast.write_parquet(processed_root / "forecast_features.parquet", compression="zstd")
    log_event(
        "features_complete",
        training_rows=training.height,
        forecast_rows=forecast.height,
        feature_count=len(MODEL_FEATURES),
    )
    return training, forecast
