# Data flow

## 1. Retrieve

`mandilens-pipeline download` requests the official AGMARKNET 2.0 monthly market report endpoint for
Maharashtra state ID 20 and commodity IDs 23 (onion), 24 (potato), and 65 (tomato). The configured
historical interval is January 2021 through 20 July 2026.

Each response is stored at:

```text
data/raw/agmarknet/<commodity>/<year>-<month>.json
```

The downloader:

- sends a named public-interest user agent;
- uses timeouts, redirect support, transport retries, and three application-level attempts;
- waits between new monthly requests;
- reuses valid cached files by default;
- records row count, relative path, SHA-256, status, source, provider, licence, and retrieval time in
  `data/raw/agmarknet/manifest.json`.

Raw files are intentionally not committed.

## 2. Validate and normalize

`mandilens-pipeline validate` creates an accepted layer and an explicit rejection ledger.

Validation covers:

- required market identity and date;
- date range;
- numeric price parsing and finite values;
- positive min/modal/max prices;
- documented ₹2,50,000 per-quintal extreme ceiling;
- `minimum ≤ modal ≤ maximum` source semantics;
- non-negative arrivals when present;
- exact duplicate identity/date/variety/price combinations;
- official market and district reference matching.

Market display capitalization and whitespace are normalized. That normalization is counted as a
correction; source prices are not overwritten to hide questionable values.

## 3. Aggregate

Valid varieties become one state/district/market/commodity/date row:

- minimum price: minimum of variety minima;
- maximum price: maximum of variety maxima;
- modal price: arrival-weighted mean of variety modal prices when positive arrival weights exist,
  otherwise median variety modal price;
- arrivals: sum of non-null reported arrivals;
- variety context: number of varieties and a stable primary display value;
- published precision: paise for prices and kilograms-equivalent precision for tonne arrivals.

A trailing robust median absolute-deviation score flags unusual modal prices. Flags stay in the
history; they are not automatic exclusions.

## 4. Select series by evidence

Coverage is measured over the latest 730 days. A series is eligible when it has:

- at least 150 market-day observations;
- at least 45% weekly reporting coverage;
- a last report no more than 21 days before the requested end date.

The seven strongest recent series per commodity are published. Current selected series have 100%
weekly coverage in the measurement window; that means at least one report per represented week, not
daily reporting.

## 5. Build time-safe features

For each observed origin, as-of lookups and trailing windows use only rows dated on or before that
origin. Features include:

- 1, 7, 14, and 28-day as-of price lags;
- 7, 14, 30, and 90-day rolling means;
- 30-day rolling median and standard deviation;
- seven-day momentum;
- current min/max spread and arrivals;
- freshness since the prior report and reports in the trailing 30 days;
- horizon, weekday, ISO week, and month;
- commodity, market, district, and coverage tier.

Training targets exist only when the source contains an observation on the future target date.
Missing calendar days are not manufactured outcomes.

## 6. Evaluate and select

Three 60-day model-selection windows use expanding training history that always ends before the
target date. A later 60-day holdout remains locked until the method and blend parameters are fixed.

Evaluated methods:

1. last observation;
2. five-report moving average;
3. seven-day seasonal naive;
4. global histogram gradient boosting with absolute-error loss.
5. a recent-level + lead-aware blend with a tuned damped level-gap adjustment.

The strongest lead-aware candidate is accepted only if pooled selection-fold MAE is at least 1%
lower than the best baseline and it wins at least two thirds of usable folds. The current blend
uses 65% five-report moving average, 35% tree output, and a 7.5% damped level-gap adjustment per
lead day. It improved selection MAE by 2.95%, won all three folds, and then improved MAE again on
the separately reported holdout. Holdout metrics are not inputs to the automated selector.

## 7. Calibrate uncertainty

Signed forecast residuals are grouped hierarchically by market, state/crop, crop, lead, and recent
volatility. Sparse groups back off to broader levels. During holdout evaluation, calibration uses
only residuals from the earlier chronological selection folds.

The final production quantiles use all out-of-fold selected-method residuals and are stored in the
model bundle.

## 8. Export

The application artifact contains:

- metadata and freshness threshold;
- source/licence attribution;
- selected market coverage;
- 32,617 market-day observations;
- 147 current forecasts (21 series × 7 horizons);
- monthly seasonal medians;
- data-quality summary;
- model comparison and segmented performance;
- model metadata and analytical definitions.

No raw path, local absolute path, source file name, credential, or user data is exported.

## 9. Refresh safely

The weekly workflow requests the current and previous month, merges by
market/commodity/date, rebuilds every downstream artifact, and runs pipeline tests plus the full
Next.js build. It commits only if all gates pass, preserving the last known-good snapshot on any
source, schema, validation, model, test, or build failure.
