from datetime import date, timedelta
from typing import Any

import numpy as np
import polars as pl
from mandilens_pipeline.evaluation import (
    _build_interval_quantiles,
    _metric_values,
    _score_intervals,
    _select_blend_parameters,
    blend_predictions,
)
from mandilens_pipeline.features import _series_features


def _rows(prices: list[float]) -> list[dict[str, Any]]:
    start = date(2026, 1, 1)
    return [
        {
            "date": start + timedelta(days=index),
            "representative_price": price,
            "min_price": price - 50,
            "max_price": price + 50,
            "arrivals_tonnes": 10.0,
            "arrival_coverage": "complete",
            "state": "Maharashtra",
            "commodity": "Onion",
            "market_id": "20-1",
            "market": "Pune APMC",
            "district": "Pune",
        }
        for index, price in enumerate(prices)
    ]


def test_future_target_does_not_change_origin_features() -> None:
    original = _series_features(_rows([100.0] * 12), "high", 1, training=True)[0]
    changed = _series_features(
        _rows([100.0] * 9 + [10_000.0] + [100.0] * 2),
        "high",
        1,
        training=True,
    )[0]

    assert original["target"] == 100.0
    assert changed["target"] == 10_000.0
    assert {key: value for key, value in original.items() if key != "target"} == {
        key: value for key, value in changed.items() if key != "target"
    }


def test_baselines_use_only_origin_and_prior_reports() -> None:
    features = _series_features(
        _rows([100, 110, 120, 130, 140, 150, 160, 170, 180, 190]),
        "high",
        1,
        training=True,
    )[0]
    assert features["current_price"] == 180.0
    assert features["baseline_last"] == 180.0
    assert features["baseline_moving_average"] == 160.0
    assert features["target"] == 190.0


def test_forecast_features_use_one_common_target_date() -> None:
    fresh = _series_features(
        _rows([100.0] * 10),
        "high",
        7,
        training=False,
        comparison_date=date(2026, 1, 10),
        display_horizon_days=3,
    )
    stale = _series_features(
        _rows([100.0] * 8),
        "high",
        7,
        training=False,
        comparison_date=date(2026, 1, 10),
        display_horizon_days=3,
    )

    assert [item["target_date"] for item in fresh] == [
        date(2026, 1, 11),
        date(2026, 1, 12),
        date(2026, 1, 13),
    ]
    assert [item["target_date"] for item in stale] == [item["target_date"] for item in fresh]
    assert [item["lead_days"] for item in fresh] == [1, 2, 3]
    assert [item["lead_days"] for item in stale] == [3, 4, 5]
    assert all("target" not in item for item in fresh + stale)


def test_error_metrics_report_scale_and_direction() -> None:
    metrics = _metric_values(
        np.array([110.0, 90.0]),
        np.array([105.0, 95.0]),
        np.array([100.0, 100.0]),
    )
    assert metrics["mae"] == 5.0
    assert metrics["directional_accuracy"] == 1.0
    assert metrics["n"] == 2


def test_blend_weight_is_selected_from_evaluation_predictions() -> None:
    common = {
        "phase": "model_selection",
        "fold_index": 0,
        "state": "Maharashtra",
        "commodity": "Onion",
        "market_id": "20-1",
        "lead_days": 1,
        "target_date": date(2026, 1, 2),
        "actual": 35.0,
        "current_price": 25.0,
        "rolling_mean_7d": 25.0,
    }
    predictions = pl.DataFrame(
        [
            {**common, "method": "moving_average", "prediction": 0.0},
            {**common, "method": "hist_gradient_boosting", "prediction": 100.0},
        ]
    )

    tree_weight, level_drift_weight = _select_blend_parameters(
        predictions, "moving_average"
    )
    blended = blend_predictions(
        np.array([0.0]),
        np.array([100.0]),
        tree_weight,
        np.array([25.0]),
        np.array([25.0]),
        np.array([1.0]),
        level_drift_weight,
    )

    assert tree_weight == 0.35
    assert level_drift_weight == 0.0
    assert blended.tolist() == [35.0]


def test_asymmetric_intervals_use_signed_prior_residuals() -> None:
    calibration: list[dict[str, Any]] = []
    for index in range(120):
        calibration.append(
            {
                "state": "Maharashtra",
                "commodity": "Onion",
                "market_id": "20-1",
                "market": "Pune APMC",
                "lead_days": 1,
                "volatility_bucket": "stable",
                "actual": 112.0 if index < 100 else 94.0,
                "prediction": 100.0,
                "current_price": 98.0,
            }
        )

    quantiles = _build_interval_quantiles(calibration, 0.8)
    scored = _score_intervals(
        [
            {
                **calibration[0],
                "actual": 111.0,
                "prediction": 100.0,
            }
        ],
        quantiles,
    )[0]

    assert scored["upper"] - 100.0 > 100.0 - scored["lower"]
    assert scored["covered"] is True
    assert scored["interval_level"] == "market"


def test_interval_always_contains_its_point_estimate() -> None:
    quantiles = {
        "__global__": {
            "lower_residual": -20.0,
            "upper_residual": -10.0,
            "n": 120,
        }
    }
    scored = _score_intervals(
        [
            {
                "state": "Maharashtra",
                "commodity": "Onion",
                "market_id": "20-1",
                "market": "Pune APMC",
                "lead_days": 1,
                "volatility_bucket": "stable",
                "actual": 95.0,
                "prediction": 100.0,
                "current_price": 98.0,
            }
        ],
        quantiles,
    )[0]

    assert scored["lower"] == 80.0
    assert scored["upper"] == 100.0
