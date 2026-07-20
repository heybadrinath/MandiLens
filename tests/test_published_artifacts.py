import json
from pathlib import Path
from typing import Any

import polars as pl

ROOT = Path(__file__).resolve().parents[1]


def _json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def test_published_history_satisfies_price_invariants() -> None:
    history = pl.read_parquet(ROOT / "data/published/market_history.parquet")
    assert history.height > 1_000
    assert history.filter(pl.col("min_price") <= 0).is_empty()
    assert history.filter(pl.col("min_price") > pl.col("representative_price")).is_empty()
    assert history.filter(pl.col("representative_price") > pl.col("max_price")).is_empty()
    assert history.select(["commodity", "market_id", "date"]).is_duplicated().sum() == 0
    assert set(history["aggregation_method"].unique().to_list()) <= {
        "arrival-weighted mean of variety modal prices",
        "median of variety modal prices",
    }


def test_all_market_window_can_reconsider_unselected_series() -> None:
    all_history = pl.read_parquet(ROOT / "data/published/all_market_history.parquet")
    selected = pl.read_parquet(ROOT / "data/published/market_history.parquet")
    assert all_history.height > selected.height
    assert (
        all_history.select(["commodity", "market_id"]).unique().height
        > selected.select(["commodity", "market_id"]).unique().height
    )


def test_forecasts_compare_one_common_calendar_date() -> None:
    forecasts = pl.read_parquet(ROOT / "data/published/forecasts.parquet")
    model = _json(ROOT / "reports/model_evaluation.json")
    series = forecasts.select(["commodity", "market_id"]).unique().height
    assert forecasts.height == series * 7
    assert set(forecasts["target_offset_days"].unique().to_list()) == set(range(1, 8))
    for offset in range(1, 8):
        assert (
            forecasts.filter(pl.col("target_offset_days") == offset)["forecast_date"].n_unique()
            == 1
        )
    assert forecasts.filter(pl.col("forecast_low") > pl.col("forecast_price")).is_empty()
    assert forecasts.filter(pl.col("forecast_price") > pl.col("forecast_high")).is_empty()
    assert forecasts["method"].unique().to_list() == [model["selected_method"]]
    if model["selected_method"] == "recent_level_tree_blend":
        visible_paths = forecasts.group_by(["commodity", "market_id"]).agg(
            pl.col("forecast_price").round(0).n_unique().alias("visible_points")
        )
        changing_paths = visible_paths.filter(pl.col("visible_points") > 1).height
        assert changing_paths / series >= 0.75


def test_partitioned_web_artifacts_reconcile_and_have_no_local_paths() -> None:
    manifest_path = ROOT / "apps/web/public/data/manifest.json"
    evidence_path = ROOT / "apps/web/public/data/evidence.json"
    manifest = _json(manifest_path)
    evidence = _json(evidence_path)
    refresh = evidence["quality"]["current_refresh_validation"]
    cumulative = evidence["quality"]["cumulative_validation"]
    assert (
        refresh["accepted_variety_records"] + refresh["excluded_records"]
        == refresh["input_records"]
    )
    assert (
        cumulative["accepted_records"] + cumulative["excluded_records"]
        == cumulative["input_records"]
    )
    assert len(manifest["partitions"]) >= 3
    assert (
        sum(item["observationCount"] for item in manifest["partitions"])
        == manifest["meta"]["observedRecords"]
    )
    for partition in manifest["partitions"]:
        path = ROOT / "apps/web/public" / partition["url"].lstrip("/")
        assert path.exists()
        payload = _json(path)
        assert len(payload["observations"]) == partition["observationCount"]
    public_text = manifest_path.read_text(encoding="utf-8") + evidence_path.read_text(
        encoding="utf-8"
    )
    assert "/Users/" not in public_text
    assert '"source_file":' not in public_text


def test_model_selection_obeys_improvement_and_stability_gates() -> None:
    model = _json(ROOT / "reports/model_evaluation.json")
    comparison = {item["method"]: item for item in model["selection_method_comparison"]}
    selected = model["selected_method"]
    stability = model["selection_stability"]
    candidate = comparison[stability["candidate_method"]]
    baseline = comparison[stability["strongest_baseline"]]
    if selected == stability["candidate_method"]:
        assert candidate["mae"] <= baseline["mae"] * (
            1 - stability["required_improvement"]
        )
        assert stability["candidate_fold_win_share"] >= stability["required_fold_win_share"]
    else:
        assert selected == stability["strongest_baseline"]
    blend = stability["blend"]
    assert blend["tree_weight"] in blend["tested_tree_weights"]
    assert blend["level_drift_weight"] in blend["tested_level_drift_weights"]
    assert round(blend["baseline_weight"] + blend["tree_weight"], 10) == 1.0
    assert model["locked_holdout"]["start"] > model["rolling_folds"][-1]["test_start"]


def test_source_and_license_are_publicly_attributed() -> None:
    source = _json(ROOT / "apps/web/public/data/manifest.json")["source"]
    assert source["provider"].startswith("Directorate of Marketing and Inspection")
    assert source["license"] == "Government Open Data License - India"
    assert source["attributionRequired"] is True
    assert source["endorsement"] is False
