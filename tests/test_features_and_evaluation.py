from datetime import date, timedelta
from typing import Any

import numpy as np
from mandilens_pipeline.evaluation import _calibrate_intervals, _metric_values
from mandilens_pipeline.features import _series_features


def _rows(prices: list[float]) -> list[dict[str, Any]]:
    start = date(2026, 1, 1)
    return [
        {
            "date": start + timedelta(days=index),
            "modal_price": price,
            "min_price": price - 50,
            "max_price": price + 50,
            "arrivals_tonnes": 10.0,
            "commodity": "Onion",
            "market_id": "1",
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


def test_forecast_features_include_future_dates_but_no_target() -> None:
    features = _series_features(_rows([100.0] * 10), "high", 3, training=False)
    assert [item["horizon"] for item in features] == [1, 2, 3]
    assert all("target" not in item for item in features)


def test_error_metrics_report_scale_and_direction() -> None:
    metrics = _metric_values(
        np.array([110.0, 90.0]),
        np.array([105.0, 95.0]),
        np.array([100.0, 100.0]),
    )
    assert metrics["mae"] == 5.0
    assert metrics["directional_accuracy"] == 1.0
    assert metrics["n"] == 2


def test_interval_coverage_uses_only_earlier_fold_errors() -> None:
    rows: list[dict[str, Any]] = []
    for fold_index in (0, 1):
        for index in range(40):
            rows.append(
                {
                    "fold_index": fold_index,
                    "method": "baseline",
                    "commodity": "Onion",
                    "horizon": 1,
                    "actual": 100.0 + (10 if fold_index == 0 else 5),
                    "prediction": 100.0,
                    "current_price": 100.0,
                    "market": f"Market {index}",
                    "market_id": str(index),
                    "coverage_tier": "high",
                    "target_date": date(2026, 1, 1),
                    "test_start": date(2026, 1, 1),
                }
            )

    report = _calibrate_intervals(rows, "baseline", 0.8)
    assert report["n"] == 40
    assert report["empirical_coverage"] == 1.0
