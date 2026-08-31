# Model-evaluation report

Generated: 2026-08-31T10:13:43.376636+00:00

## Production selection

**Production method:** Validated recent-level + lead-aware blend

The best lead-aware candidate must improve pooled selection-fold MAE by at least
**1.0%** and win at least
**67%** of usable folds. The selected candidate,
**Validated recent-level + lead-aware blend**, improved MAE by
**1.91%** and won **3 of
3** folds. Its blend uses **70%**
Five-report moving average, **30%** lead-aware tree output, and a
**7.5%** damped level-gap adjustment per lead day. The automated
parameter search and production selector use only the chronological selection folds; holdout
metrics are computed separately after each training run fixes those parameters.

## Model-selection folds

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Validated recent-level + lead-aware blend | 483.45 | 9.9% | 12.8% | 48.7% | 530,768 |
| Five-report moving average | 492.84 | 10.1% | 13.2% | 52.7% | 530,768 |
| Last observation | 506.52 | 10.4% | 13.3% | 23.6% | 530,768 |
| Global histogram gradient boosting | 517.13 | 10.6% | 13.2% | 48.5% | 530,768 |
| Seven-day seasonal naive | 593.24 | 12.2% | 15.7% | 49.9% | 530,768 |

## Locked final holdout

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Five-report moving average | 531.33 | 10.3% | 12.9% | 52.2% | 197,151 |
| Validated recent-level + lead-aware blend | 531.58 | 10.4% | 12.8% | 46.9% | 197,151 |
| Last observation | 561.38 | 10.9% | 13.2% | 23.1% | 197,151 |
| Global histogram gradient boosting | 581.97 | 11.3% | 13.7% | 46.2% | 197,151 |
| Seven-day seasonal naive | 648.82 | 12.6% | 15.5% | 49.0% | 197,151 |

The paired target-date bootstrap estimates a Validated recent-level + lead-aware blend MAE reduction of
**₹-0.25/quintal** with a 95% interval from
**₹-3.48** to
**₹2.96**. This measures stability; it does not prove
future superiority.

## Prediction intervals

The asymmetric interval targets **80%** coverage. On the locked
holdout, it covered **71.1%** of
**197,151** forecasts. Calibration backs off from market, lead, and volatility groups
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
