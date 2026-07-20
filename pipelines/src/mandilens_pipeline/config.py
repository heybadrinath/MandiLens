from __future__ import annotations

import tomllib
from datetime import date
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CONFIG_PATH = REPOSITORY_ROOT / "config" / "pipeline.toml"


class Commodity(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: int
    name: str


class SourceSettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    provider: str
    api_base_url: HttpUrl
    catalog_url: HttpUrl
    license_name: str
    license_url: HttpUrl
    state_id: int
    state_name: str
    start_date: date
    end_date: date
    request_delay_seconds: float = Field(ge=0.0, le=5.0)
    commodities: tuple[Commodity, ...]


class QualitySettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    maximum_price_per_quintal: float = Field(gt=0)
    stale_after_days: int = Field(ge=1)
    long_gap_days: int = Field(ge=1)
    minimum_records_per_series: int = Field(ge=1)
    minimum_weekly_coverage: float = Field(gt=0, le=1)
    active_market_max_age_days: int = Field(ge=1)
    coverage_window_days: int = Field(ge=30)
    markets_per_commodity: int = Field(ge=1, le=25)


class ModelSettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    forecast_horizon_days: int = Field(ge=1, le=30)
    random_seed: int
    interval_coverage: float = Field(gt=0.5, lt=1)
    evaluation_window_days: int = Field(ge=14)
    evaluation_starts: tuple[date, ...]


class PathSettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    raw: Path
    processed: Path
    published: Path
    models_work: Path
    models_published: Path
    reports: Path
    web_data: Path


class PipelineSettings(BaseModel):
    model_config = ConfigDict(frozen=True)

    source: SourceSettings
    quality: QualitySettings
    model: ModelSettings
    paths: PathSettings

    def absolute_path(self, value: Path) -> Path:
        return value if value.is_absolute() else REPOSITORY_ROOT / value

    def ensure_directories(self) -> None:
        for value in (
            self.paths.raw,
            self.paths.processed,
            self.paths.published,
            self.paths.models_work,
            self.paths.models_published,
            self.paths.reports,
            self.paths.web_data.parent,
        ):
            self.absolute_path(value).mkdir(parents=True, exist_ok=True)


def load_settings(config_path: Path = DEFAULT_CONFIG_PATH) -> PipelineSettings:
    with config_path.open("rb") as handle:
        payload = tomllib.load(handle)
    settings = PipelineSettings.model_validate(payload)
    settings.ensure_directories()
    return settings
