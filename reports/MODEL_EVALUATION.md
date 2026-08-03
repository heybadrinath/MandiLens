# Model-evaluation report

Generated: 2026-08-03T06:56:11.112010+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**2.49%** and won **3 of
3** folds. Its blend uses **70%**
Five-report moving average, **30%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 470.98 | 9.7% | 12.6% | 48.6% | 529,370 |
| Five-report moving average | 482.99 | 10.0% | 12.9% | 53.0% | 529,370 |
| Last observation | 493.85 | 10.2% | 13.1% | 23.5% | 529,370 |
| Global histogram gradient boosting | 507.60 | 10.5% | 13.2% | 47.8% | 529,370 |
| Seven-day seasonal naive | 583.41 | 12.1% | 15.5% | 50.3% | 529,370 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 532.81 | 10.7% | 13.1% | 48.8% | 194,913 |
| Five-report moving average | 541.97 | 10.8% | 13.5% | 51.8% | 194,913 |
| Global histogram gradient boosting | 558.09 | 11.2% | 13.5% | 48.7% | 194,913 |
| Last observation | 566.17 | 11.3% | 13.6% | 22.3% | 194,913 |
| Seven-day seasonal naive | 657.11 | 13.1% | 16.1% | 48.4% | 194,913 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹9.16/quintal** with a 95% interval from
**₹6.78** to
**₹11.62**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **69.7%** of
**194,913** forecasts. Calibration backs off from market, lead, and volatility groups
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
