# Model-evaluation report

Generated: 2026-09-07T08:45:48.560426+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**2.16%** and won **3 of
3** folds. Its blend uses **70%**
Five-report moving average, **30%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 483.54 | 10.0% | 12.8% | 49.1% | 539,597 |
| Five-report moving average | 494.21 | 10.2% | 13.2% | 52.3% | 539,597 |
| Last observation | 508.84 | 10.5% | 13.3% | 22.8% | 539,597 |
| Global histogram gradient boosting | 510.89 | 10.5% | 13.2% | 49.2% | 539,597 |
| Seven-day seasonal naive | 596.13 | 12.3% | 15.8% | 49.4% | 539,597 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 524.92 | 10.2% | 12.5% | 47.6% | 198,341 |
| Five-report moving average | 525.90 | 10.2% | 12.6% | 52.5% | 198,341 |
| Last observation | 556.04 | 10.8% | 12.9% | 22.9% | 198,341 |
| Global histogram gradient boosting | 565.10 | 10.9% | 13.3% | 46.5% | 198,341 |
| Seven-day seasonal naive | 642.50 | 12.4% | 15.2% | 49.2% | 198,341 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹0.98/quintal** with a 95% interval from
**₹-1.43** to
**₹3.40**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **71.7%** of
**198,341** forecasts. Calibration backs off from market, lead, and volatility groups
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
