# Model-evaluation report

Generated: 2026-07-20T13:48:20.310877+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**2.95%** and won **3 of
3** folds. Its blend uses **65%**
Five-report moving average, **35%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated parameter search and production
selector use only the chronological selection folds; holdout metrics are computed separately after
each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 481.84 | 9.9% | 12.8% | 48.9% | 536,508 |
| Five-report moving average | 496.49 | 10.2% | 13.1% | 52.3% | 536,508 |
| Last observation | 506.30 | 10.4% | 13.3% | 22.9% | 536,508 |
| Global histogram gradient boosting | 516.07 | 10.6% | 13.3% | 48.2% | 536,508 |
| Seven-day seasonal naive | 599.93 | 12.3% | 15.8% | 49.5% | 536,508 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 521.20 | 10.5% | 12.8% | 49.1% | 195,253 |
| Five-report moving average | 529.19 | 10.7% | 13.2% | 51.8% | 195,253 |
| Global histogram gradient boosting | 544.33 | 11.0% | 13.1% | 48.9% | 195,253 |
| Last observation | 552.17 | 11.2% | 13.3% | 22.1% | 195,253 |
| Seven-day seasonal naive | 639.12 | 12.9% | 15.8% | 48.5% | 195,253 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹7.99/quintal** with a 95% interval from
**₹5.77** to
**₹10.12**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **71.6%** of
**195,253** forecasts. Calibration backs off from market, lead, and volatility groups
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
