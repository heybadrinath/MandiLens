from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import polars as pl

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.io_utils import write_json
from mandilens_pipeline.logging_utils import log_event


def build_development_sample(
    settings: PipelineSettings,
    *,
    series_per_commodity: int = 2,
    rows_per_series: int = 120,
) -> dict[str, Any]:
    published_root = settings.absolute_path(settings.paths.published)
    processed_root = settings.absolute_path(settings.paths.processed)
    reports_root = settings.absolute_path(settings.paths.reports)
    history = pl.read_parquet(published_root / "market_history.parquet").sort(
        ["commodity", "market_id", "date"]
    )
    coverage = pl.read_parquet(published_root / "market_coverage.parquet").sort(
        ["commodity", "market"]
    )

    frames: list[pl.DataFrame] = []
    selected_series: list[dict[str, str]] = []
    for commodity in sorted(coverage["commodity"].unique().to_list()):
        selections = coverage.filter(pl.col("commodity") == commodity).head(series_per_commodity)
        for item in selections.iter_rows(named=True):
            market_id = str(item["market_id"])
            frames.append(
                history.filter(
                    (pl.col("commodity") == commodity) & (pl.col("market_id") == market_id)
                ).tail(rows_per_series)
            )
            selected_series.append(
                {
                    "commodity": str(commodity),
                    "market_id": market_id,
                    "market": str(item["market"]),
                }
            )

    if not frames:
        raise RuntimeError("No published series were available for a development sample")
    sample = pl.concat(frames, how="vertical").sort(["commodity", "market", "date"])
    target = processed_root / "development_sample.parquet"
    sample.write_parquet(target, compression="zstd")
    report: dict[str, Any] = {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "rows": sample.height,
        "series": len(selected_series),
        "series_per_commodity": series_per_commodity,
        "maximum_rows_per_series": rows_per_series,
        "selected_series": selected_series,
        "output": str(target.relative_to(settings.absolute_path(settings.paths.processed.parent))),
    }
    write_json(reports_root / "development_sample.json", report)
    log_event("development_sample_complete", rows=sample.height, series=len(selected_series))
    return report
