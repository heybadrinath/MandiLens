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
    "recent_level_tree_blend": "Validated recent-level + lead-aware blend",
}
BASELINE_COLUMNS = {
    "last_observation": "baseline_last",
    "moving_average": "baseline_moving_average",
    "seasonal_naive": "baseline_seasonal_naive",
}
TREE_METHOD = "hist_gradient_boosting"
BLENDED_METHOD = "recent_level_tree_blend"
BLEND_TREE_WEIGHTS = tuple(round(index * 0.05, 2) for index in range(1, 11))
BLEND_LEVEL_DRIFT_WEIGHTS = tuple(round(index * 0.025, 3) for index in range(9))
EVALUATED_METHODS = (*BASELINE_COLUMNS, TREE_METHOD, BLENDED_METHOD)


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


def _evaluate_frame(frame: pl.DataFrame) -> dict[str, Any]:
    return _metric_values(
        frame["actual"].to_numpy().astype(np.float64),
        frame["prediction"].to_numpy().astype(np.float64),
        frame["current_price"].to_numpy().astype(np.float64),
    )


def _segment_metrics(rows: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(str(row[field]), []).append(row)
    return [
        {"segment": segment, **_evaluate_group(items)} for segment, items in sorted(grouped.items())
    ]


def _quantile(values: list[float], probability: float) -> float:
    if not values:
        return 0.0
    return float(np.quantile(np.asarray(values, dtype=np.float64), probability, method="linear"))


def _interval_key(level: str, *parts: object) -> str:
    return "|".join([level, *(str(part) for part in parts)])


def _interval_candidates(item: dict[str, Any]) -> list[str]:
    return [
        _interval_key(
            "market",
            item["market_id"],
            item["lead_days"],
            item["volatility_bucket"],
        ),
        _interval_key(
            "state_crop",
            item["state"],
            item["commodity"],
            item["lead_days"],
            item["volatility_bucket"],
        ),
        _interval_key("crop", item["commodity"], item["lead_days"]),
        _interval_key("lead", item["lead_days"]),
        "__global__",
    ]


def _build_interval_quantiles(
    rows: list[dict[str, Any]], coverage: float
) -> dict[str, dict[str, float | int]]:
    grouped: dict[str, list[float]] = {"__global__": []}
    for item in rows:
        residual = float(item["actual"]) - float(item["prediction"])
        grouped["__global__"].append(residual)
        for key in _interval_candidates(item)[:-1]:
            grouped.setdefault(key, []).append(residual)

    alpha = (1.0 - coverage) / 2.0
    minimum_samples = {"market": 40, "state_crop": 35, "crop": 50, "lead": 100}
    result: dict[str, dict[str, float | int]] = {}
    for key, values in grouped.items():
        level = key.split("|", 1)[0]
        if key != "__global__" and len(values) < minimum_samples[level]:
            continue
        result[key] = {
            "lower_residual": _quantile(values, alpha),
            "upper_residual": _quantile(values, 1.0 - alpha),
            "n": len(values),
        }
    return result


def interval_for_row(
    item: dict[str, Any],
    prediction: float,
    quantiles: dict[str, dict[str, float | int]],
) -> tuple[float, float, str, int]:
    selected_key = "__global__"
    for key in _interval_candidates(item):
        if key in quantiles:
            selected_key = key
            break
    values = quantiles[selected_key]
    lower = min(prediction, max(1.0, prediction + float(values["lower_residual"])))
    upper = max(prediction, lower, prediction + float(values["upper_residual"]))
    return lower, upper, selected_key.split("|", 1)[0], int(values["n"])


def _score_intervals(
    rows: list[dict[str, Any]], quantiles: dict[str, dict[str, float | int]]
) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []
    for item in rows:
        lower, upper, level, calibration_n = interval_for_row(
            item, float(item["prediction"]), quantiles
        )
        scored.append(
            {
                **item,
                "lower": lower,
                "upper": upper,
                "interval_width": upper - lower,
                "interval_level": level,
                "calibration_n": calibration_n,
                "covered": lower <= float(item["actual"]) <= upper,
            }
        )
    return scored


def _interval_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    if not rows:
        return {"n": 0, "empirical_coverage": None, "mean_width": None}
    return {
        "n": len(rows),
        "empirical_coverage": round(sum(bool(item["covered"]) for item in rows) / len(rows), 4),
        "mean_width": round(float(np.mean([item["interval_width"] for item in rows])), 2),
    }


def _segment_interval_coverage(rows: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in rows:
        grouped.setdefault(str(item[field]), []).append(item)
    return [
        {"segment": segment, **_interval_summary(items)}
        for segment, items in sorted(grouped.items())
    ]


def _method_predictions(
    training: pl.DataFrame,
    testing: pl.DataFrame,
    seed: int,
) -> tuple[
    dict[str, np.ndarray[Any, np.dtype[np.float64]]],
    FeatureEncoder,
    HistGradientBoostingRegressor,
]:
    encoder, estimator = _fit_candidate(training, seed)
    tree = np.maximum(estimator.predict(encoder.transform(testing)), 1.0)
    values = {
        **{
            method: np.asarray(testing[column].to_list(), dtype=np.float64)
            for method, column in BASELINE_COLUMNS.items()
        },
        "hist_gradient_boosting": np.asarray(tree, dtype=np.float64),
    }
    return values, encoder, estimator


def blend_predictions(
    baseline: np.ndarray[Any, np.dtype[np.float64]],
    tree: np.ndarray[Any, np.dtype[np.float64]],
    tree_weight: float,
    current_price: np.ndarray[Any, np.dtype[np.float64]],
    rolling_mean_7d: np.ndarray[Any, np.dtype[np.float64]],
    lead_days: np.ndarray[Any, np.dtype[np.float64]],
    level_drift_weight: float,
) -> np.ndarray[Any, np.dtype[np.float64]]:
    if not all(
        values.shape == baseline.shape
        for values in (tree, current_price, rolling_mean_7d, lead_days)
    ):
        raise RuntimeError("Blend components do not align")
    if not 0.0 <= tree_weight <= 1.0:
        raise ValueError("Tree blend weight must be between zero and one")
    if not 0.0 <= level_drift_weight <= 1.0:
        raise ValueError("Level-drift weight must be between zero and one")
    lead_adjustment = level_drift_weight * (current_price - rolling_mean_7d) / 7.0 * lead_days
    return np.maximum(
        baseline * (1.0 - tree_weight) + tree * tree_weight + lead_adjustment,
        1.0,
    )


def _paired_method_frames(
    frame: pl.DataFrame,
    first_method: str,
    second_method: str,
) -> tuple[pl.DataFrame, pl.DataFrame]:
    first = frame.filter(pl.col("method") == first_method)
    second = frame.filter(pl.col("method") == second_method)
    pairing_columns = [
        "phase",
        "fold_index",
        "state",
        "commodity",
        "market_id",
        "lead_days",
        "target_date",
        "actual",
        "current_price",
        "rolling_mean_7d",
    ]
    if first.height != second.height or not first.select(pairing_columns).equals(
        second.select(pairing_columns)
    ):
        raise RuntimeError(f"Prediction rows for {first_method} and {second_method} do not align")
    return first, second


def _select_blend_parameters(
    frame: pl.DataFrame,
    baseline_method: str,
) -> tuple[float, float]:
    baseline_rows, tree_rows = _paired_method_frames(frame, baseline_method, TREE_METHOD)
    actual = baseline_rows["actual"].to_numpy().astype(np.float64)
    baseline = baseline_rows["prediction"].to_numpy().astype(np.float64)
    tree = tree_rows["prediction"].to_numpy().astype(np.float64)
    current_price = baseline_rows["current_price"].to_numpy().astype(np.float64)
    rolling_mean_7d = baseline_rows["rolling_mean_7d"].to_numpy().astype(np.float64)
    lead_days = baseline_rows["lead_days"].to_numpy().astype(np.float64)
    return min(
        (
            (tree_weight, level_drift_weight)
            for tree_weight in BLEND_TREE_WEIGHTS
            for level_drift_weight in BLEND_LEVEL_DRIFT_WEIGHTS
        ),
        key=lambda parameters: (
            float(
                np.abs(
                    actual
                    - blend_predictions(
                        baseline,
                        tree,
                        parameters[0],
                        current_price,
                        rolling_mean_7d,
                        lead_days,
                        parameters[1],
                    )
                ).mean()
            ),
            parameters[1],
            parameters[0],
        ),
    )


def _append_blend_predictions(
    frame: pl.DataFrame,
    baseline_method: str,
    tree_weight: float,
    level_drift_weight: float,
) -> pl.DataFrame:
    baseline_rows, tree_rows = _paired_method_frames(frame, baseline_method, TREE_METHOD)
    blended = blend_predictions(
        baseline_rows["prediction"].to_numpy().astype(np.float64),
        tree_rows["prediction"].to_numpy().astype(np.float64),
        tree_weight,
        baseline_rows["current_price"].to_numpy().astype(np.float64),
        baseline_rows["rolling_mean_7d"].to_numpy().astype(np.float64),
        baseline_rows["lead_days"].to_numpy().astype(np.float64),
        level_drift_weight,
    )
    blend_rows = baseline_rows.with_columns(
        pl.lit(BLENDED_METHOD).alias("method"),
        pl.Series("prediction", blended, dtype=pl.Float64),
    )
    return pl.concat([frame, blend_rows], how="vertical_relaxed")


def _fold_wins(
    predictions: pl.DataFrame,
    candidate_method: str,
    baseline_method: str,
    fold_indices: list[int],
) -> int:
    wins = 0
    for fold_index in fold_indices:
        candidate_rows = predictions.filter(
            (pl.col("method") == candidate_method) & (pl.col("fold_index") == fold_index)
        )
        baseline_rows = predictions.filter(
            (pl.col("method") == baseline_method) & (pl.col("fold_index") == fold_index)
        )
        if _evaluate_frame(candidate_rows)["mae"] < _evaluate_frame(baseline_rows)["mae"]:
            wins += 1
    return wins


def _prediction_frame(
    testing: pl.DataFrame,
    method_values: dict[str, np.ndarray[Any, np.dtype[np.float64]]],
    *,
    fold_index: int,
    phase: str,
) -> pl.DataFrame:
    frames: list[pl.DataFrame] = []
    base = testing.select(
        [
            "state",
            "commodity",
            "market",
            "market_id",
            "coverage_tier",
            "volatility_bucket",
            "lead_days",
            "target_date",
            pl.col("target").cast(pl.Float64).alias("actual"),
            pl.col("current_price").cast(pl.Float64),
            pl.col("rolling_mean_7d").cast(pl.Float64),
        ]
    )
    for method, values in method_values.items():
        frames.append(
            base.with_columns(
                pl.lit(phase).alias("phase"),
                pl.lit(fold_index).cast(pl.Int64).alias("fold_index"),
                pl.lit(method).alias("method"),
                pl.Series("prediction", values, dtype=pl.Float64),
            )
        )
    return pl.concat(frames, how="vertical_relaxed")


def _method_comparison(frame: pl.DataFrame) -> list[dict[str, Any]]:
    comparison: list[dict[str, Any]] = []
    available_methods = set(frame["method"].unique().to_list())
    for method in EVALUATED_METHODS:
        if method not in available_methods:
            continue
        method_rows = frame.filter(pl.col("method") == method)
        comparison.append(
            {"method": method, "label": METHOD_LABELS[method], **_evaluate_frame(method_rows)}
        )
    return sorted(comparison, key=lambda item: float(item["mae"]))


def _paired_bootstrap(
    candidate_rows: list[dict[str, Any]],
    baseline_rows: list[dict[str, Any]],
    repetitions: int,
    seed: int,
) -> dict[str, Any]:
    if len(candidate_rows) != len(baseline_rows):
        raise RuntimeError("Paired bootstrap inputs do not align")
    by_date: dict[date, list[float]] = {}
    for candidate, baseline in zip(candidate_rows, baseline_rows, strict=True):
        if (
            candidate["target_date"],
            candidate["market_id"],
            candidate["lead_days"],
        ) != (
            baseline["target_date"],
            baseline["market_id"],
            baseline["lead_days"],
        ):
            raise RuntimeError("Paired bootstrap rows are not ordered consistently")
        improvement = abs(float(baseline["actual"]) - float(baseline["prediction"])) - abs(
            float(candidate["actual"]) - float(candidate["prediction"])
        )
        by_date.setdefault(cast(date, candidate["target_date"]), []).append(improvement)
    dates = sorted(by_date)
    rng = np.random.default_rng(seed)
    samples: list[float] = []
    for _ in range(repetitions):
        sampled_indices = rng.integers(0, len(dates), size=len(dates))
        values = [value for index in sampled_indices for value in by_date[dates[int(index)]]]
        samples.append(float(np.mean(values)))
    observed = float(np.mean([value for values in by_date.values() for value in values]))
    return {
        "unit": "MAE reduction in rupees per quintal; positive favors the candidate",
        "resampling_unit": "target date",
        "target_dates": len(dates),
        "repetitions": repetitions,
        "observed_mae_reduction": round(observed, 2),
        "confidence_interval_95": [
            round(float(np.quantile(samples, 0.025)), 2),
            round(float(np.quantile(samples, 0.975)), 2),
        ],
        "probability_candidate_improves_mae": round(
            sum(value > 0 for value in samples) / len(samples), 4
        ),
    }


def _model_report_markdown(report: dict[str, Any]) -> str:
    selection_rows = "\n".join(
        (
            "| {label} | {mae:,.2f} | {wape:.1%} | {smape:.1%} | "
            "{directional_accuracy:.1%} | {n:,} |"
        ).format(**item)
        for item in report["selection_method_comparison"]
    )
    holdout_rows = "\n".join(
        (
            "| {label} | {mae:,.2f} | {wape:.1%} | {smape:.1%} | "
            "{directional_accuracy:.1%} | {n:,} |"
        ).format(**item)
        for item in report["locked_holdout"]["method_comparison"]
    )
    interval = report["prediction_interval"]
    stability = report["selection_stability"]
    blend = stability["blend"]
    bootstrap = report["locked_holdout"]["paired_bootstrap"]
    return f"""# Model-evaluation report

Generated: {report["generated_at"]}

## Production selection

**Production method:** {report["selected_label"]}

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**{stability["required_improvement"]:.1%}** and win at least
**{stability["required_fold_win_share"]:.0%}** of usable folds. The selected candidate,
**{stability["candidate_label"]}**, improved MAE by
**{stability["candidate_improvement"]:.2%}** and won **{stability["candidate_fold_wins"]} of
{stability["usable_folds"]}** folds. Its blend uses **{blend["baseline_weight"]:.0%}**
{blend["baseline_label"]}, **{blend["tree_weight"]:.0%}** lead-aware tree output, and a
**{blend["level_drift_weight"]:.1%}** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
{selection_rows}

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
{holdout_rows}

The paired target-date bootstrap estimates a {stability["candidate_label"]} MAE reduction of
**₹{bootstrap["observed_mae_reduction"]:,.2f}/quintal** with a 95% interval from
**₹{bootstrap["confidence_interval_95"][0]:,.2f}** to
**₹{bootstrap["confidence_interval_95"][1]:,.2f}**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **{interval["nominal_coverage"]:.0%}** coverage. On the locked
holdout, it covered **{interval["empirical_coverage"]:.1%}** of
**{interval["n"]:,}** forecasts. Calibration backs off from market, lead, and volatility groups
to broader state/crop, crop, lead, or global residuals when samples are sparse.

## Validation boundaries

- Chronological expanding-window folds only; no random train/test split.
- A final time holdout is reported separately and is not an input to the automated selector.
- After iterative model development, holdout results are descriptive confirmation rather than a
  permanently untouched benchmark.
- Blend and damped level-drift weights are selected only from the chronological selection folds.
- Lag and rolling features use observations available on or before each forecast origin.
- Feature importance is measured by permutation on the locked holdout using a model trained only
  before that holdout. It describes model behavior, not causation.
- Missing reporting dates remain missing and are never scored as zero prices.
"""


def evaluate_and_train(settings: PipelineSettings) -> dict[str, Any]:
    processed_root = settings.absolute_path(settings.paths.processed)
    models_root = settings.absolute_path(settings.paths.models_published)
    reports_root = settings.absolute_path(settings.paths.reports)
    features = pl.read_parquet(processed_root / "training_features.parquet")
    maximum_target = features["target_date"].max()
    if not isinstance(maximum_target, date):
        raise RuntimeError("Training features do not contain a valid target date")
    holdout_start = maximum_target - timedelta(days=settings.model.locked_holdout_days - 1)

    selection_prediction_frames: list[pl.DataFrame] = []
    fold_summaries: list[dict[str, Any]] = []
    for fold_index in range(settings.model.evaluation_folds):
        windows_after = settings.model.evaluation_folds - fold_index
        test_end = holdout_start - timedelta(
            days=(windows_after - 1) * settings.model.evaluation_window_days
        )
        test_start = test_end - timedelta(days=settings.model.evaluation_window_days)
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
        method_values, _, _ = _method_predictions(
            training, testing, settings.model.random_seed + fold_index
        )
        selection_prediction_frames.append(
            _prediction_frame(
                testing,
                method_values,
                fold_index=fold_index,
                phase="model_selection",
            )
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

    if len(fold_summaries) < 2:
        raise RuntimeError("Fewer than two chronological selection folds were usable")

    selection_predictions = pl.concat(selection_prediction_frames, how="vertical_relaxed")
    baseline_comparison = _method_comparison(selection_predictions)
    strongest_baseline = min(
        (item for item in baseline_comparison if item["method"] in BASELINE_COLUMNS),
        key=lambda item: float(item["mae"]),
    )
    strongest_baseline_method = str(strongest_baseline["method"])
    blend_tree_weight, blend_level_drift_weight = _select_blend_parameters(
        selection_predictions, strongest_baseline_method
    )
    selection_predictions = _append_blend_predictions(
        selection_predictions,
        strongest_baseline_method,
        blend_tree_weight,
        blend_level_drift_weight,
    )
    selection_comparison = _method_comparison(selection_predictions)
    candidate_selection = min(
        (item for item in selection_comparison if item["method"] in {TREE_METHOD, BLENDED_METHOD}),
        key=lambda item: float(item["mae"]),
    )
    candidate_method = str(candidate_selection["method"])
    candidate_improvement = 1.0 - float(candidate_selection["mae"]) / float(
        strongest_baseline["mae"]
    )
    fold_indices = [int(fold["fold_index"]) for fold in fold_summaries]
    candidate_fold_wins = _fold_wins(
        selection_predictions,
        candidate_method,
        strongest_baseline_method,
        fold_indices,
    )
    candidate_fold_win_share = candidate_fold_wins / len(fold_summaries)
    if (
        candidate_improvement >= settings.model.minimum_tree_improvement
        and candidate_fold_win_share >= settings.model.minimum_tree_fold_win_share
    ):
        selected_method = candidate_method
    else:
        selected_method = strongest_baseline_method

    pre_holdout = features.filter(pl.col("target_date") < holdout_start)
    holdout = features.filter(pl.col("target_date") >= holdout_start)
    if pre_holdout.height < 500 or holdout.is_empty():
        raise RuntimeError("The locked time holdout could not be constructed")
    holdout_values, holdout_encoder, holdout_estimator = _method_predictions(
        pre_holdout, holdout, settings.model.random_seed + 10_000
    )
    holdout_predictions = _prediction_frame(
        holdout,
        holdout_values,
        fold_index=-1,
        phase="locked_holdout",
    )
    holdout_predictions = _append_blend_predictions(
        holdout_predictions,
        strongest_baseline_method,
        blend_tree_weight,
        blend_level_drift_weight,
    )
    holdout_comparison = _method_comparison(holdout_predictions)
    selected_holdout_rows = holdout_predictions.filter(
        pl.col("method") == selected_method
    ).to_dicts()
    candidate_holdout_rows = holdout_predictions.filter(
        pl.col("method") == candidate_method
    ).to_dicts()
    baseline_holdout_rows = holdout_predictions.filter(
        pl.col("method") == strongest_baseline_method
    ).to_dicts()
    bootstrap = _paired_bootstrap(
        candidate_holdout_rows,
        baseline_holdout_rows,
        settings.model.bootstrap_repetitions,
        settings.model.random_seed,
    )

    selected_selection_rows = selection_predictions.filter(
        pl.col("method") == selected_method
    ).to_dicts()
    holdout_interval_quantiles = _build_interval_quantiles(
        selected_selection_rows, settings.model.interval_coverage
    )
    scored_holdout_intervals = _score_intervals(selected_holdout_rows, holdout_interval_quantiles)
    interval_summary = _interval_summary(scored_holdout_intervals)
    interval_report = {
        "nominal_coverage": settings.model.interval_coverage,
        **interval_summary,
        "method": (
            "Asymmetric signed-residual quantiles calibrated before the locked holdout, with "
            "hierarchical market/state/crop/lead/volatility fallback"
        ),
        "coverage_by_state": _segment_interval_coverage(scored_holdout_intervals, "state"),
        "coverage_by_commodity": _segment_interval_coverage(scored_holdout_intervals, "commodity"),
        "coverage_by_lead": _segment_interval_coverage(scored_holdout_intervals, "lead_days"),
        "coverage_by_market": _segment_interval_coverage(scored_holdout_intervals, "market"),
    }
    production_interval_quantiles = _build_interval_quantiles(
        [*selected_selection_rows, *selected_holdout_rows], settings.model.interval_coverage
    )

    feature_importance: list[dict[str, Any]] = []
    importance_sample = holdout.head(min(5_000, holdout.height))
    importance_result = permutation_importance(
        holdout_estimator,
        holdout_encoder.transform(importance_sample),
        importance_sample["target"].to_numpy().astype(np.float64),
        scoring="neg_mean_absolute_error",
        n_repeats=3,
        random_state=settings.model.random_seed,
        n_jobs=1,
    )
    feature_importance = sorted(
        (
            {"feature": name, "importance": round(float(value), 2)}
            for name, value in zip(MODEL_FEATURES, importance_result.importances_mean, strict=True)
        ),
        key=lambda item: float(item["importance"]),
        reverse=True,
    )

    final_encoder: FeatureEncoder | None = None
    final_estimator: HistGradientBoostingRegressor | None = None
    if selected_method in {TREE_METHOD, BLENDED_METHOD}:
        final_encoder, final_estimator = _fit_candidate(features, settings.model.random_seed)

    model_bundle = {
        "schema_version": 3,
        "selected_method": selected_method,
        "encoder": final_encoder,
        "estimator": final_estimator,
        "blend_baseline_method": strongest_baseline_method,
        "blend_tree_weight": blend_tree_weight,
        "blend_level_drift_weight": blend_level_drift_weight,
        "interval_quantiles": production_interval_quantiles,
        "model_features": MODEL_FEATURES,
    }
    model_path = models_root / "selected_model.joblib"
    joblib.dump(model_bundle, model_path, compress=3)
    pl.concat([selection_predictions, holdout_predictions], how="vertical_relaxed").write_parquet(
        reports_root / "work" / "evaluation_predictions.parquet", compression="zstd"
    )

    selected_metrics = next(
        item for item in holdout_comparison if item["method"] == selected_method
    )
    target_date_min = features["target_date"].min()
    if not isinstance(target_date_min, date):
        raise RuntimeError("Training features do not contain a valid minimum target date")
    report: dict[str, Any] = {
        "schema_version": 3,
        "generated_at": datetime.now(UTC).isoformat(),
        "selected_method": selected_method,
        "selected_label": METHOD_LABELS[selected_method],
        "selection_rule": (
            "The best lead-aware candidate must clear the configured pooled MAE improvement "
            "and fold-win stability gates"
        ),
        "selection_stability": {
            "required_improvement": settings.model.minimum_tree_improvement,
            "required_fold_win_share": settings.model.minimum_tree_fold_win_share,
            "candidate_method": candidate_method,
            "candidate_label": METHOD_LABELS[candidate_method],
            "candidate_improvement": round(candidate_improvement, 4),
            "candidate_fold_wins": candidate_fold_wins,
            "usable_folds": len(fold_summaries),
            "candidate_fold_win_share": round(candidate_fold_win_share, 4),
            "strongest_baseline": strongest_baseline_method,
            "blend": {
                "method": BLENDED_METHOD,
                "baseline_method": strongest_baseline_method,
                "baseline_label": METHOD_LABELS[strongest_baseline_method],
                "baseline_weight": round(1.0 - blend_tree_weight, 2),
                "tree_weight": blend_tree_weight,
                "tested_tree_weights": list(BLEND_TREE_WEIGHTS),
                "level_drift_weight": blend_level_drift_weight,
                "tested_level_drift_weights": list(BLEND_LEVEL_DRIFT_WEIGHTS),
            },
        },
        "selection_method_comparison": selection_comparison,
        "rolling_folds": fold_summaries,
        "locked_holdout": {
            "start": holdout_start.isoformat(),
            "end": maximum_target.isoformat(),
            "training_rows": pre_holdout.height,
            "test_rows": holdout.height,
            "method_comparison": holdout_comparison,
            "paired_bootstrap": bootstrap,
        },
        "prediction_interval": interval_report,
        "performance_by_horizon": _segment_metrics(selected_holdout_rows, "lead_days"),
        "performance_by_commodity": _segment_metrics(selected_holdout_rows, "commodity"),
        "performance_by_state": _segment_metrics(selected_holdout_rows, "state"),
        "performance_by_market": _segment_metrics(selected_holdout_rows, "market"),
        "performance_by_coverage": _segment_metrics(selected_holdout_rows, "coverage_tier"),
        "feature_importance": feature_importance[:15],
        "feature_importance_evaluation": (
            "Permutation importance on the locked holdout using a pre-holdout tree model"
        ),
        "training": {
            "rows": features.height,
            "date_min": target_date_min.isoformat(),
            "date_max": maximum_target.isoformat(),
            "features": MODEL_FEATURES,
        },
        "selected_metrics": selected_metrics,
    }
    write_json(reports_root / "model_evaluation.json", report)
    (reports_root / "MODEL_EVALUATION.md").write_text(
        _model_report_markdown(report), encoding="utf-8"
    )

    history_path = settings.absolute_path(settings.paths.published) / "market_history.parquet"
    model_metadata = {
        "schema_version": 3,
        "model_version": sha256_file(history_path)[:12],
        "trained_at": report["generated_at"],
        "selected_method": selected_method,
        "selected_label": METHOD_LABELS[selected_method],
        "training_rows": features.height,
        "training_date_range": [target_date_min.isoformat(), maximum_target.isoformat()],
        "display_forecast_horizon_days": settings.model.forecast_horizon_days,
        "maximum_model_lead_days": settings.model.maximum_lead_days,
        "interval_coverage_target": settings.model.interval_coverage,
        "validation": "Chronological selection folds plus a locked final time holdout",
        "metrics": selected_metrics,
        "selection_stability": report["selection_stability"],
        "blend_baseline_method": strongest_baseline_method,
        "blend_tree_weight": blend_tree_weight,
        "blend_level_drift_weight": blend_level_drift_weight,
        "paired_bootstrap": bootstrap,
        "feature_importance": feature_importance[:15],
        "feature_importance_evaluation": report["feature_importance_evaluation"],
        "artifact_sha256": sha256_file(model_path),
    }
    write_json(models_root / "model_metadata.json", model_metadata)
    log_event(
        "model_selected",
        method=selected_method,
        holdout_mae=selected_metrics["mae"],
        holdout_wape=selected_metrics["wape"],
        rows=features.height,
    )
    return report
