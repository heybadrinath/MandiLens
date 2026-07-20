from datetime import date

import polars as pl
from mandilens_pipeline.transformation import (
    aggregate_market_days,
    display_market_name,
    normalized_key,
    parse_arrival_date,
    parse_number,
)


def test_parsers_accept_source_formats() -> None:
    assert parse_arrival_date("20/07/2026") == date(2026, 7, 20)
    assert parse_arrival_date("2026-07-20") == date(2026, 7, 20)
    assert parse_arrival_date("20-07-2026") == date(2026, 7, 20)
    assert parse_arrival_date("not-a-date") is None
    assert parse_number("1,250.50") == 1250.5
    assert parse_number(float("nan")) is None


def test_market_normalization_is_stable_without_changing_identity() -> None:
    assert normalized_key("  PUNE   APMC ") == "pune apmc"
    assert display_market_name("PUNE APMC") == "Pune APMC"


def test_varieties_aggregate_with_arrival_weighted_modal_price() -> None:
    frame = pl.DataFrame(
        {
            "state": ["Maharashtra", "Maharashtra"],
            "district": ["Pune", "Pune"],
            "market_id": ["1", "1"],
            "market": ["Pune APMC", "Pune APMC"],
            "commodity": ["Onion", "Onion"],
            "variety": ["Local", "Red"],
            "date": [date(2026, 7, 20), date(2026, 7, 20)],
            "min_price": [80.0, 150.0],
            "max_price": [140.0, 240.0],
            "modal_price": [100.0, 200.0],
            "arrivals_tonnes": [2.0, 6.0],
            "source_file": ["one.json", "one.json"],
        }
    )

    result = aggregate_market_days(frame).row(0, named=True)
    assert result["min_price"] == 80.0
    assert result["max_price"] == 240.0
    assert result["modal_price"] == 175.0
    assert result["arrivals_tonnes"] == 8.0
    assert result["variety_count"] == 2


def test_varieties_fall_back_to_median_when_arrivals_are_missing() -> None:
    frame = pl.DataFrame(
        {
            "state": ["Maharashtra", "Maharashtra"],
            "district": ["Pune", "Pune"],
            "market_id": ["1", "1"],
            "market": ["Pune APMC", "Pune APMC"],
            "commodity": ["Tomato", "Tomato"],
            "variety": ["Local", "Other"],
            "date": [date(2026, 7, 20), date(2026, 7, 20)],
            "min_price": [80.0, 150.0],
            "max_price": [140.0, 240.0],
            "modal_price": [100.0, 200.0],
            "arrivals_tonnes": [None, None],
            "source_file": ["one.json", "one.json"],
        },
        schema_overrides={"arrivals_tonnes": pl.Float64},
    )

    result = aggregate_market_days(frame).row(0, named=True)
    assert result["modal_price"] == 150.0
