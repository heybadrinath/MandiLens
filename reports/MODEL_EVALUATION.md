# Model-evaluation report

Generated: 2026-08-10T05:17:11.094657+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**1.95%** and won **3 of
3** folds. Its blend uses **75%**
Five-report moving average, **25%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 470.15 | 9.5% | 12.4% | 47.9% | 521,663 |
| Five-report moving average | 479.49 | 9.7% | 12.7% | 52.9% | 521,663 |
| Last observation | 491.33 | 10.0% | 12.8% | 24.2% | 521,663 |
| Global histogram gradient boosting | 509.65 | 10.3% | 13.1% | 47.3% | 521,663 |
| Seven-day seasonal naive | 580.57 | 11.8% | 15.3% | 50.0% | 521,663 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 523.54 | 10.4% | 12.8% | 47.5% | 194,355 |
| Five-report moving average | 530.26 | 10.5% | 13.1% | 52.4% | 194,355 |
| Last observation | 553.51 | 11.0% | 13.2% | 24.0% | 194,355 |
| Global histogram gradient boosting | 554.63 | 11.0% | 13.4% | 47.4% | 194,355 |
| Seven-day seasonal naive | 643.63 | 12.7% | 15.6% | 49.1% | 194,355 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹6.72/quintal** with a 95% interval from
**₹4.45** to
**₹8.85**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **70.5%** of
**194,355** forecasts. Calibration backs off from market, lead, and volatility groups
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
