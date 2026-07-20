from __future__ import annotations

import time
from collections.abc import Iterator
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import httpx

from mandilens_pipeline.config import PipelineSettings
from mandilens_pipeline.io_utils import read_json, sha256_file, write_json
from mandilens_pipeline.logging_utils import log_event

USER_AGENT = "MandiLens/0.1 (public-interest portfolio research; polite batch client)"


def iter_months(start: date, end: date) -> Iterator[tuple[int, int]]:
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        yield year, month
        month += 1
        if month == 13:
            year += 1
            month = 1


def count_response_rows(payload: dict[str, Any]) -> int:
    count = 0
    for market in payload.get("markets", []):
        for dated_entry in market.get("dates", []):
            values = dated_entry.get("data", [])
            count += len(values) if values else 1
    return count


def _request_json(
    client: httpx.Client,
    endpoint: str,
    *,
    params: dict[str, str | int | bool] | None = None,
) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            response = client.get(endpoint, params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError(f"Expected an object from {endpoint}")
            return payload
        except (httpx.HTTPError, ValueError) as error:
            last_error = error
            if attempt == 3:
                break
            time.sleep(0.5 * attempt)
    raise RuntimeError(f"AGMARKNET request failed for {endpoint}") from last_error


def _download_reference_data(client: httpx.Client, raw_root: Path, refresh: bool) -> Path:
    target = raw_root / "reference" / "filters.json"
    if target.exists() and not refresh:
        return target
    payload = _request_json(client, "/daily-price-arrival/filters")
    if not payload.get("status"):
        raise RuntimeError("AGMARKNET returned an unsuccessful filter response")
    write_json(target, payload)
    return target


def download_data(
    settings: PipelineSettings,
    *,
    refresh: bool = False,
    recent_only: bool = False,
) -> dict[str, Any]:
    source = settings.source
    raw_root = settings.absolute_path(settings.paths.raw)
    raw_root.mkdir(parents=True, exist_ok=True)

    end_date = source.end_date
    if recent_only:
        previous_month_end = end_date.replace(day=1)
        if previous_month_end.month == 1:
            start_date = date(previous_month_end.year - 1, 12, 1)
        else:
            start_date = date(previous_month_end.year, previous_month_end.month - 1, 1)
    else:
        start_date = source.start_date

    downloaded_at = datetime.now(UTC)
    artifacts: list[dict[str, Any]] = []
    client = httpx.Client(
        base_url=str(source.api_base_url).rstrip("/"),
        timeout=httpx.Timeout(90.0),
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        transport=httpx.HTTPTransport(retries=2),
    )
    try:
        reference_path = _download_reference_data(client, raw_root, refresh)
        for commodity in source.commodities:
            for year, month in iter_months(start_date, end_date):
                target = raw_root / commodity.name.lower() / f"{year}-{month:02d}.json"
                status = "cached"
                if refresh or not target.exists():
                    payload = _request_json(
                        client,
                        "/prices-and-arrivals/date-wise/specific-commodity",
                        params={
                            "year": year,
                            "month": month,
                            "includeExcel": "false",
                            "stateId": source.state_id,
                            "commodityId": commodity.id,
                        },
                    )
                    if payload.get("success") is not True:
                        raise RuntimeError(
                            f"Unsuccessful response for {commodity.name} {year}-{month:02d}"
                        )
                    write_json(target, payload)
                    status = "downloaded"
                    time.sleep(source.request_delay_seconds)

                payload = read_json(target)
                artifacts.append(
                    {
                        "commodity_id": commodity.id,
                        "commodity": commodity.name,
                        "year": year,
                        "month": month,
                        "relative_path": str(target.relative_to(settings.absolute_path(Path(".")))),
                        "sha256": sha256_file(target),
                        "record_count": count_response_rows(payload),
                        "status": status,
                    }
                )
                log_event(
                    "source_month_ready",
                    commodity=commodity.name,
                    month=f"{year}-{month:02d}",
                    status=status,
                    records=artifacts[-1]["record_count"],
                )
    finally:
        client.close()

    manifest = {
        "schema_version": 1,
        "source": source.name,
        "provider": source.provider,
        "catalog_url": str(source.catalog_url),
        "license": source.license_name,
        "license_url": str(source.license_url),
        "retrieved_at": downloaded_at.isoformat(),
        "filters_sha256": sha256_file(reference_path),
        "date_range_requested": [start_date.isoformat(), end_date.isoformat()],
        "record_count": sum(int(item["record_count"]) for item in artifacts),
        "files": artifacts,
    }
    write_json(raw_root / "manifest.json", manifest)
    log_event(
        "download_complete",
        files=len(artifacts),
        records=manifest["record_count"],
        recent_only=recent_only,
    )
    return manifest
