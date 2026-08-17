# Model-evaluation report

Generated: 2026-08-17T04:24:01.167935+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**1.97%** and won **3 of
3** folds. Its blend uses **70%**
Five-report moving average, **30%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 476.71 | 9.7% | 12.5% | 48.8% | 523,796 |
| Five-report moving average | 486.29 | 9.9% | 12.8% | 52.7% | 523,796 |
| Last observation | 499.23 | 10.2% | 13.0% | 23.2% | 523,796 |
| Global histogram gradient boosting | 510.90 | 10.4% | 13.1% | 48.3% | 523,796 |
| Seven-day seasonal naive | 588.69 | 12.0% | 15.4% | 49.8% | 523,796 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 541.48 | 10.7% | 13.3% | 47.1% | 194,179 |
| Five-report moving average | 543.32 | 10.7% | 13.4% | 52.5% | 194,179 |
| Last observation | 569.06 | 11.2% | 13.6% | 23.5% | 194,179 |
| Global histogram gradient boosting | 577.56 | 11.4% | 13.9% | 46.9% | 194,179 |
| Seven-day seasonal naive | 656.49 | 12.9% | 16.0% | 49.2% | 194,179 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹1.83/quintal** with a 95% interval from
**₹-1.27** to
**₹4.94**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **69.7%** of
**194,179** forecasts. Calibration backs off from market, lead, and volatility groups
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
