# Model-evaluation report

Generated: 2026-07-20T05:22:06.262447+00:00

## Selection

**Production method:** Global histogram gradient boosting

**Selection rule:** choose the lowest rolling-origin MAE, but require the machine-learning model
to improve on the strongest simple baseline by at least 1% before accepting the added complexity.

## Rolling-origin results

| Method | MAE (₹/quintal) | WAPE | sMAPE | Directional accuracy | Samples |
|---|---:|---:|---:|---:|---:|
| Global histogram gradient boosting | 250.67 | 13.8% | 13.1% | 50.2% | 36,609 |
| Five-report moving average | 253.51 | 14.0% | 13.3% | 51.9% | 36,609 |
| Last observation | 253.52 | 14.0% | 13.3% | 23.5% | 36,609 |
| Seven-day seasonal naive | 348.46 | 19.2% | 17.7% | 48.6% | 36,609 |

## Uncertainty

The displayed interval targets **80%** coverage. On folds that
could be calibrated exclusively with earlier-fold residuals, empirical coverage was
**92.4%** across **27,340** forecasts.

## Validation design

- Chronological rolling-origin folds only; no random split.
- Lag and rolling features use information available on or before each forecast origin.
- Tests score only dates with an observed source report; missing reports are not treated as zero.
- Market, commodity, date, freshness, momentum, spread, and reporting-frequency features are
  predictive context, not evidence of causation.

## Limitations

Evaluation represents the selected Maharashtra market series and the source's irregular
reporting process. Error rates can change during supply shocks, market closures, or data-entry
revisions. The interval is empirical and may be wider or narrower than future uncertainty.
