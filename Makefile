.PHONY: install dev format lint typecheck test build download validate sample transform train evaluate forecast pipeline refresh check

install:
	uv sync --all-groups --frozen
	npm ci --prefix apps/web

dev:
	npm run dev --prefix apps/web

format:
	uv run ruff format pipelines tests
	npm run format --prefix apps/web

lint:
	uv run ruff check pipelines tests
	npm run lint --prefix apps/web

typecheck:
	uv run mypy
	npm run typecheck --prefix apps/web

test:
	uv run pytest
	npm test --prefix apps/web

build:
	npm run build --prefix apps/web

download:
	uv run mandilens-pipeline download

validate:
	uv run mandilens-pipeline validate

sample:
	uv run mandilens-pipeline sample

transform:
	uv run mandilens-pipeline transform

train:
	uv run mandilens-pipeline train

evaluate:
	uv run mandilens-pipeline evaluate

forecast:
	uv run mandilens-pipeline forecast

pipeline:
	uv run mandilens-pipeline all

refresh:
	uv run mandilens-pipeline --end-date "$$(date -u +%F)" refresh

check: lint typecheck test build
