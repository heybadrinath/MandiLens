from __future__ import annotations

from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.ingestion import slugify
from mandilens_pipeline.io_utils import read_json, sha256_file, write_json
from mandilens_pipeline.logging_utils import log_event


def _iso(value: object) -> object:
    return value.isoformat() if isinstance(value, (date, datetime)) else value


def _serialize_rows(frame: pl.DataFrame, *, decimals: int = 2) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in frame.to_dicts():
        serialized: dict[str, Any] = {}
        for key, value in item.items():
            serialized[key] = round(value, decimals) if isinstance(value, float) else _iso(value)
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
- **Published selected-market records:** {manifest["record_count"]:,}
- **Retained all-market records:** {manifest["all_market_record_count"]:,}

## Configured coverage

- States: {", ".join(state.name for state in settings.source.states)}
- Crops: {", ".join(item.name for item in settings.source.commodities)}
- Unit: Indian rupees per quintal; arrivals in metric tonnes
- Granularity: one market, crop, and day after variety-level aggregation
- Publication rule: only series meeting the documented coverage and freshness thresholds

## Transformations

"""
        + "\n".join(f"- {item}" for item in manifest["transformations"])
        + """

## Known limitations

"""
        + "\n".join(f"- {item}" for item in manifest["known_limitations"])
        + f"""

## Attribution

{manifest["provider"]}, AGMARKNET market price and arrival reports, Open Government Data
Platform India / AGMARKNET 2.0, retrieved {manifest["retrieval_date"]},
{manifest["source_url"]}. Source data is published under {manifest["license"]}:
{manifest["license_url"]}.

The provider does not endorse MandiLens. Source data is supplied without warranty. MandiLens
validates, aggregates, filters, and flags the derived records as described above.
"""
    )


def _model_card(metadata: dict[str, Any], report: dict[str, Any]) -> str:
    comparison = "\n".join(
        f"| {item['label']} | {item['mae']:,.2f} | {item['wape']:.1%} | {item['n']:,} |"
        for item in report["locked_holdout"]["method_comparison"]
    )
    bootstrap = report["locked_holdout"]["paired_bootstrap"]
    stability = metadata["selection_stability"]
    blend = stability["blend"]
    return f"""# MandiLens model card

## Intended use

Short-range decision-support price intervals for eligible market and crop series. Forecasts are
not guaranteed prices, market quotes, trading instructions, or financial advice.

## Selected production method

**{metadata["selected_label"]}** (`{metadata["selected_method"]}`), version
`{metadata["model_version"]}`. Selection used chronological expanding-window folds. The final
time holdout is reported separately and is not an input to the automated selector.

The best lead-aware candidate ships only when it improves pooled selection MAE by at least
{stability["required_improvement"]:.1%} and wins the configured share of folds. The selected blend
uses {blend["baseline_weight"]:.0%} {blend["baseline_label"]} and
{blend["tree_weight"]:.0%} global tree output, plus a {blend["level_drift_weight"]:.1%} damped
recent-level adjustment per lead day. The parameters are selected on chronological selection folds
before holdout metrics are computed in each training run. After iterative model development, the
holdout is descriptive confirmation rather than a permanently untouched benchmark.

## Locked holdout

| Method | MAE (₹/quintal) | WAPE | Samples |
|---|---:|---:|---:|
{comparison}

The paired target-date bootstrap estimated a {stability["candidate_label"]} MAE reduction of
₹{bootstrap["observed_mae_reduction"]:,.2f}/quintal with a 95% interval of
₹{bootstrap["confidence_interval_95"][0]:,.2f} to
₹{bootstrap["confidence_interval_95"][1]:,.2f}. This is a stability diagnostic, not proof of
future improvement.

## Prediction intervals

Intervals are asymmetric signed-residual quantiles. Calibration uses market, model lead, and
recent-volatility context when enough prior errors exist, then backs off to state/crop, crop,
lead, or global groups. Locked-holdout coverage is reported by state, crop, lead, and market.

## Training data

- Rows: {metadata["training_rows"]:,}
- Dates: {metadata["training_date_range"][0]} to {metadata["training_date_range"][1]}
- User-visible target offsets: 1 to {metadata["display_forecast_horizon_days"]} days from one
  common comparison date
- Maximum model lead: {metadata["maximum_model_lead_days"]} days from each market's latest report

## Explanation boundary

Permutation importance is measured on the locked holdout using a tree trained only before that
period. It is a diagnostic of model behavior, not causal evidence or an independently actionable
recommendation.

## Limitations

- Missing reports remain unknown and are not imputed as observed prices.
- Market-day targets aggregate varieties and grades for a stable comparison unit.
- Shocks, closures, revisions, lot quality, and unentered costs can change realized proceeds.
- A common target date improves comparison fairness but older market origins require longer model
  leads and are clearly marked as less fresh.
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
        .group_by(["state", "commodity", "market_id", "month"])
        .agg(
            pl.col("representative_price").median().round(2).alias("median_price"),
            pl.len().alias("observations"),
        )
        .sort(["state", "commodity", "market_id", "month"])
    )
    latest_date = history["date"].max()
    earliest_date = history["date"].min()
    comparison_date = forecasts["comparison_date"].unique().to_list()
    if len(comparison_date) != 1 or not isinstance(comparison_date[0], date):
        raise RuntimeError("Forecast artifacts do not share one comparison date")

    observations = history.select(
        [
            "state",
            "commodity",
            "market_id",
            "date",
            "min_price",
            "representative_price",
            "max_price",
            "arrivals_tonnes",
            "arrival_coverage",
            "variety_count",
            "example_variety",
            "example_variety_basis",
            "aggregation_method",
            "is_anomaly",
            "anomaly_score",
        ]
    )
    market_rows = coverage.select(
        [
            "state_id",
            "state",
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

    web_root = settings.absolute_path(settings.paths.web_data).parent
    partitions: list[dict[str, Any]] = []
    states: list[dict[str, Any]] = []
    expected_partition_paths: set[Path] = set()
    for state_name in sorted(market_rows["state"].unique().to_list()):
        state_markets = market_rows.filter(pl.col("state") == state_name)
        state_id = int(state_markets["state_id"][0])
        state_slug = slugify(state_name)
        state_commodities = sorted(state_markets["commodity"].unique().to_list())
        states.append(
            {
                "id": state_id,
                "name": state_name,
                "slug": state_slug,
                "commodityCount": len(state_commodities),
                "marketCount": state_markets["market_id"].n_unique(),
            }
        )
        for commodity_name in state_commodities:
            commodity_slug = slugify(commodity_name)
            partition_markets = state_markets.filter(pl.col("commodity") == commodity_name)
            partition_observations = observations.filter(
                (pl.col("state") == state_name) & (pl.col("commodity") == commodity_name)
            ).drop(["state", "commodity"])
            partition_forecasts = forecasts.filter(
                (pl.col("state") == state_name) & (pl.col("commodity") == commodity_name)
            )
            partition_seasonal = seasonal.filter(
                (pl.col("state") == state_name) & (pl.col("commodity") == commodity_name)
            ).drop(["state", "commodity"])
            partition_payload = {
                "schemaVersion": 2,
                "state": state_name,
                "commodity": commodity_name,
                "markets": _serialize_rows(partition_markets.drop("commodity"), decimals=4),
                "observations": _serialize_rows(partition_observations, decimals=4),
                "forecasts": _serialize_rows(partition_forecasts, decimals=4),
                "seasonal": _serialize_rows(partition_seasonal, decimals=2),
            }
            partition_path = web_root / state_slug / f"{commodity_slug}.json"
            write_json(partition_path, partition_payload, compact=True)
            expected_partition_paths.add(partition_path.resolve())
            partition_dates = partition_observations["date"]
            partition_min = partition_dates.min()
            partition_max = partition_dates.max()
            partitions.append(
                {
                    "state": state_name,
                    "stateSlug": state_slug,
                    "commodity": commodity_name,
                    "commoditySlug": commodity_slug,
                    "url": f"/data/{state_slug}/{commodity_slug}.json",
                    "marketCount": partition_markets.height,
                    "observationCount": partition_observations.height,
                    "forecastCount": partition_forecasts.height,
                    "dateRange": [
                        partition_min.isoformat() if isinstance(partition_min, date) else None,
                        partition_max.isoformat() if isinstance(partition_max, date) else None,
                    ],
                    "bytes": partition_path.stat().st_size,
                    "sha256": sha256_file(partition_path),
                }
            )

    stale_partitions = [
        path
        for path in web_root.glob("*/*.json")
        if path.is_file() and path.resolve() not in expected_partition_paths
    ]
    for stale_path in stale_partitions:
        stale_path.unlink()
    for candidate in web_root.iterdir():
        if candidate.is_dir() and not any(candidate.iterdir()):
            candidate.rmdir()
    if stale_partitions:
        log_event("stale_web_partitions_removed", files=len(stale_partitions))

    commodities = sorted(market_rows["commodity"].unique().to_list())
    manifest_payload: dict[str, Any] = {
        "schemaVersion": 2,
        "meta": {
            "generatedAt": datetime.now(UTC).isoformat(),
            "dateRange": [
                earliest_date.isoformat() if isinstance(earliest_date, date) else None,
                latest_date.isoformat() if isinstance(latest_date, date) else None,
            ],
            "comparisonDate": comparison_date[0].isoformat(),
            "observedRecords": observations.height,
            "series": market_rows.height,
            "markets": market_rows["market_id"].n_unique(),
            "states": states,
            "commodities": commodities,
            "priceUnit": "₹ per quintal (100 kg)",
            "arrivalUnit": "metric tonnes",
            "forecastHorizonDays": settings.model.forecast_horizon_days,
            "freshnessThresholdDays": settings.quality.stale_after_days,
            "sourceRetrievedAt": source_manifest.get("retrieved_at"),
        },
        "partitions": partitions,
        "source": {
            "name": settings.source.name,
            "provider": settings.source.provider,
            "catalogUrl": str(settings.source.catalog_url),
            "apiUrl": str(settings.source.api_base_url),
            "license": settings.source.license_name,
            "licenseUrl": str(settings.source.license_url),
            "attributionRequired": True,
            "endorsement": False,
        },
        "qualitySummary": {
            "currentRefresh": quality["current_refresh_validation"],
            "cumulative": quality["cumulative_validation"],
            "selectionWindow": quality["selection_window"],
            "published": quality["published"],
        },
        "modelSummary": {
            "selectedMethod": model_report["selected_method"],
            "selectedLabel": model_report["selected_label"],
            "holdout": model_report["locked_holdout"],
            "selectedMetrics": model_report["selected_metrics"],
            "predictionInterval": {
                key: value
                for key, value in model_report["prediction_interval"].items()
                if not key.startswith("coverage_by_")
            },
            "selectionStability": model_report["selection_stability"],
        },
        "definitions": {
            "representativePrice": (
                "A market-day aggregate of variety modal prices: arrival-weighted only when all "
                "varieties report arrivals, otherwise the median. It is not a statistical mode."
            ),
            "weeklyCoverage": "Share of active weeks containing at least one source report.",
            "forecastInterval": (
                "An asymmetric empirical range calibrated from earlier out-of-time errors."
            ),
            "netRealization": (
                "Forecast price × quantity in quintals − the user's entered market cost."
            ),
            "anomaly": "A statistical flag for an unusual price; not proof of a source error.",
        },
    }
    manifest_path = settings.absolute_path(settings.paths.web_data)
    write_json(manifest_path, manifest_payload, compact=True)
    evidence_path = web_root / "evidence.json"
    write_json(
        evidence_path,
        {
            "schemaVersion": 2,
            "quality": quality,
            "model": model_report,
            "modelMetadata": model_metadata,
            "dataset": dataset_manifest,
            "source": manifest_payload["source"],
        },
        compact=True,
    )

    artifact_manifest = {
        "schema_version": 2,
        "generated_at": manifest_payload["meta"]["generatedAt"],
        "manifest": str(manifest_path.relative_to(settings.absolute_path(Path(".")))),
        "manifest_sha256": sha256_file(manifest_path),
        "manifest_bytes": manifest_path.stat().st_size,
        "evidence_sha256": sha256_file(evidence_path),
        "partitions": partitions,
        "total_web_bytes": (
            manifest_path.stat().st_size
            + evidence_path.stat().st_size
            + sum(int(item["bytes"]) for item in partitions)
        ),
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
        bytes=artifact_manifest["total_web_bytes"],
        partitions=len(partitions),
        manifest_sha256=artifact_manifest["manifest_sha256"],
    )
    return artifact_manifest
