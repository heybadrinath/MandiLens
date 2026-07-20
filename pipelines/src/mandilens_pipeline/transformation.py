from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from statistics import median
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.ingestion import iter_months, slugify
from mandilens_pipeline.io_utils import read_json, sha256_file, write_json
from mandilens_pipeline.logging_utils import log_event

SPACE_PATTERN = re.compile(r"\s+")


def normalized_key(value: str) -> str:
    return SPACE_PATTERN.sub(" ", value.strip()).casefold()


def display_market_name(value: str) -> str:
    cleaned = SPACE_PATTERN.sub(" ", value.strip())
    if cleaned.isupper():
        cleaned = cleaned.title()
    replacements = {"Apmc": "APMC", "Ap Mc": "APMC", "Mandi": "Mandi"}
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


def _stable_market_id(state_id: int, market_name: str) -> str:
    digest = hashlib.sha1(normalized_key(market_name).encode("utf-8")).hexdigest()[:10]
    return f"derived-{state_id}-{digest}"


def _load_reference_maps(
    raw_root: Path, state_ids: set[int]
) -> tuple[dict[tuple[int, str], dict[str, Any]], dict[int, str]]:
    payload = read_json(raw_root / "reference" / "filters.json")
    data = payload["data"]
    districts = {
        int(item["id"]): str(item["district_name"]).strip()
        for item in data.get("district_data", [])
        if item.get("id") is not None
    }
    markets: dict[tuple[int, str], dict[str, Any]] = {}
    for item in data.get("market_data", []):
        if not item.get("mkt_name") or item.get("state_id") is None:
            continue
        state_id = int(item["state_id"])
        if state_id in state_ids:
            markets[(state_id, normalized_key(str(item["mkt_name"])))] = item
    return markets, districts


def _raw_files(settings: PipelineSettings) -> list[tuple[int, str, str, str, Path]]:
    raw_root = settings.absolute_path(settings.paths.raw)
    permitted_months = {
        f"{year}-{month:02d}"
        for year, month in iter_months(settings.source.start_date, settings.source.end_date)
    }
    files: list[tuple[int, str, str, str, Path]] = []
    for state in settings.source.states:
        for commodity in settings.source.commodities:
            by_month: dict[str, Path] = {}
            if state.id == 20:
                legacy_root = raw_root / commodity.name.casefold()
                by_month.update(
                    {
                        item.stem: item
                        for item in legacy_root.glob("*.json")
                        if item.stem in permitted_months
                    }
                )
            current_root = raw_root / f"{state.id}-{slugify(state.name)}" / slugify(commodity.name)
            by_month.update(
                {
                    item.stem: item
                    for item in current_root.glob("*.json")
                    if item.stem in permitted_months
                }
            )
            files.extend(
                (state.id, state.name, commodity.name, month, path)
                for month, path in sorted(by_month.items())
            )
    return files


def flatten_and_validate(
    settings: PipelineSettings,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame, dict[str, Any]]:
    raw_root = settings.absolute_path(settings.paths.raw)
    state_ids = {state.id for state in settings.source.states}
    market_map, district_map = _load_reference_maps(raw_root, state_ids)
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    ledger: list[dict[str, Any]] = []
    reasons: Counter[str] = Counter()
    seen: set[tuple[object, ...]] = set()
    corrected_records = 0
    unresolved_markets = 0
    files = _raw_files(settings)

    for state_id, state_name, commodity_name, source_month, raw_file in files:
        payload = read_json(raw_file)
        file_reasons: Counter[str] = Counter()
        file_accepted = 0
        file_excluded = 0
        for market in payload.get("markets", []):
            raw_market = str(market.get("marketName", "")).strip()
            reference = market_map.get((state_id, normalized_key(raw_market)))
            if reference:
                market_id = f"{state_id}-{reference['id']}"
                district_id = reference.get("district_id")
                district = (
                    district_map.get(int(district_id), "Unknown")
                    if district_id is not None
                    else "Unknown"
                )
            else:
                market_id = _stable_market_id(state_id, raw_market)
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
                        "state_id": state_id,
                        "state": state_name,
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
                        file_reasons[reason] += 1
                        file_excluded += 1
                    else:
                        seen.add(duplicate_key)
                        accepted.append(record)
                        file_accepted += 1

        ledger.append(
            {
                "state_id": state_id,
                "state": state_name,
                "commodity": commodity_name,
                "source_month": source_month,
                "input_records": file_accepted + file_excluded,
                "accepted_records": file_accepted,
                "excluded_records": file_excluded,
                "exclusion_reasons_json": json.dumps(dict(sorted(file_reasons.items()))),
                "source_sha256": sha256_file(raw_file),
            }
        )

    accepted_schema = {
        "state_id": pl.Int64,
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
    ledger_schema = {
        "state_id": pl.Int64,
        "state": pl.String,
        "commodity": pl.String,
        "source_month": pl.String,
        "input_records": pl.Int64,
        "accepted_records": pl.Int64,
        "excluded_records": pl.Int64,
        "exclusion_reasons_json": pl.String,
        "source_sha256": pl.String,
    }
    accepted_df = pl.DataFrame(accepted, schema=accepted_schema)
    rejected_df = pl.DataFrame(rejected, schema=rejected_schema)
    ledger_df = pl.DataFrame(ledger, schema=ledger_schema)
    summary = {
        "source_file_count": len(files),
        "input_records": len(accepted) + len(rejected),
        "accepted_variety_records": len(accepted),
        "excluded_records": len(rejected),
        "corrected_records": corrected_records,
        "unresolved_market_references": unresolved_markets,
        "exclusion_reasons": dict(sorted(reasons.items())),
    }
    return accepted_df, rejected_df, ledger_df, summary


def aggregate_market_days(accepted_df: pl.DataFrame) -> pl.DataFrame:
    if accepted_df.is_empty():
        raise RuntimeError("No valid AGMARKNET records were available after validation")

    arrivals = pl.col("arrivals_tonnes")
    complete_arrivals = arrivals.is_not_null().all()
    positive_arrivals = arrivals.sum() > 0
    aggregated = (
        accepted_df.group_by(
            [
                "state_id",
                "state",
                "district",
                "market_id",
                "market",
                "commodity",
                "date",
            ],
            maintain_order=True,
        )
        .agg(
            pl.col("min_price").min().alias("min_price"),
            pl.col("max_price").max().alias("max_price"),
            pl.when(complete_arrivals & positive_arrivals)
            .then((pl.col("modal_price") * arrivals).sum() / arrivals.sum())
            .otherwise(pl.col("modal_price").median())
            .alias("representative_price"),
            pl.when(arrivals.is_not_null().any())
            .then(arrivals.drop_nulls().sum())
            .otherwise(None)
            .alias("arrivals_tonnes"),
            pl.col("variety").n_unique().alias("variety_count"),
            pl.when(arrivals.is_not_null().any())
            .then(pl.col("variety").sort_by(arrivals.fill_null(-1.0), descending=True).first())
            .otherwise(pl.col("variety").sort().first())
            .alias("example_variety"),
            pl.when(arrivals.is_not_null().any())
            .then(pl.lit("largest reported arrivals"))
            .otherwise(pl.lit("alphabetical fallback"))
            .alias("example_variety_basis"),
            pl.when(complete_arrivals & positive_arrivals)
            .then(pl.lit("arrival-weighted mean of variety modal prices"))
            .otherwise(pl.lit("median of variety modal prices"))
            .alias("aggregation_method"),
            pl.when(complete_arrivals)
            .then(pl.lit("complete"))
            .when(arrivals.is_not_null().any())
            .then(pl.lit("partial"))
            .otherwise(pl.lit("missing"))
            .alias("arrival_coverage"),
        )
        .with_columns(
            pl.col("min_price").round(2),
            pl.col("representative_price").round(2),
            pl.col("max_price").round(2),
            pl.col("arrivals_tonnes").round(3),
        )
        .sort(["state", "commodity", "market", "date"])
    )
    return _add_anomaly_scores(aggregated)


def _add_anomaly_scores(frame: pl.DataFrame) -> pl.DataFrame:
    records: list[dict[str, Any]] = []
    for group in frame.partition_by(["commodity", "market_id"], maintain_order=True):
        rows = group.sort("date").to_dicts()
        prior_prices: list[float] = []
        for row in rows:
            current = float(row["representative_price"])
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
    return pl.DataFrame(records).sort(["state", "commodity", "market", "date"])


def compute_coverage(frame: pl.DataFrame, settings: PipelineSettings) -> pl.DataFrame:
    maximum_date = frame["date"].max()
    if not isinstance(maximum_date, date):
        raise RuntimeError("Processed dataset has no valid dates")
    window_start = maximum_date - timedelta(days=settings.quality.coverage_window_days - 1)
    rows: list[dict[str, Any]] = []

    recent = frame.filter(pl.col("date") >= window_start)
    for group in recent.partition_by(["commodity", "market_id"], maintain_order=True):
        ordered = group.sort("date")
        values = ordered.to_dicts()
        dates = [item["date"] for item in values]
        prices = [float(item["representative_price"]) for item in values]
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
                "state_id": values[0]["state_id"],
                "state": values[0]["state"],
                "commodity": values[0]["commodity"],
                "market_id": values[0]["market_id"],
                "market": values[0]["market"],
                "district": values[0]["district"],
                "first_date": first_date,
                "last_date": last_date,
                "record_count": len(values),
                "weeks_reported": len(weeks),
                "weekly_coverage": round(len(weeks) / possible_weeks, 4),
                "latest_age_days": (maximum_date - last_date).days,
                "maximum_gap_days": max(gaps, default=0),
                "price_cv": round(math.sqrt(variance) / mean_price, 4) if mean_price else None,
                "repeated_price_share": round(repeated_share, 4),
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
        .otherwise(pl.lit("standard"))
        .alias("coverage_tier"),
    )

    selected_keys: set[tuple[str, str]] = set()
    for state in settings.source.states:
        for commodity in settings.source.commodities:
            candidates = coverage.filter(
                (pl.col("state_id") == state.id)
                & (pl.col("commodity") == commodity.name)
                & pl.col("eligible")
            ).sort(
                ["weekly_coverage", "record_count", "latest_age_days"],
                descending=[True, True, False],
            )
            for item in candidates.head(settings.quality.markets_per_state_commodity).iter_rows(
                named=True
            ):
                selected_keys.add((str(item["commodity"]), str(item["market_id"])))

    return coverage.with_columns(
        pl.struct(["commodity", "market_id"])
        .map_elements(
            lambda item: (str(item["commodity"]), str(item["market_id"])) in selected_keys,
            return_dtype=pl.Boolean,
        )
        .alias("selected")
    ).sort(
        ["state", "commodity", "selected", "weekly_coverage"],
        descending=[False, False, True, True],
    )


def _quality_markdown(report: dict[str, Any]) -> str:
    refresh = report["current_refresh_validation"]
    cumulative = report["cumulative_validation"]
    published = report["published"]
    reasons = refresh["exclusion_reasons"]
    reason_lines = "\n".join(f"- `{name}`: {count:,}" for name, count in reasons.items())
    return f"""# Data-quality report

Generated: {report["generated_at"]}

## Current refresh

This run processed **{refresh["input_records"]:,}** variety-level rows from
**{refresh["source_file_count"]:,}** state, commodity, and month responses. It accepted
**{refresh["accepted_variety_records"]:,}** rows and excluded
**{refresh["excluded_records"]:,}** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **{cumulative["source_file_count"]:,}** monthly responses,
**{cumulative["input_records"]:,}** input rows, and **{cumulative["accepted_records"]:,}** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **{report["selection_window"]["records"]:,}** market-day
observations across **{report["selection_window"]["series"]:,}** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: {published["date_min"]} to {published["date_max"]}
- States: {", ".join(published["states"])}
- Commodities with eligible series: {", ".join(published["commodities"])}
- Selected market/commodity series: {published["series"]:,}
- Distinct markets: {published["markets"]:,}
- Stale selected series: {published["stale_series"]:,}
- Long reporting gaps: {published["long_gap_series"]:,}
- Anomaly flags retained: {published["anomaly_records"]:,}

## Current-refresh exclusions

{reason_lines or "- None"}

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
"""


def transform_data(settings: PipelineSettings, *, incremental: bool = False) -> dict[str, Any]:
    processed_root = settings.absolute_path(settings.paths.processed)
    published_root = settings.absolute_path(settings.paths.published)
    report_root = settings.absolute_path(settings.paths.reports)

    accepted, rejected, refresh_ledger, validation_summary = flatten_and_validate(settings)
    accepted.write_parquet(processed_root / "accepted_variety_records.parquet")
    rejected.write_parquet(processed_root / "rejected_records.parquet")
    refreshed_daily = aggregate_market_days(accepted)

    all_history_path = published_root / "all_market_history.parquet"
    if incremental and all_history_path.exists():
        existing = pl.read_parquet(all_history_path)
        all_daily = pl.concat([existing, refreshed_daily], how="diagonal_relaxed")
    else:
        all_daily = refreshed_daily
    all_daily = all_daily.unique(subset=["market_id", "commodity", "date"], keep="last").sort(
        ["state", "commodity", "market", "date"]
    )
    maximum_date = all_daily["date"].max()
    if not isinstance(maximum_date, date):
        raise RuntimeError("The all-market dataset has no valid dates")
    history_cutoff = maximum_date - timedelta(days=settings.quality.all_market_history_days - 1)
    all_daily = all_daily.filter(pl.col("date") >= history_cutoff)
    all_daily.write_parquet(all_history_path, compression="zstd")
    all_daily.write_parquet(processed_root / "all_market_daily.parquet", compression="zstd")

    ledger_path = published_root / "source_quality_ledger.parquet"
    if incremental and ledger_path.exists():
        source_ledger = pl.concat(
            [pl.read_parquet(ledger_path), refresh_ledger], how="diagonal_relaxed"
        )
    else:
        source_ledger = refresh_ledger
    source_ledger = source_ledger.unique(
        subset=["state_id", "commodity", "source_month"], keep="last"
    ).sort(["state", "commodity", "source_month"])
    source_ledger.write_parquet(ledger_path, compression="zstd")

    coverage = compute_coverage(all_daily, settings)
    coverage.write_parquet(processed_root / "market_coverage.parquet")
    coverage.write_parquet(published_root / "all_market_coverage.parquet", compression="zstd")
    selected_pairs = {
        (str(item["commodity"]), str(item["market_id"]))
        for item in coverage.filter(pl.col("selected")).iter_rows(named=True)
    }
    if not selected_pairs:
        raise RuntimeError("No market series met the configured coverage requirements")
    published = all_daily.filter(
        pl.struct(["commodity", "market_id"]).map_elements(
            lambda item: (str(item["commodity"]), str(item["market_id"])) in selected_pairs,
            return_dtype=pl.Boolean,
        )
    )
    published_history_path = published_root / "market_history.parquet"
    published.write_parquet(published_history_path, compression="zstd")
    selected_coverage = coverage.filter(pl.col("selected"))
    selected_coverage.write_parquet(published_root / "market_coverage.parquet", compression="zstd")

    date_min = published["date"].min()
    date_max = published["date"].max()
    cumulative_validation = {
        "source_file_count": source_ledger.height,
        "input_records": int(source_ledger["input_records"].sum() or 0),
        "accepted_records": int(source_ledger["accepted_records"].sum() or 0),
        "excluded_records": int(source_ledger["excluded_records"].sum() or 0),
    }
    report: dict[str, Any] = {
        "schema_version": 2,
        "generated_at": datetime.now(UTC).isoformat(),
        "current_refresh_validation": validation_summary,
        "cumulative_validation": cumulative_validation,
        "selection_window": {
            "records": all_daily.height,
            "series": all_daily.select(["commodity", "market_id"]).unique().height,
            "states": sorted(all_daily["state"].unique().to_list()),
            "commodities": sorted(all_daily["commodity"].unique().to_list()),
            "date_min": history_cutoff.isoformat(),
            "date_max": maximum_date.isoformat(),
        },
        "published": {
            "records": published.height,
            "series": selected_coverage.height,
            "markets": published["market_id"].n_unique(),
            "states": sorted(published["state"].unique().to_list()),
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
    dataset_manifest = {
        "schema_version": 2,
        "dataset_name": "MandiLens multi-state market-day price snapshot",
        "provider": settings.source.provider,
        "source_url": str(settings.source.catalog_url),
        "api_base_url": str(settings.source.api_base_url),
        "retrieval_date": datetime.now(UTC).date().isoformat(),
        "license": settings.source.license_name,
        "license_url": str(settings.source.license_url),
        "date_range": [report["published"]["date_min"], report["published"]["date_max"]],
        "filters": {
            "states": [state.name for state in settings.source.states],
            "commodities": [item.name for item in settings.source.commodities],
            "minimum_weekly_coverage": settings.quality.minimum_weekly_coverage,
            "markets_per_state_commodity": settings.quality.markets_per_state_commodity,
        },
        "transformations": [
            "Validated positive ordered minimum, modal, and maximum source prices",
            "Removed exact duplicates and retained exclusion reasons by source month",
            "Used arrival-weighted variety modal prices only when arrival reporting was complete",
            "Used a median variety modal price when arrival reporting was partial or missing",
            "Selected active series from a committed rolling all-market coverage window",
            "Flagged robust price anomalies without deleting them",
        ],
        "known_limitations": [
            "Reporting is irregular and does not establish that no trade occurred on missing days",
            "Representative market-day prices aggregate varieties and grades",
            "Arrival quantities are source-reported and can be partial or revised",
            "Only state and crop groups with eligible recent reporting are published",
        ],
        "record_count": published.height,
        "all_market_record_count": all_daily.height,
        "sha256": sha256_file(published_history_path),
        "all_market_sha256": sha256_file(all_history_path),
        "source_manifest_sha256": (
            sha256_file(source_manifest_path) if source_manifest_path.exists() else None
        ),
    }
    write_json(published_root / "dataset_manifest.json", dataset_manifest)
    log_event(
        "transformation_complete",
        accepted=accepted.height,
        excluded=rejected.height,
        all_market_records=all_daily.height,
        published=published.height,
        selected_series=selected_coverage.height,
        incremental=incremental,
    )
    return report
