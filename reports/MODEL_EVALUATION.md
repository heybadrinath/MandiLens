# Model-evaluation report

Generated: 2026-09-14T09:23:49.752710+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**2.40%** and won **3 of
3** folds. Its blend uses **65%**
Five-report moving average, **35%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 486.74 | 10.0% | 12.9% | 49.4% | 542,787 |
| Five-report moving average | 498.69 | 10.2% | 13.2% | 52.1% | 542,787 |
| Global histogram gradient boosting | 511.54 | 10.5% | 13.2% | 49.3% | 542,787 |
| Last observation | 514.52 | 10.6% | 13.4% | 22.4% | 542,787 |
| Seven-day seasonal naive | 604.72 | 12.4% | 15.9% | 48.8% | 542,787 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Five-report moving average | 526.90 | 10.1% | 12.5% | 52.5% | 196,317 |
| Validated recent-level + lead-aware blend | 532.27 | 10.2% | 12.4% | 47.4% | 196,317 |
| Last observation | 558.16 | 10.7% | 12.8% | 22.9% | 196,317 |
| Global histogram gradient boosting | 588.92 | 11.3% | 13.3% | 46.1% | 196,317 |
| Seven-day seasonal naive | 643.15 | 12.3% | 15.0% | 49.6% | 196,317 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹-5.37/quintal** with a 95% interval from
**₹-8.65** to
**₹-2.01**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **72.3%** of
**196,317** forecasts. Calibration backs off from market, lead, and volatility groups
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
