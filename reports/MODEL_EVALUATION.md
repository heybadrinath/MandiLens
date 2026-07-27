# Model-evaluation report

Generated: 2026-07-27T07:01:23.251907+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**2.59%** and won **3 of
3** folds. Its blend uses **70%**
Five-report moving average, **30%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 473.55 | 9.7% | 12.6% | 48.2% | 524,969 |
| Five-report moving average | 486.14 | 10.0% | 12.9% | 52.7% | 524,969 |
| Last observation | 496.01 | 10.2% | 13.1% | 24.0% | 524,969 |
| Global histogram gradient boosting | 511.96 | 10.5% | 13.1% | 47.4% | 524,969 |
| Seven-day seasonal naive | 589.87 | 12.1% | 15.6% | 50.0% | 524,969 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 522.02 | 10.5% | 12.9% | 48.7% | 195,335 |
| Five-report moving average | 530.91 | 10.7% | 13.3% | 51.9% | 195,335 |
| Global histogram gradient boosting | 548.68 | 11.0% | 13.2% | 49.0% | 195,335 |
| Last observation | 555.80 | 11.2% | 13.4% | 22.6% | 195,335 |
| Seven-day seasonal naive | 642.49 | 12.9% | 15.8% | 48.4% | 195,335 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹8.89/quintal** with a 95% interval from
**₹6.15** to
**₹11.62**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **70.5%** of
**195,335** forecasts. Calibration backs off from market, lead, and volatility groups
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
