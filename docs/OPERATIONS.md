# Operational refresh runbook

## Schedule

The public repository runs `.github/workflows/refresh-data.yml` every Monday at 03:30 UTC (09:00
IST) and supports a manual workflow dispatch. Weekly refresh is proportionate to source behavior,
free runner limits, and the short model runtime.

## Exact local refresh

```bash
make install
make refresh
make check
```

The direct pipeline command is:

```bash
uv run mandilens-pipeline --end-date "$(date -u +%F)" refresh
```

This overrides the initial snapshot end date, downloads the current and prior month, merges recent
rows with the published history, recomputes coverage, rebuilds features, re-evaluates every method,
fits the rule-selected production model, recalibrates intervals, forecasts, and exports the web
artifact.

## Initial full rebuild

```bash
uv run mandilens-pipeline --end-date "$(date -u +%F)" all
```

Cached monthly files are reused. Delete or modify neither raw data nor published artifacts during a
running refresh.

## Generated artifacts to review

- `data/raw/agmarknet/manifest.json` — ignored source retrieval ledger
- `reports/data_quality.json` and `reports/DATA_QUALITY.md`
- `reports/model_evaluation.json` and `reports/MODEL_EVALUATION.md`
- `reports/pipeline_run.json` — step and total timings
- `data/published/dataset_manifest.json`
- `models/published/model_metadata.json`
- `apps/web/public/data/mandilens.json`
- `data/published/artifact_manifest.json` — hashes and artifact size

## Acceptance gates

1. Source requests and response status succeed.
2. Schema, identity, price, arrival, and duplicate validation completes.
3. All three commodities retain selected active series.
4. Chronological evaluation produces predictions for every configured fold.
5. Selection follows the unchanged 1% complexity rule.
6. Forecast point and bounds satisfy positive ordered invariants.
7. Ruff, mypy, pytest, Prettier, ESLint, TypeScript, Vitest, npm audit, and Next.js build pass.
8. Only then are public artifacts committed.

## Failure handling

The workflow does not commit on failure, so the last known-good production snapshot remains
deployed. Diagnose from the first failed structured event or quality gate. Do not weaken validation
to force publication.

Common checks:

```bash
uv run mandilens-pipeline --end-date "$(date -u +%F)" download --recent-only --refresh
uv run mandilens-pipeline validate
uv run mandilens-pipeline evaluate
jq . reports/data_quality.json
jq . reports/model_evaluation.json
```

If the official schema changes, preserve the failing raw response, add a regression test, update the
parser explicitly, and rerun the full acceptance sequence.

## Rollback

Published artifacts are versioned in Git. Revert the single failing data-refresh commit using a new
revert commit, run the quality gates, and let Vercel redeploy. Do not rewrite history or force-push.
