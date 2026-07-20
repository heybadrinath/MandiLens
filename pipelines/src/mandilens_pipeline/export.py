from __future__ import annotations

from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.io_utils import read_json, sha256_file, write_json
from mandilens_pipeline.logging_utils import log_event


def _iso(value: object) -> object:
    return value.isoformat() if isinstance(value, (date, datetime)) else value


def _serialize_rows(frame: pl.DataFrame, *, decimals: int = 2) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in frame.to_dicts():
        serialized: dict[str, Any] = {}
        for key, value in item.items():
            if isinstance(value, float):
                serialized[key] = round(value, decimals)
            else:
                serialized[key] = _iso(value)
        rows.append(serialized)
    return rows


def _dataset_card(settings: PipelineSettings, manifest: dict[str, Any]) -> str:
    return (
        f"""# MandiLens dataset card

## Dataset

- **Name:** {manifest["dataset_name"]}
- **Provider:** {manifest["provider"]}
- **Source:** {manifest["source_url"]}
- **Retrieved:** {manifest["retrieval_date"]}
- **License:** [{manifest["license"]}]({manifest["license_url"]})
- **Date range:** {manifest["date_range"][0]} to {manifest["date_range"][1]}
- **Published records:** {manifest["record_count"]:,}

## Scope

- State: {settings.source.state_name}
- Commodities: {", ".join(item.name for item in settings.source.commodities)}
- Unit: Indian rupees per quintal; arrivals in metric tonnes
- Granularity: one market/commodity/day after variety aggregation

## Transformations

"""
        + "\n".join(f"- {item}" for item in manifest["transformations"])
        + """

## Known limitations

"""
        + "\n".join(f"- {item}" for item in manifest["known_limitations"])
        + f"""

## Attribution

{manifest["provider"]}, 2026, AGMARKNET market price and arrival reports, Open Government
Data Platform India / AGMARKNET 2.0, retrieved {manifest["retrieval_date"]},
{manifest["source_url"]}. Published under {manifest["license"]}:
{manifest["license_url"]}.

The provider does not endorse MandiLens. Source data is supplied without warranty. MandiLens
normalizes, validates, aggregates, filters, and flags records as described above.
"""
    )


def _model_card(metadata: dict[str, Any], report: dict[str, Any]) -> str:
    comparison = "\n".join(
        f"| {item['label']} | {item['mae']:,.2f} | {item['wape']:.1%} | {item['n']:,} |"
        for item in report["method_comparison"]
    )
    return f"""# MandiLens model card

## Intended use

Seven-day decision-support price ranges for the selected Maharashtra market/commodity series.
The forecasts are not guaranteed prices, trading instructions, or financial advice.

## Selected production method

**{metadata["selected_label"]}** (`{metadata["selected_method"]}`), model version
`{metadata["model_version"]}`. It was selected using chronological rolling-origin validation.
The machine-learning candidate was accepted only if it reduced MAE by at least 1% versus the
strongest simple baseline.

## Evaluation

| Method | MAE (₹/quintal) | WAPE | Samples |
|---|---:|---:|---:|
{comparison}

The production method's directional accuracy was
{metadata["metrics"]["directional_accuracy"]:.1%}. The displayed interval targets
{metadata["interval_coverage_target"]:.0%} empirical coverage. On later folds calibrated only from
earlier-fold errors, it covered {report["prediction_interval"]["empirical_coverage"]:.1%} of
{report["prediction_interval"]["n"]:,} forecasts.

## Training data

- Rows: {metadata["training_rows"]:,}
- Dates: {metadata["training_date_range"][0]} to {metadata["training_date_range"][1]}
- Horizon: 1 to {metadata["forecast_horizon_days"]} calendar days
- Geography: Maharashtra
- Commodities: onion, potato, tomato

## Limitations and ethics

- Missing reports are not zero prices and are not imputed as observed outcomes.
- Market-day targets aggregate varieties for stability and therefore do not quote a specific lot.
- Feature importance describes model behavior, not causal effects.
- Weather is omitted because no measured validation gain justified the extra dependency.
- Shocks, closures, revisions, and transport or commission costs can make realized proceeds differ.
"""


def export_web_artifact(settings: PipelineSettings) -> dict[str, Any]:
    published_root = settings.absolute_path(settings.paths.published)
    reports_root = settings.absolute_path(settings.paths.reports)
    models_root = settings.absolute_path(settings.paths.models_published)
    history = pl.read_parquet(published_root / "market_history.parquet")
    coverage = pl.read_parquet(published_root / "market_coverage.parquet")
    forecasts = pl.read_parquet(published_root / "forecasts.parquet")
    quality = read_json(reports_root / "data_quality.json")
    model_report = read_json(reports_root / "model_evaluation.json")
    model_metadata = read_json(models_root / "model_metadata.json")
    dataset_manifest = read_json(published_root / "dataset_manifest.json")
    source_manifest_path = settings.absolute_path(settings.paths.raw) / "manifest.json"
    source_manifest = read_json(source_manifest_path) if source_manifest_path.exists() else {}

    seasonal = (
        history.with_columns(pl.col("date").dt.month().alias("month"))
        .group_by(["commodity", "market_id", "month"])
        .agg(
            pl.col("modal_price").median().round(2).alias("median_price"),
            pl.len().alias("observations"),
        )
        .sort(["commodity", "market_id", "month"])
    )
    latest_date = history["date"].max()
    earliest_date = history["date"].min()
    observations = history.select(
        [
            "commodity",
            "market_id",
            "date",
            "min_price",
            "modal_price",
            "max_price",
            "arrivals_tonnes",
            "variety_count",
            "primary_variety",
            "is_anomaly",
            "anomaly_score",
        ]
    )
    market_rows = coverage.select(
        [
            "commodity",
            "market_id",
            "market",
            "district",
            "first_date",
            "last_date",
            "record_count",
            "weekly_coverage",
            "latest_age_days",
            "maximum_gap_days",
            "price_cv",
            "coverage_tier",
        ]
    )

    payload = {
        "schemaVersion": 1,
        "meta": {
            "generatedAt": datetime.now(UTC).isoformat(),
            "state": settings.source.state_name,
            "dateRange": [
                earliest_date.isoformat() if isinstance(earliest_date, date) else None,
                latest_date.isoformat() if isinstance(latest_date, date) else None,
            ],
            "observedRecords": observations.height,
            "series": market_rows.height,
            "markets": market_rows["market_id"].n_unique(),
            "commodities": [item.name for item in settings.source.commodities],
            "priceUnit": "₹ per quintal (100 kg)",
            "arrivalUnit": "metric tonnes",
            "forecastHorizonDays": settings.model.forecast_horizon_days,
            "freshnessThresholdDays": settings.quality.stale_after_days,
            "sourceRetrievedAt": source_manifest.get("retrieved_at"),
        },
        "sources": [
            {
                "name": settings.source.name,
                "provider": settings.source.provider,
                "catalogUrl": str(settings.source.catalog_url),
                "apiUrl": str(settings.source.api_base_url),
                "license": settings.source.license_name,
                "licenseUrl": str(settings.source.license_url),
                "attributionRequired": True,
                "endorsement": False,
            }
        ],
        "markets": _serialize_rows(market_rows, decimals=4),
        "observations": _serialize_rows(observations, decimals=2),
        "forecasts": _serialize_rows(forecasts, decimals=4),
        "seasonal": _serialize_rows(seasonal, decimals=2),
        "quality": quality,
        "model": model_report,
        "modelMetadata": model_metadata,
        "definitions": {
            "modalPrice": "The most frequently reported wholesale price for the market day.",
            "weeklyCoverage": "Share of active weeks containing at least one source report.",
            "forecastInterval": "An empirical range calibrated from earlier rolling-origin errors.",
            "netRealization": (
                "Forecast or observed price × quantity in quintals − user-entered transport cost."
            ),
            "anomaly": (
                "A robust statistical flag for an unusual price; not proof of a source error."
            ),
        },
    }
    web_data_path = settings.absolute_path(settings.paths.web_data)
    write_json(web_data_path, payload, compact=True)
    artifact_manifest = {
        "schema_version": 1,
        "generated_at": payload["meta"]["generatedAt"],
        "web_artifact": str(web_data_path.relative_to(settings.absolute_path(Path(".")))),
        "web_artifact_sha256": sha256_file(web_data_path),
        "web_artifact_bytes": web_data_path.stat().st_size,
        "dataset_manifest_sha256": sha256_file(published_root / "dataset_manifest.json"),
        "model_artifact_sha256": sha256_file(models_root / "selected_model.joblib"),
    }
    write_json(published_root / "artifact_manifest.json", artifact_manifest)

    docs_root = settings.absolute_path(Path("docs"))
    docs_root.mkdir(parents=True, exist_ok=True)
    (docs_root / "DATASET_CARD.md").write_text(
        _dataset_card(settings, dataset_manifest), encoding="utf-8"
    )
    (docs_root / "MODEL_CARD.md").write_text(
        _model_card(model_metadata, model_report), encoding="utf-8"
    )
    log_event(
        "web_export_complete",
        bytes=artifact_manifest["web_artifact_bytes"],
        sha256=artifact_manifest["web_artifact_sha256"],
    )
    return artifact_manifest
