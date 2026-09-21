# Model-evaluation report

Generated: 2026-09-21T09:25:58.008577+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**1.61%** and won **3 of
3** folds. Its blend uses **75%**
Five-report moving average, **25%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 474.62 | 10.0% | 12.7% | 48.4% | 547,397 |
| Five-report moving average | 482.41 | 10.2% | 13.0% | 52.3% | 547,397 |
| Last observation | 498.50 | 10.5% | 13.2% | 23.0% | 547,397 |
| Global histogram gradient boosting | 504.19 | 10.6% | 13.2% | 48.2% | 547,397 |
| Seven-day seasonal naive | 585.34 | 12.3% | 15.7% | 49.1% | 547,397 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Five-report moving average | 507.35 | 9.9% | 12.2% | 53.5% | 198,076 |
| Validated recent-level + lead-aware blend | 508.13 | 9.9% | 12.1% | 47.5% | 198,076 |
| Last observation | 538.87 | 10.5% | 12.5% | 24.5% | 198,076 |
| Global histogram gradient boosting | 561.84 | 10.9% | 13.0% | 45.9% | 198,076 |
| Seven-day seasonal naive | 618.75 | 12.0% | 14.6% | 50.7% | 198,076 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹-0.78/quintal** with a 95% interval from
**₹-3.04** to
**₹1.51**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **72.0%** of
**198,076** forecasts. Calibration backs off from market, lead, and volatility groups
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
