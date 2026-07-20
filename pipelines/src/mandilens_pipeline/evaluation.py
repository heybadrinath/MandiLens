from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any, cast

import joblib  # type: ignore[import-untyped]
import numpy as np
import polars as pl
from sklearn.ensemble import HistGradientBoostingRegressor  # type: ignore[import-untyped]
from sklearn.inspection import permutation_importance  # type: ignore[import-untyped]

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.features import CATEGORICAL_FEATURES, MODEL_FEATURES, NUMERIC_FEATURES
from mandilens_pipeline.io_utils import sha256_file, write_json
from mandilens_pipeline.logging_utils import log_event

METHOD_LABELS = {
    "last_observation": "Last observation",
    "moving_average": "Five-report moving average",
    "seasonal_naive": "Seven-day seasonal naive",
    "hist_gradient_boosting": "Global histogram gradient boosting",
}
BASELINE_COLUMNS = {
    "last_observation": "baseline_last",
    "moving_average": "baseline_moving_average",
    "seasonal_naive": "baseline_seasonal_naive",
}


@dataclass
class FeatureEncoder:
    category_maps: dict[str, dict[str, int]]
    numeric_medians: dict[str, float]

    @classmethod
    def fit(cls, frame: pl.DataFrame) -> FeatureEncoder:
        category_maps = {
            column: {
                str(value): index
                for index, value in enumerate(
                    sorted(str(item) for item in frame[column].drop_nulls().unique().to_list())
                )
            }
            for column in CATEGORICAL_FEATURES
        }
        numeric_medians: dict[str, float] = {}
        for column in NUMERIC_FEATURES:
            value = frame[column].median()
            numeric_medians[column] = float(cast(Any, value)) if value is not None else 0.0
        return cls(category_maps=category_maps, numeric_medians=numeric_medians)

    def transform(self, frame: pl.DataFrame) -> np.ndarray:
        columns: list[np.ndarray[Any, np.dtype[np.float64]]] = []
        for column in CATEGORICAL_FEATURES:
            mapping = self.category_maps[column]
            values = np.array(
                [float(mapping.get(str(value), -1)) for value in frame[column].to_list()],
                dtype=np.float64,
            )
            columns.append(values)
        for column in NUMERIC_FEATURES:
            fallback = self.numeric_medians[column]
            values = np.array(
                [
                    fallback
                    if value is None or not math.isfinite(float(cast(Any, value)))
                    else float(cast(Any, value))
                    for value in frame[column].to_list()
                ],
                dtype=np.float64,
            )
            columns.append(values)
        return np.column_stack(columns)


def _fit_candidate(
    training: pl.DataFrame,
    seed: int,
) -> tuple[FeatureEncoder, HistGradientBoostingRegressor]:
    encoder = FeatureEncoder.fit(training)
    matrix = encoder.transform(training)
    target = training["target"].to_numpy().astype(np.float64)
    estimator = HistGradientBoostingRegressor(
        loss="absolute_error",
        learning_rate=0.05,
        max_iter=260,
        max_leaf_nodes=31,
        min_samples_leaf=35,
        l2_regularization=0.2,
        categorical_features=list(range(len(CATEGORICAL_FEATURES))),
        random_state=seed,
    )
    estimator.fit(matrix, target)
    return encoder, estimator


def _metric_values(
    actual: np.ndarray, predicted: np.ndarray, current: np.ndarray
) -> dict[str, Any]:
    error = np.abs(actual - predicted)
    denominator = np.abs(actual) + np.abs(predicted)
    directional = np.sign(predicted - current) == np.sign(actual - current)
    return {
        "n": int(actual.size),
        "mae": round(float(error.mean()), 2),
        "wape": round(float(error.sum() / max(np.abs(actual).sum(), 1.0)), 4),
        "smape": round(float(np.mean(2 * error / np.maximum(denominator, 1.0))), 4),
        "directional_accuracy": round(float(directional.mean()), 4),
    }


def _evaluate_group(rows: list[dict[str, Any]]) -> dict[str, Any]:
    actual = np.array([float(item["actual"]) for item in rows], dtype=np.float64)
    predicted = np.array([float(item["prediction"]) for item in rows], dtype=np.float64)
    current = np.array([float(item["current_price"]) for item in rows], dtype=np.float64)
    return _metric_values(actual, predicted, current)


def _segment_metrics(rows: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(str(row[field]), []).append(row)
    return [
        {"segment": segment, **_evaluate_group(items)} for segment, items in sorted(grouped.items())
    ]


def _interval_key(commodity: str, horizon: int) -> str:
    return f"{commodity}|{horizon}"


def _quantile(values: list[float], probability: float) -> float:
    if not values:
        return 0.0
    return float(np.quantile(np.array(values), probability, method="higher"))


def _calibrate_intervals(
    rows: list[dict[str, Any]],
    method: str,
    coverage: float,
) -> dict[str, Any]:
    method_rows = [item for item in rows if item["method"] == method]
    interval_rows: list[dict[str, Any]] = []
    prior: list[dict[str, Any]] = []
    for fold_index in sorted({int(item["fold_index"]) for item in method_rows}):
        current_fold = [item for item in method_rows if int(item["fold_index"]) == fold_index]
        if prior:
            global_errors = [
                abs(float(item["actual"]) - float(item["prediction"])) for item in prior
            ]
            global_quantile = _quantile(global_errors, coverage)
            grouped_errors: dict[str, list[float]] = {}
            for item in prior:
                key = _interval_key(str(item["commodity"]), int(item["horizon"]))
                grouped_errors.setdefault(key, []).append(
                    abs(float(item["actual"]) - float(item["prediction"]))
                )
            for item in current_fold:
                key = _interval_key(str(item["commodity"]), int(item["horizon"]))
                errors = grouped_errors.get(key, [])
                radius = _quantile(errors, coverage) if len(errors) >= 30 else global_quantile
                lower = max(1.0, float(item["prediction"]) - radius)
                upper = float(item["prediction"]) + radius
                interval_rows.append(
                    {
                        **item,
                        "lower": lower,
                        "upper": upper,
                        "covered": lower <= float(item["actual"]) <= upper,
                    }
                )
        prior.extend(current_fold)

    empirical_coverage = (
        sum(bool(item["covered"]) for item in interval_rows) / len(interval_rows)
        if interval_rows
        else None
    )
    return {
        "nominal_coverage": coverage,
        "empirical_coverage": round(empirical_coverage, 4)
        if empirical_coverage is not None
        else None,
        "n": len(interval_rows),
        "method": "Expanding-window absolute-error quantiles from earlier evaluation folds",
    }


def _final_interval_quantiles(
    selected_rows: list[dict[str, Any]], coverage: float
) -> dict[str, float]:
    grouped: dict[str, list[float]] = {}
    global_errors: list[float] = []
    for item in selected_rows:
        error = abs(float(item["actual"]) - float(item["prediction"]))
        global_errors.append(error)
        key = _interval_key(str(item["commodity"]), int(item["horizon"]))
        grouped.setdefault(key, []).append(error)
    global_quantile = _quantile(global_errors, coverage)
    result = {"__global__": global_quantile}
    for key, errors in grouped.items():
        result[key] = _quantile(errors, coverage) if len(errors) >= 30 else global_quantile
    return result


def _model_report_markdown(report: dict[str, Any]) -> str:
    rows = "\n".join(
        (
            "| {label} | {mae:,.2f} | {wape:.1%} | {smape:.1%} | "
            "{directional_accuracy:.1%} | {n:,} |"
        ).format(**item)
        for item in report["method_comparison"]
    )
    interval = report["prediction_interval"]
    return f"""# Model-evaluation report

Generated: {report["generated_at"]}

## Selection

**Production method:** {report["selected_label"]}

**Selection rule:** choose the lowest rolling-origin MAE, but require the machine-learning model
to improve on the strongest simple baseline by at least 1% before accepting the added complexity.

## Rolling-origin results

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
{rows}

## Uncertainty

The displayed interval targets **{interval["nominal_coverage"]:.0%}** coverage. On folds that
could be calibrated exclusively with earlier-fold residuals, empirical coverage was
**{interval["empirical_coverage"]:.1%}** across **{interval["n"]:,}** forecasts.

## Validation design

- Chronological rolling-origin folds only; no random split.
- Lag and rolling features use information available on or before each forecast origin.
- Tests score only dates with an observed source report; missing reports are not treated as zero.
- Market, commodity, date, freshness, momentum, spread, and reporting-frequency features are
  predictive context, not evidence of causation.

## Limitations

Evaluation represents the selected Maharashtra market series and the source's irregular
reporting process. Error rates can change during supply shocks, market closures, or data-entry
revisions. The interval is empirical and may be wider or narrower than future uncertainty.
"""


def evaluate_and_train(settings: PipelineSettings) -> dict[str, Any]:
    processed_root = settings.absolute_path(settings.paths.processed)
    models_root = settings.absolute_path(settings.paths.models_published)
    reports_root = settings.absolute_path(settings.paths.reports)
    features = pl.read_parquet(processed_root / "training_features.parquet")
    predictions: list[dict[str, Any]] = []
    fold_summaries: list[dict[str, Any]] = []

    for fold_index, test_start in enumerate(settings.model.evaluation_starts):
        test_end = test_start + timedelta(days=settings.model.evaluation_window_days)
        training = features.filter(pl.col("target_date") < test_start)
        testing = features.filter(
            (pl.col("target_date") >= test_start) & (pl.col("target_date") < test_end)
        )
        if training.height < 500 or testing.is_empty():
            log_event(
                "evaluation_fold_skipped",
                fold=fold_index,
                train=training.height,
                test=testing.height,
            )
            continue

        encoder, estimator = _fit_candidate(training, settings.model.random_seed + fold_index)
        tree_predictions = np.maximum(estimator.predict(encoder.transform(testing)), 1.0)
        testing_rows = testing.to_dicts()
        method_values = {
            **{
                method: np.array(testing[column].to_list(), dtype=np.float64)
                for method, column in BASELINE_COLUMNS.items()
            },
            "hist_gradient_boosting": tree_predictions,
        }
        for method, values in method_values.items():
            for row, prediction in zip(testing_rows, values, strict=True):
                predictions.append(
                    {
                        "fold_index": fold_index,
                        "test_start": test_start,
                        "method": method,
                        "commodity": row["commodity"],
                        "market": row["market"],
                        "market_id": row["market_id"],
                        "coverage_tier": row["coverage_tier"],
                        "horizon": int(row["horizon"]),
                        "target_date": row["target_date"],
                        "actual": float(row["target"]),
                        "current_price": float(row["current_price"]),
                        "prediction": float(prediction),
                    }
                )
        fold_summaries.append(
            {
                "fold_index": fold_index,
                "test_start": test_start.isoformat(),
                "test_end_exclusive": test_end.isoformat(),
                "training_rows": training.height,
                "test_rows": testing.height,
            }
        )
        log_event(
            "evaluation_fold_complete",
            fold=fold_index,
            train=training.height,
            test=testing.height,
        )

    if not predictions:
        raise RuntimeError("No chronological evaluation fold produced predictions")

    method_comparison: list[dict[str, Any]] = []
    for method in [*BASELINE_COLUMNS, "hist_gradient_boosting"]:
        rows = [item for item in predictions if item["method"] == method]
        method_comparison.append(
            {"method": method, "label": METHOD_LABELS[method], **_evaluate_group(rows)}
        )
    method_comparison.sort(key=lambda item: float(item["mae"]))
    strongest_baseline = min(
        (item for item in method_comparison if item["method"] != "hist_gradient_boosting"),
        key=lambda item: float(item["mae"]),
    )
    tree_metrics = next(
        item for item in method_comparison if item["method"] == "hist_gradient_boosting"
    )
    if float(tree_metrics["mae"]) <= float(strongest_baseline["mae"]) * 0.99:
        selected_method = "hist_gradient_boosting"
    else:
        selected_method = str(strongest_baseline["method"])

    selected_rows = [item for item in predictions if item["method"] == selected_method]
    interval_report = _calibrate_intervals(
        predictions, selected_method, settings.model.interval_coverage
    )
    interval_quantiles = _final_interval_quantiles(selected_rows, settings.model.interval_coverage)

    final_encoder: FeatureEncoder | None = None
    final_estimator: HistGradientBoostingRegressor | None = None
    feature_importance: list[dict[str, Any]] = []
    if selected_method == "hist_gradient_boosting":
        final_encoder, final_estimator = _fit_candidate(features, settings.model.random_seed)
        importance_sample = features.tail(min(5_000, features.height))
        importance_result = permutation_importance(
            final_estimator,
            final_encoder.transform(importance_sample),
            importance_sample["target"].to_numpy().astype(np.float64),
            scoring="neg_mean_absolute_error",
            n_repeats=3,
            random_state=settings.model.random_seed,
            n_jobs=1,
        )
        feature_importance = sorted(
            (
                {"feature": name, "importance": round(float(value), 2)}
                for name, value in zip(
                    MODEL_FEATURES, importance_result.importances_mean, strict=True
                )
            ),
            key=lambda item: float(item["importance"]),
            reverse=True,
        )

    model_bundle = {
        "schema_version": 1,
        "selected_method": selected_method,
        "encoder": final_encoder,
        "estimator": final_estimator,
        "interval_quantiles": interval_quantiles,
        "model_features": MODEL_FEATURES,
    }
    model_path = models_root / "selected_model.joblib"
    joblib.dump(model_bundle, model_path, compress=3)
    predictions_frame = pl.DataFrame(predictions)
    predictions_frame.write_parquet(
        settings.absolute_path(settings.paths.reports) / "work" / "evaluation_predictions.parquet",
        compression="zstd",
    )

    selected_metrics = next(item for item in method_comparison if item["method"] == selected_method)
    target_date_min = features["target_date"].min()
    target_date_max = features["target_date"].max()
    if not isinstance(target_date_min, date) or not isinstance(target_date_max, date):
        raise RuntimeError("Training features do not contain a valid target date range")
    report: dict[str, Any] = {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "selected_method": selected_method,
        "selected_label": METHOD_LABELS[selected_method],
        "selection_threshold": (
            "Histogram gradient boosting must reduce MAE by at least 1% versus the best baseline"
        ),
        "method_comparison": method_comparison,
        "rolling_folds": fold_summaries,
        "prediction_interval": interval_report,
        "performance_by_horizon": _segment_metrics(selected_rows, "horizon"),
        "performance_by_commodity": _segment_metrics(selected_rows, "commodity"),
        "performance_by_market": _segment_metrics(selected_rows, "market"),
        "performance_by_coverage": _segment_metrics(selected_rows, "coverage_tier"),
        "feature_importance": feature_importance[:15],
        "training": {
            "rows": features.height,
            "date_min": target_date_min.isoformat(),
            "date_max": target_date_max.isoformat(),
            "features": MODEL_FEATURES,
        },
        "selected_metrics": selected_metrics,
    }
    write_json(reports_root / "model_evaluation.json", report)
    (reports_root / "MODEL_EVALUATION.md").write_text(
        _model_report_markdown(report), encoding="utf-8"
    )

    history_path = settings.absolute_path(settings.paths.published) / "market_history.parquet"
    training_report = cast(dict[str, Any], report["training"])
    model_metadata = {
        "schema_version": 1,
        "model_version": sha256_file(history_path)[:12],
        "trained_at": report["generated_at"],
        "selected_method": selected_method,
        "selected_label": METHOD_LABELS[selected_method],
        "training_rows": features.height,
        "training_date_range": [training_report["date_min"], training_report["date_max"]],
        "forecast_horizon_days": settings.model.forecast_horizon_days,
        "interval_coverage_target": settings.model.interval_coverage,
        "validation": "Chronological rolling-origin evaluation",
        "metrics": selected_metrics,
        "feature_importance": feature_importance[:15],
        "artifact_sha256": sha256_file(model_path),
    }
    write_json(models_root / "model_metadata.json", model_metadata)
    log_event(
        "model_selected",
        method=selected_method,
        mae=selected_metrics["mae"],
        wape=selected_metrics["wape"],
        rows=features.height,
    )
    return report
