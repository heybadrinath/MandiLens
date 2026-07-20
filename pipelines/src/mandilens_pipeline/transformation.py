from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from statistics import median
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.io_utils import read_json, sha256_file, write_json
from mandilens_pipeline.logging_utils import log_event

SPACE_PATTERN = re.compile(r"\s+")


def normalized_key(value: str) -> str:
    return SPACE_PATTERN.sub(" ", value.strip()).casefold()


def display_market_name(value: str) -> str:
    cleaned = SPACE_PATTERN.sub(" ", value.strip())
    if cleaned.isupper():
        cleaned = cleaned.title()
    replacements = {
        "Apmc": "APMC",
        "Ap Mc": "APMC",
        "Mandi": "Mandi",
    }
    for source, target in replacements.items():
        cleaned = cleaned.replace(source, target)
    return cleaned


def parse_number(value: object) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        numeric = float(value)
    else:
        try:
            numeric = float(str(value).replace(",", "").strip())
        except ValueError:
            return None
    return numeric if math.isfinite(numeric) else None


def parse_arrival_date(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    for pattern in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(value.strip(), pattern).date()
        except ValueError:
            continue
    return None


def _stable_market_id(market_name: str) -> str:
    digest = hashlib.sha1(normalized_key(market_name).encode("utf-8")).hexdigest()[:10]
    return f"derived-{digest}"


def _load_reference_maps(
    raw_root: Path, state_id: int
) -> tuple[dict[str, dict[str, Any]], dict[int, str]]:
    payload = read_json(raw_root / "reference" / "filters.json")
    data = payload["data"]
    districts = {
        int(item["id"]): str(item["district_name"]).strip()
        for item in data.get("district_data", [])
        if item.get("id") is not None
    }
    markets = {
        normalized_key(str(item["mkt_name"])): item
        for item in data.get("market_data", [])
        if item.get("mkt_name") and item.get("state_id") == state_id
    }
    return markets, districts


def _raw_files(settings: PipelineSettings) -> list[tuple[str, Path]]:
    raw_root = settings.absolute_path(settings.paths.raw)
    files: list[tuple[str, Path]] = []
    for commodity in settings.source.commodities:
        commodity_root = raw_root / commodity.name.lower()
        files.extend((commodity.name, item) for item in sorted(commodity_root.glob("*.json")))
    return files


def flatten_and_validate(
    settings: PipelineSettings,
) -> tuple[pl.DataFrame, pl.DataFrame, dict[str, Any]]:
    raw_root = settings.absolute_path(settings.paths.raw)
    market_map, district_map = _load_reference_maps(raw_root, settings.source.state_id)
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    reasons: Counter[str] = Counter()
    seen: set[tuple[object, ...]] = set()
    corrected_records = 0
    unresolved_markets = 0
    files = _raw_files(settings)

    for commodity_name, raw_file in files:
        payload = read_json(raw_file)
        for market in payload.get("markets", []):
            raw_market = str(market.get("marketName", "")).strip()
            reference = market_map.get(normalized_key(raw_market))
            if reference:
                market_id = str(reference["id"])
                district = district_map.get(int(reference["district_id"]), "Unknown")
            else:
                market_id = _stable_market_id(raw_market)
                district = "Unknown"
                unresolved_markets += 1

            market_name = display_market_name(raw_market)
            if market_name != raw_market:
                corrected_records += 1

            for dated_entry in market.get("dates", []):
                observed_date = parse_arrival_date(dated_entry.get("arrivalDate"))
                values = dated_entry.get("data") or [{}]
                for value in values:
                    min_price = parse_number(value.get("minimumPrice"))
                    max_price = parse_number(value.get("maximumPrice"))
                    modal_price = parse_number(value.get("modalPrice"))
                    arrivals = parse_number(value.get("arrivals"))
                    variety = SPACE_PATTERN.sub(
                        " ", str(value.get("variety") or "Unspecified").strip()
                    )
                    reason: str | None = None

                    if not raw_market or observed_date is None:
                        reason = "missing_identity_or_invalid_date"
                    elif not (
                        settings.source.start_date <= observed_date <= settings.source.end_date
                    ):
                        reason = "outside_requested_date_range"
                    elif min_price is None or max_price is None or modal_price is None:
                        reason = "unparseable_price"
                    elif min_price <= 0 or max_price <= 0 or modal_price <= 0:
                        reason = "non_positive_price"
                    elif (
                        max(min_price, max_price, modal_price)
                        > settings.quality.maximum_price_per_quintal
                    ):
                        reason = "price_above_safety_ceiling"
                    elif not min_price <= modal_price <= max_price:
                        reason = "invalid_price_order"
                    elif arrivals is not None and arrivals < 0:
                        reason = "negative_arrivals"

                    duplicate_key = (
                        market_id,
                        commodity_name,
                        variety.casefold(),
                        observed_date,
                        min_price,
                        max_price,
                        modal_price,
                    )
                    if reason is None and duplicate_key in seen:
                        reason = "exact_duplicate"

                    record = {
                        "state": settings.source.state_name,
                        "district": district,
                        "market_id": market_id,
                        "market": market_name,
                        "commodity": commodity_name,
                        "variety": variety,
                        "date": observed_date,
                        "min_price": min_price,
                        "max_price": max_price,
                        "modal_price": modal_price,
                        "arrivals_tonnes": arrivals,
                        "source_file": str(raw_file.relative_to(settings.absolute_path(Path(".")))),
                    }
                    if reason:
                        record["exclusion_reason"] = reason
                        rejected.append(record)
                        reasons[reason] += 1
                    else:
                        seen.add(duplicate_key)
                        accepted.append(record)

    accepted_schema = {
        "state": pl.String,
        "district": pl.String,
        "market_id": pl.String,
        "market": pl.String,
        "commodity": pl.String,
        "variety": pl.String,
        "date": pl.Date,
        "min_price": pl.Float64,
        "max_price": pl.Float64,
        "modal_price": pl.Float64,
        "arrivals_tonnes": pl.Float64,
        "source_file": pl.String,
    }
    rejected_schema = {**accepted_schema, "exclusion_reason": pl.String}
    accepted_df = pl.DataFrame(accepted, schema=accepted_schema)
    rejected_df = pl.DataFrame(rejected, schema=rejected_schema)
    summary = {
        "source_file_count": len(files),
        "input_records": len(accepted) + len(rejected),
        "accepted_variety_records": len(accepted),
        "excluded_records": len(rejected),
        "corrected_records": corrected_records,
        "unresolved_market_references": unresolved_markets,
        "exclusion_reasons": dict(sorted(reasons.items())),
    }
    return accepted_df, rejected_df, summary


def aggregate_market_days(accepted_df: pl.DataFrame) -> pl.DataFrame:
    if accepted_df.is_empty():
        raise RuntimeError("No valid AGMARKNET records were available after validation")

    weights = pl.col("arrivals_tonnes").fill_null(0.0)
    weighted_price = pl.col("modal_price") * weights
    aggregated = (
        accepted_df.group_by(
            ["state", "district", "market_id", "market", "commodity", "date"],
            maintain_order=True,
        )
        .agg(
            pl.col("min_price").min().alias("min_price"),
            pl.col("max_price").max().alias("max_price"),
            pl.when(weights.sum() > 0)
            .then(weighted_price.sum() / weights.sum())
            .otherwise(pl.col("modal_price").median())
            .alias("modal_price"),
            pl.col("arrivals_tonnes").drop_nulls().sum().alias("arrivals_tonnes"),
            pl.col("variety").n_unique().alias("variety_count"),
            pl.col("variety").sort().first().alias("primary_variety"),
        )
        .with_columns(
            pl.col("min_price").round(2),
            pl.col("modal_price").round(2),
            pl.col("max_price").round(2),
            pl.col("arrivals_tonnes").round(3),
        )
        .sort(["commodity", "market", "date"])
    )
    return _add_anomaly_scores(aggregated)


def _add_anomaly_scores(frame: pl.DataFrame) -> pl.DataFrame:
    records: list[dict[str, Any]] = []
    for group in frame.partition_by(["commodity", "market_id"], maintain_order=True):
        rows = group.sort("date").to_dicts()
        prior_prices: list[float] = []
        for row in rows:
            current = float(row["modal_price"])
            window = prior_prices[-30:]
            score = 0.0
            if len(window) >= 8:
                center = median(window)
                deviations = [abs(value - center) for value in window]
                mad = median(deviations)
                scale = max(1.4826 * mad, center * 0.03, 1.0)
                score = (current - center) / scale
            row["anomaly_score"] = round(score, 4)
            row["is_anomaly"] = abs(score) >= 4.0
            records.append(row)
            prior_prices.append(current)
    return pl.DataFrame(records).sort(["commodity", "market", "date"])


def compute_coverage(frame: pl.DataFrame, settings: PipelineSettings) -> pl.DataFrame:
    maximum_date = frame["date"].max()
    if not isinstance(maximum_date, date):
        raise RuntimeError("Processed dataset has no valid dates")
    window_start = maximum_date - timedelta(days=settings.quality.coverage_window_days)
    rows: list[dict[str, Any]] = []

    recent = frame.filter(pl.col("date") >= window_start)
    for group in recent.partition_by(["commodity", "market_id"], maintain_order=True):
        ordered = group.sort("date")
        values = ordered.to_dicts()
        dates = [item["date"] for item in values]
        prices = [float(item["modal_price"]) for item in values]
        first_date = dates[0]
        last_date = dates[-1]
        weeks = {(item.isocalendar().year, item.isocalendar().week) for item in dates}
        first_week_start = first_date - timedelta(days=first_date.weekday())
        last_week_start = last_date - timedelta(days=last_date.weekday())
        possible_weeks = max(1, ((last_week_start - first_week_start).days // 7) + 1)
        gaps = [(right - left).days for left, right in zip(dates, dates[1:], strict=False)]
        mean_price = sum(prices) / len(prices)
        variance = sum((item - mean_price) ** 2 for item in prices) / max(1, len(prices) - 1)
        repeated_share = max(Counter(prices).values()) / len(prices)
        rows.append(
            {
                "commodity": values[0]["commodity"],
                "market_id": values[0]["market_id"],
                "market": values[0]["market"],
                "district": values[0]["district"],
                "first_date": first_date,
                "last_date": last_date,
                "record_count": len(values),
                "weeks_reported": len(weeks),
                "weekly_coverage": round(len(weeks) / possible_weeks, 4),
                "latest_age_days": (settings.source.end_date - last_date).days,
                "maximum_gap_days": max(gaps, default=0),
                "price_cv": round(math.sqrt(variance) / mean_price, 4) if mean_price else None,
                "repeated_modal_share": round(repeated_share, 4),
            }
        )

    coverage = pl.DataFrame(rows)
    eligible = (
        (pl.col("record_count") >= settings.quality.minimum_records_per_series)
        & (pl.col("weekly_coverage") >= settings.quality.minimum_weekly_coverage)
        & (pl.col("latest_age_days") <= settings.quality.active_market_max_age_days)
    )
    coverage = coverage.with_columns(
        eligible.alias("eligible"),
        pl.when(pl.col("weekly_coverage") >= 0.75)
        .then(pl.lit("high"))
        .otherwise(pl.lit("lower"))
        .alias("coverage_tier"),
    )

    selected_keys: set[tuple[str, str]] = set()
    for commodity in settings.source.commodities:
        candidates = coverage.filter(
            (pl.col("commodity") == commodity.name) & pl.col("eligible")
        ).sort(["weekly_coverage", "record_count"], descending=[True, True])
        if candidates.height < settings.quality.markets_per_commodity:
            candidates = coverage.filter(pl.col("commodity") == commodity.name).sort(
                ["latest_age_days", "weekly_coverage", "record_count"],
                descending=[False, True, True],
            )
        for item in candidates.head(settings.quality.markets_per_commodity).iter_rows(named=True):
            selected_keys.add((str(item["commodity"]), str(item["market_id"])))

    return coverage.with_columns(
        pl.struct(["commodity", "market_id"])
        .map_elements(
            lambda item: (str(item["commodity"]), str(item["market_id"])) in selected_keys,
            return_dtype=pl.Boolean,
        )
        .alias("selected")
    ).sort(["commodity", "selected", "weekly_coverage"], descending=[False, True, True])


def _quality_markdown(report: dict[str, Any]) -> str:
    reasons = report["validation"]["exclusion_reasons"]
    reason_lines = "\n".join(f"- `{name}`: {count:,}" for name, count in reasons.items())
    return f"""# Data-quality report

Generated: {report["generated_at"]}

## Plain-language result

The pipeline read **{report["validation"]["input_records"]:,}** variety-level observations and
accepted **{report["validation"]["accepted_variety_records"]:,}** after explicit validation.
It excluded **{report["validation"]["excluded_records"]:,}** records rather than silently fixing
questionable prices. The published application contains **{report["published"]["records"]:,}**
market-day observations across **{report["published"]["series"]:,}** selected market/commodity
series.

It normalized **{report["validation"]["corrected_records"]:,}** market display names for whitespace
and capitalization. These corrections did not overwrite source prices.

## Coverage

- Date range: {report["published"]["date_min"]} to {report["published"]["date_max"]}
- Commodities: {", ".join(report["published"]["commodities"])}
- State: {report["published"]["state"]}
- Selected markets: {report["published"]["markets"]:,}
- Stale selected series: {report["published"]["stale_series"]:,}
- Long reporting gaps: {report["published"]["long_gap_series"]:,}
- Anomaly flags: {report["published"]["anomaly_records"]:,}

## Exclusions

{reason_lines or "- None"}

## Interpretation

Reporting coverage measures whether a market reported in a week, not whether it traded every
day. A missing report is not treated as a zero price. Anomaly flags identify unusual values for
review; they do not prove that a source observation is wrong. Market names are normalized for
display, and unresolved official market references remain visible as a quality limitation.
"""


def transform_data(settings: PipelineSettings, *, incremental: bool = False) -> dict[str, Any]:
    processed_root = settings.absolute_path(settings.paths.processed)
    published_root = settings.absolute_path(settings.paths.published)
    report_root = settings.absolute_path(settings.paths.reports)

    accepted, rejected, validation_summary = flatten_and_validate(settings)
    accepted.write_parquet(processed_root / "accepted_variety_records.parquet")
    rejected.write_parquet(processed_root / "rejected_records.parquet")
    daily = aggregate_market_days(accepted)

    published_history_path = published_root / "market_history.parquet"
    if incremental and published_history_path.exists():
        existing = pl.read_parquet(published_history_path)
        common_columns = [name for name in existing.columns if name in daily.columns]
        daily = (
            pl.concat(
                [existing.select(common_columns), daily.select(common_columns)], how="vertical"
            )
            .unique(subset=["market_id", "commodity", "date"], keep="last")
            .sort(["commodity", "market", "date"])
        )

    daily.write_parquet(processed_root / "all_market_daily.parquet")
    coverage = compute_coverage(daily, settings)
    coverage.write_parquet(processed_root / "market_coverage.parquet")
    selected_pairs = {
        (str(item["commodity"]), str(item["market_id"]))
        for item in coverage.filter(pl.col("selected")).iter_rows(named=True)
    }
    published = daily.filter(
        pl.struct(["commodity", "market_id"]).map_elements(
            lambda item: (str(item["commodity"]), str(item["market_id"])) in selected_pairs,
            return_dtype=pl.Boolean,
        )
    )
    published.write_parquet(published_history_path, compression="zstd")
    coverage.filter(pl.col("selected")).write_parquet(
        published_root / "market_coverage.parquet", compression="zstd"
    )

    date_min = published["date"].min()
    date_max = published["date"].max()
    selected_coverage = coverage.filter(pl.col("selected"))
    report: dict[str, Any] = {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "validation": validation_summary,
        "published": {
            "records": published.height,
            "series": selected_coverage.height,
            "markets": published["market_id"].n_unique(),
            "state": settings.source.state_name,
            "commodities": sorted(published["commodity"].unique().to_list()),
            "date_min": date_min.isoformat() if isinstance(date_min, date) else None,
            "date_max": date_max.isoformat() if isinstance(date_max, date) else None,
            "stale_series": selected_coverage.filter(
                pl.col("latest_age_days") > settings.quality.stale_after_days
            ).height,
            "long_gap_series": selected_coverage.filter(
                pl.col("maximum_gap_days") > settings.quality.long_gap_days
            ).height,
            "anomaly_records": published.filter(pl.col("is_anomaly")).height,
            "missing_district_records": published.filter(pl.col("district") == "Unknown").height,
        },
    }
    write_json(report_root / "data_quality.json", report)
    (report_root / "DATA_QUALITY.md").write_text(_quality_markdown(report), encoding="utf-8")

    source_manifest_path = settings.absolute_path(settings.paths.raw) / "manifest.json"
    published_report = report["published"]
    if not isinstance(published_report, dict):
        raise RuntimeError("Data-quality report has an invalid published summary")
    dataset_manifest = {
        "schema_version": 1,
        "dataset_name": "MandiLens Maharashtra market-day price snapshot",
        "provider": settings.source.provider,
        "source_url": str(settings.source.catalog_url),
        "api_base_url": str(settings.source.api_base_url),
        "retrieval_date": datetime.now(UTC).date().isoformat(),
        "license": settings.source.license_name,
        "license_url": str(settings.source.license_url),
        "date_range": [published_report["date_min"], published_report["date_max"]],
        "filters": {
            "state": settings.source.state_name,
            "commodities": [item.name for item in settings.source.commodities],
            "minimum_weekly_coverage": settings.quality.minimum_weekly_coverage,
            "markets_per_commodity": settings.quality.markets_per_commodity,
        },
        "transformations": [
            "Validated positive ordered min, modal, and max prices",
            "Removed exact duplicates and retained exclusion reasons",
            "Aggregated varieties to market-day using arrival-weighted modal price when available",
            "Selected active series using weekly reporting coverage",
            "Flagged robust price anomalies without deleting them",
        ],
        "known_limitations": [
            "Reporting is irregular and does not establish that no trade occurred on missing days",
            "Market-day values aggregate varieties and grades for a stable comparison unit",
            "Arrival quantities are source-reported and may be revised",
        ],
        "record_count": published.height,
        "sha256": sha256_file(published_history_path),
        "source_manifest_sha256": (
            sha256_file(source_manifest_path) if source_manifest_path.exists() else None
        ),
    }
    write_json(published_root / "dataset_manifest.json", dataset_manifest)
    log_event(
        "transformation_complete",
        accepted=accepted.height,
        excluded=rejected.height,
        published=published.height,
        selected_series=selected_coverage.height,
        incremental=incremental,
    )
    return report
