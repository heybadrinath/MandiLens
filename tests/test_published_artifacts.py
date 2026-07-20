import json
from pathlib import Path
from typing import Any

import polars as pl

ROOT = Path(__file__).resolve().parents[1]


def _web_data() -> dict[str, Any]:
    return json.loads((ROOT / "apps/web/public/data/mandilens.json").read_text(encoding="utf-8"))


def test_published_history_satisfies_price_invariants() -> None:
    history = pl.read_parquet(ROOT / "data/published/market_history.parquet")
    assert history.height > 30_000
    assert history.filter(pl.col("min_price") <= 0).is_empty()
    assert history.filter(pl.col("min_price") > pl.col("modal_price")).is_empty()
    assert history.filter(pl.col("modal_price") > pl.col("max_price")).is_empty()
    assert history.select(["commodity", "market_id", "date"]).is_duplicated().sum() == 0


def test_forecast_artifact_has_one_to_seven_days_for_every_series() -> None:
    forecasts = pl.read_parquet(ROOT / "data/published/forecasts.parquet")
    assert forecasts.height == 147
    assert set(forecasts["horizon"].unique().to_list()) == set(range(1, 8))
    assert forecasts.filter(pl.col("forecast_low") > pl.col("forecast_price")).is_empty()
    assert forecasts.filter(pl.col("forecast_price") > pl.col("forecast_high")).is_empty()


def test_web_artifact_reconciles_quality_counts_and_has_no_local_paths() -> None:
    path = ROOT / "apps/web/public/data/mandilens.json"
    payload = _web_data()
    text = path.read_text(encoding="utf-8")
    quality = payload["quality"]
    assert (
        quality["validation"]["accepted_variety_records"]
        + quality["validation"]["excluded_records"]
        == quality["validation"]["input_records"]
    )
    assert payload["meta"]["observedRecords"] == len(payload["observations"])
    assert "/Users/" not in text
    assert '"source_file":' not in text


def test_model_selection_obeys_complexity_threshold() -> None:
    model = _web_data()["model"]
    comparison = {item["method"]: item for item in model["method_comparison"]}
    selected = model["selected_method"]
    tree = comparison["hist_gradient_boosting"]
    baselines = [item for name, item in comparison.items() if name != "hist_gradient_boosting"]
    best_baseline = min(baselines, key=lambda item: item["mae"])
    if selected == "hist_gradient_boosting":
        assert tree["mae"] <= best_baseline["mae"] * 0.99
    else:
        assert selected == best_baseline["method"]


def test_source_and_license_are_publicly_attributed() -> None:
    source = _web_data()["sources"][0]
    assert source["provider"].startswith("Directorate of Marketing and Inspection")
    assert source["license"] == "Government Open Data License - India"
    assert source["attributionRequired"] is True
    assert source["endorsement"] is False
