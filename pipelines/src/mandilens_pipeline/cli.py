from __future__ import annotations

import argparse
import time
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from mandilens_pipeline.config import DEFAULT_CONFIG_PATH, PipelineSettings, load_settings
from mandilens_pipeline.evaluation import evaluate_and_train
from mandilens_pipeline.export import export_web_artifact
from mandilens_pipeline.features import build_features
from mandilens_pipeline.inference import generate_forecasts
from mandilens_pipeline.ingestion import download_data
from mandilens_pipeline.io_utils import write_json
from mandilens_pipeline.logging_utils import log_event
from mandilens_pipeline.sample import build_development_sample
from mandilens_pipeline.transformation import transform_data


def _with_end_date(settings: PipelineSettings, value: str | None) -> PipelineSettings:
    if not value:
        return settings
    parsed = date.fromisoformat(value)
    return settings.model_copy(
        update={"source": settings.source.model_copy(update={"end_date": parsed})}
    )


def _run_all(
    settings: PipelineSettings,
    *,
    refresh_downloads: bool,
    recent_only: bool,
    incremental: bool,
) -> dict[str, Any]:
    started = time.perf_counter()
    steps: list[dict[str, Any]] = []

    def run_step(name: str, operation: Any) -> Any:
        step_started = time.perf_counter()
        result = operation()
        steps.append({"step": name, "seconds": round(time.perf_counter() - step_started, 3)})
        return result

    run_step(
        "download",
        lambda: download_data(
            settings,
            refresh=refresh_downloads,
            recent_only=recent_only,
        ),
    )
    run_step("transform", lambda: transform_data(settings, incremental=incremental))
    run_step("features", lambda: build_features(settings))
    run_step("train_and_evaluate", lambda: evaluate_and_train(settings))
    run_step("forecast", lambda: generate_forecasts(settings))
    run_step("export", lambda: export_web_artifact(settings))

    report = {
        "schema_version": 1,
        "completed_at": datetime.now(UTC).isoformat(),
        "total_seconds": round(time.perf_counter() - started, 3),
        "steps": steps,
        "incremental": incremental,
    }
    write_json(settings.absolute_path(settings.paths.reports) / "pipeline_run.json", report)
    log_event("pipeline_complete", **report)
    return report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mandilens-pipeline",
        description="Download, validate, model, and publish MandiLens data artifacts.",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help="Pipeline TOML file.",
    )
    parser.add_argument(
        "--end-date",
        help="Override the inclusive source end date (YYYY-MM-DD).",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    download = subparsers.add_parser("download", help="Download monthly source responses.")
    download.add_argument("--refresh", action="store_true")
    download.add_argument("--recent-only", action="store_true")

    transform = subparsers.add_parser("transform", help="Validate and transform source data.")
    transform.add_argument("--incremental", action="store_true")
    subparsers.add_parser("validate", help="Run validation and rebuild the quality report.")
    subparsers.add_parser("sample", help="Create a small deterministic development Parquet file.")
    subparsers.add_parser("features", help="Build leakage-safe training and forecast features.")
    subparsers.add_parser("train", help="Evaluate baselines and train the selected model.")
    subparsers.add_parser("evaluate", help="Re-run chronological model evaluation.")
    subparsers.add_parser("forecast", help="Generate common-date one-to-seven-day forecasts.")
    subparsers.add_parser("export", help="Build partitioned static web data artifacts.")

    full = subparsers.add_parser("all", help="Run the complete pipeline.")
    full.add_argument("--refresh", action="store_true")
    subparsers.add_parser(
        "refresh",
        help="Refresh two months, merge the all-market history, retrain, and export.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    settings = _with_end_date(load_settings(arguments.config), arguments.end_date)

    match arguments.command:
        case "download":
            download_data(
                settings,
                refresh=bool(arguments.refresh),
                recent_only=bool(arguments.recent_only),
            )
        case "transform" | "validate":
            transform_data(settings, incremental=bool(getattr(arguments, "incremental", False)))
        case "sample":
            build_development_sample(settings)
        case "features":
            build_features(settings)
        case "train" | "evaluate":
            evaluate_and_train(settings)
        case "forecast":
            generate_forecasts(settings)
        case "export":
            export_web_artifact(settings)
        case "all":
            _run_all(
                settings,
                refresh_downloads=bool(arguments.refresh),
                recent_only=False,
                incremental=False,
            )
        case "refresh":
            _run_all(
                settings,
                refresh_downloads=True,
                recent_only=True,
                incremental=True,
            )
        case _:
            parser.error(f"Unknown command: {arguments.command}")


if __name__ == "__main__":
    main()
