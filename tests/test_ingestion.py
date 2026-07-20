from datetime import date

from mandilens_pipeline.ingestion import count_response_rows, iter_months


def test_iter_months_crosses_year_boundary() -> None:
    assert list(iter_months(date(2025, 11, 20), date(2026, 2, 1))) == [
        (2025, 11),
        (2025, 12),
        (2026, 1),
        (2026, 2),
    ]


def test_iter_months_is_inclusive_for_one_month() -> None:
    assert list(iter_months(date(2026, 7, 1), date(2026, 7, 20))) == [(2026, 7)]


def test_count_response_rows_handles_varieties_and_empty_entries() -> None:
    payload = {
        "markets": [
            {
                "dates": [
                    {"data": [{"variety": "A"}, {"variety": "B"}]},
                    {"data": []},
                ]
            },
            {"dates": [{"data": [{"variety": "C"}]}]},
        ]
    }
    assert count_response_rows(payload) == 4


def test_count_response_rows_tolerates_missing_markets() -> None:
    assert count_response_rows({}) == 0
