# Model-evaluation report

Generated: 2026-08-24T04:34:36.213069+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**2.03%** and won **3 of
3** folds. Its blend uses **70%**
Five-report moving average, **30%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 477.68 | 9.8% | 12.6% | 48.7% | 532,904 |
| Five-report moving average | 487.57 | 10.0% | 12.9% | 52.5% | 532,904 |
| Last observation | 500.48 | 10.2% | 13.0% | 23.2% | 532,904 |
| Global histogram gradient boosting | 504.34 | 10.3% | 13.1% | 48.1% | 532,904 |
| Seven-day seasonal naive | 589.93 | 12.1% | 15.5% | 49.6% | 532,904 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 537.33 | 10.4% | 13.1% | 46.7% | 194,960 |
| Five-report moving average | 542.52 | 10.5% | 13.3% | 52.5% | 194,960 |
| Global histogram gradient boosting | 569.38 | 11.1% | 13.8% | 46.5% | 194,960 |
| Last observation | 569.87 | 11.1% | 13.5% | 23.6% | 194,960 |
| Seven-day seasonal naive | 658.23 | 12.8% | 15.8% | 49.1% | 194,960 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹5.19/quintal** with a 95% interval from
**₹2.42** to
**₹8.20**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **71.4%** of
**194,960** forecasts. Calibration backs off from market, lead, and volatility groups
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
