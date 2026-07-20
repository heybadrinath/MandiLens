from __future__ import annotations

from bisect import bisect_left, bisect_right
from datetime import date, timedelta
from statistics import mean, median, stdev
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.logging_utils import log_event

CATEGORICAL_FEATURES = [
    "state",
    "commodity",
    "market_id",
    "district",
    "coverage_tier",
    "volatility_bucket",
    "arrival_coverage",
]
NUMERIC_FEATURES = [
    "lead_days",
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
    "relative_volatility_30d",
    "momentum_7d",
    "current_spread",
    "current_arrivals",
    "current_arrivals_missing",
    "reporting_gap_days",
    "data_age_days",
    "reports_30d",
    "target_weekday",
    "target_week",
    "target_month",
]
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def _safe_mean(values: list[float]) -> float:
    return mean(values) if values else 0.0


def _volatility_bucket(relative_volatility: float) -> str:
    if relative_volatility < 0.08:
        return "stable"
    if relative_volatility < 0.20:
        return "variable"
    return "volatile"


def _series_features(
    rows: list[dict[str, Any]],
    coverage_tier: str,
    maximum_lead_days: int,
    *,
    training: bool,
    comparison_date: date | None = None,
    display_horizon_days: int | None = None,
) -> list[dict[str, Any]]:
    dates: list[date] = [item["date"] for item in rows]
    prices = [float(item["representative_price"]) for item in rows]
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
        rolling_std = stdev(rolling_30) if len(rolling_30) >= 2 else 0.0
        rolling_mean = _safe_mean(rolling_30)
        relative_volatility = rolling_std / max(rolling_mean, 1.0)
        current_arrivals = rows[origin_index].get("arrivals_tonnes")
        shared = {
            "origin_date": origin_date,
            "state": rows[origin_index]["state"],
            "commodity": rows[origin_index]["commodity"],
            "market_id": rows[origin_index]["market_id"],
            "market": rows[origin_index]["market"],
            "district": rows[origin_index]["district"],
            "coverage_tier": coverage_tier,
            "volatility_bucket": _volatility_bucket(relative_volatility),
            "arrival_coverage": rows[origin_index]["arrival_coverage"],
            "current_price": current_price,
            "current_min_price": float(rows[origin_index]["min_price"]),
            "current_max_price": float(rows[origin_index]["max_price"]),
            "current_arrivals": float(current_arrivals or 0.0),
            "current_arrivals_missing": 1.0 if current_arrivals is None else 0.0,
            "lag_1d": asof_price(origin_index, 1),
            "lag_7d": lag_7,
            "lag_14d": asof_price(origin_index, 14),
            "lag_28d": asof_price(origin_index, 28),
            "rolling_mean_7d": _safe_mean(rolling_7),
            "rolling_mean_14d": _safe_mean(rolling_14),
            "rolling_mean_30d": rolling_mean,
            "rolling_mean_90d": _safe_mean(rolling_90),
            "rolling_median_30d": median(rolling_30),
            "rolling_std_30d": rolling_std,
            "relative_volatility_30d": relative_volatility,
            "momentum_7d": current_price - lag_7,
            "current_spread": float(rows[origin_index]["max_price"])
            - float(rows[origin_index]["min_price"]),
            "reporting_gap_days": (origin_date - prior_date).days,
            "reports_30d": len(rolling_30),
            "baseline_last": current_price,
            "baseline_moving_average": _safe_mean(rolling_7[-5:]),
            "baseline_seasonal_naive": lag_7,
        }
        if training:
            targets = [
                (origin_date + timedelta(days=lead), lead, lead)
                for lead in range(1, maximum_lead_days + 1)
            ]
            data_age_days = 0
        else:
            if comparison_date is None or display_horizon_days is None:
                raise ValueError("Forecast features require a common comparison date and horizon")
            targets = [
                (
                    comparison_date + timedelta(days=offset),
                    (comparison_date + timedelta(days=offset) - origin_date).days,
                    offset,
                )
                for offset in range(1, display_horizon_days + 1)
            ]
            data_age_days = (comparison_date - origin_date).days

        for target_date, lead_days, target_offset_days in targets:
            if lead_days < 1 or lead_days > maximum_lead_days:
                continue
            target_index = index_by_date.get(target_date)
            if training and target_index is None:
                continue
            output.append(
                {
                    **shared,
                    "target_date": target_date,
                    "lead_days": lead_days,
                    "target_offset_days": target_offset_days,
                    "data_age_days": data_age_days,
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
        ["state", "commodity", "market_id", "date"]
    )
    coverage = pl.read_parquet(published_root / "market_coverage.parquet")
    coverage_map = {
        (str(item["commodity"]), str(item["market_id"])): str(item["coverage_tier"])
        for item in coverage.iter_rows(named=True)
    }
    comparison_date = history["date"].max()
    if not isinstance(comparison_date, date):
        raise RuntimeError("Published history has no valid comparison date")

    training_frames: list[pl.DataFrame] = []
    forecast_frames: list[pl.DataFrame] = []
    skipped_forecast_series = 0
    for group in history.partition_by(["commodity", "market_id"], maintain_order=True):
        rows = group.sort("date").to_dicts()
        if len(rows) < 9:
            continue
        key = (str(rows[0]["commodity"]), str(rows[0]["market_id"]))
        tier = coverage_map.get(key, "standard")
        series_training = _series_features(
            rows,
            tier,
            settings.model.maximum_lead_days,
            training=True,
        )
        if series_training:
            # Convert one series at a time so multi-state runs do not retain millions of
            # Python dictionaries before Polars can compact them into columnar memory.
            training_frames.append(pl.DataFrame(series_training))
        series_forecasts = _series_features(
            rows,
            tier,
            settings.model.maximum_lead_days,
            training=False,
            comparison_date=comparison_date,
            display_horizon_days=settings.model.forecast_horizon_days,
        )
        if len(series_forecasts) != settings.model.forecast_horizon_days:
            skipped_forecast_series += 1
            continue
        forecast_frames.append(pl.DataFrame(series_forecasts))

    if not training_frames or not forecast_frames:
        raise RuntimeError("No eligible training or forecast feature rows were produced")
    training = pl.concat(training_frames, how="vertical_relaxed").sort(
        ["target_date", "state", "commodity", "market"]
    )
    forecast = pl.concat(forecast_frames, how="vertical_relaxed").sort(
        ["state", "commodity", "market", "target_offset_days"]
    )
    training.write_parquet(processed_root / "training_features.parquet", compression="zstd")
    forecast.write_parquet(processed_root / "forecast_features.parquet", compression="zstd")
    log_event(
        "features_complete",
        training_rows=training.height,
        forecast_rows=forecast.height,
        feature_count=len(MODEL_FEATURES),
        common_comparison_date=comparison_date.isoformat(),
        skipped_forecast_series=skipped_forecast_series,
    )
    return training, forecast
