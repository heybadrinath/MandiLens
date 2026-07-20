# Concise interview explanation

## 30-second version

MandiLens is a free, deployed decision-support product for comparing selected Maharashtra mandis.
I built a Python batch pipeline around official AGMARKNET reports, validated 183,174 source rows,
aggregated varieties to stable market-days, and evaluated three time-series baselines plus a global
tree model with rolling-origin splits. The tree narrowly cleared a preset 1% improvement rule. A
static Next.js app shows observed history, empirical seven-day ranges, data quality, and market
rankings after costs entered by the user—without an always-on backend or invented transport rates.

## Two-minute walkthrough

1. **Product problem:** raw public price reports do not answer which market may leave the strongest
   return after cost, freshness, volatility, and uncertainty.
2. **Scope:** three commodities and 21 well-reported Maharashtra series instead of unreliable
   nationwide breadth.
3. **Data engineering:** monthly keyless API retrieval, idempotent cache, checksums, reference
   mapping, typed parsing, invariant checks, rejection reasons, Parquet, and market-day aggregation.
4. **Modeling:** as-of features for irregular series, three honest baselines, portable histogram
   gradient boosting, four future-only windows, and a 1% complexity threshold.
5. **Uncertainty:** prior-fold absolute-error quantiles produce commodity/horizon ranges; empirical
   coverage is measured rather than assumed.
6. **Decision layer:** the browser converts quantity, subtracts each user-entered market cost, and
   propagates forecast low/high values into net ranges. No distance or rate is invented.
7. **Operations:** a public GitHub workflow refreshes recent months weekly and commits only after
   validation, tests, audit, and production build. Vercel serves static output at ₹0 ongoing cost.
8. **Honesty:** the tree’s win is only 1.12% over the strongest baseline, tomato error is materially
   higher, and the interface makes those limitations inspectable.

## Likely questions

### Why not use random train/test split?

It would train on records that occur after scored observations and overstate real forecast
performance. Rolling-origin folds reproduce the deployment direction of time.

### How did you avoid leakage with missing days?

Lags are as-of lookups at or before the origin, rolling windows stop at the origin, and targets are
created only when the source actually reports on a future date. Missing dates are never zero-valued
targets.

### Why did the tree only improve slightly?

Short-horizon noisy prices have strong persistence, so recent-price baselines are difficult to beat.
That is exactly why the project requires a threshold and publishes all comparisons instead of
assuming a more complex model should win.

### Why not use LightGBM?

The local native runtime required a platform-specific OpenMP library. Scikit-learn’s histogram
gradient boosting provides the required tree-based global model with portable installation and no
material product compromise at this scale.

### Why no API or database?

Forecasts can be precomputed for every supported series and horizon. User inputs affect arithmetic,
not model inference. There is no persistent user feature, so those services would create cost and
failure modes without product value.

### What would you improve first?

Measure post-deployment calibration over additional rolling windows. For product expansion, validate
coordinates and actual transport-cost semantics before adding distance, and partition the web
artifact before adding many more series.
