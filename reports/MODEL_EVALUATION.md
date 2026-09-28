# Model-evaluation report

Generated: 2026-09-28T10:19:06.449626+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**1.54%** and won **3 of
3** folds. Its blend uses **75%**
Five-report moving average, **25%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 470.65 | 9.9% | 12.6% | 48.0% | 549,510 |
| Five-report moving average | 478.00 | 10.0% | 12.9% | 52.8% | 549,510 |
| Last observation | 494.65 | 10.4% | 13.0% | 23.7% | 549,510 |
| Global histogram gradient boosting | 502.24 | 10.5% | 13.1% | 47.8% | 549,510 |
| Seven-day seasonal naive | 578.53 | 12.2% | 15.4% | 49.6% | 549,510 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Five-report moving average | 489.75 | 9.6% | 12.0% | 53.6% | 198,396 |
| Validated recent-level + lead-aware blend | 492.82 | 9.6% | 11.9% | 46.3% | 198,396 |
| Last observation | 522.80 | 10.2% | 12.3% | 25.9% | 198,396 |
| Global histogram gradient boosting | 554.40 | 10.8% | 13.1% | 45.1% | 198,396 |
| Seven-day seasonal naive | 601.44 | 11.8% | 14.4% | 51.0% | 198,396 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹-3.07/quintal** with a 95% interval from
**₹-5.78** to
**₹-0.42**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **72.2%** of
**198,396** forecasts. Calibration backs off from market, lead, and volatility groups
to broader state/crop, crop, lead, or global residuals when samples are sparse.

## Validation boundaries

- Chronological expanding-window folds only; no random train/test split.
- A final time holdout is reported separately and is not an input to the automated selector.
- After iterative model development, holdout results are descriptive confirmation rather than a
  permanently untouched benchmark.
- Blend and damped level-drift weights are selected only from the chronological selection folds.
- Lag and rolling features use observations available on or before each forecast origin.
- Feature importance is measured by permutation on the locked holdout using a model trained only
  before that holdout. It describes model behavior, not causation.
- Missing reporting dates remain missing and are never scored as zero prices.
