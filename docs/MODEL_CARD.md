# MandiLens model card

## Intended use

Seven-day decision-support price ranges for the selected Maharashtra market/commodity series.
The forecasts are not guaranteed prices, trading instructions, or financial advice.

## Selected production method

**Global histogram gradient boosting** (`hist_gradient_boosting`), model version
`6dacd16f8d20`. It was selected using chronological rolling-origin validation.
The machine-learning candidate was accepted only if it reduced MAE by at least 1% versus the
strongest simple baseline.

## Evaluation

| Method | MAE (₹/quintal) | WAPE | Samples |
|---|---:|---:|---:|
| Global histogram gradient boosting | 250.67 | 13.8% | 36,609 |
| Five-report moving average | 253.51 | 14.0% | 36,609 |
| Last observation | 253.52 | 14.0% | 36,609 |
| Seven-day seasonal naive | 348.46 | 19.2% | 36,609 |

The production method's directional accuracy was
50.2%. The displayed interval targets
80% empirical coverage. On later folds calibrated only from
earlier-fold errors, it covered 92.4% of
27,340 forecasts.

## Training data

- Rows: 183,396
- Dates: 2021-01-16 to 2026-07-20
- Horizon: 1 to 7 calendar days
- Geography: Maharashtra
- Commodities: onion, potato, tomato

## Limitations and ethics

- Missing reports are not zero prices and are not imputed as observed outcomes.
- Market-day targets aggregate varieties for stability and therefore do not quote a specific lot.
- Feature importance describes model behavior, not causal effects.
- Weather is omitted because no measured validation gain justified the extra dependency.
- Shocks, closures, revisions, and transport or commission costs can make realized proceeds differ.
