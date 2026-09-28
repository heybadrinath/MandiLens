# MandiLens model card

## Intended use

Short-range decision-support price intervals for eligible market and crop series. Forecasts are
not guaranteed prices, market quotes, trading instructions, or financial advice.

## Selected production method

**Validated recent-level + lead-aware blend** (`recent_level_tree_blend`), version
`ce51a25751f1`. Selection used chronological expanding-window folds. The final
time holdout is reported separately and is not an input to the automated selector.

The best lead-aware candidate ships only when it improves pooled selection MAE by at least
1.0% and wins the configured share of folds. The selected blend
uses 75% Five-report moving average and
25% global tree output, plus a 7.5% damped
recent-level adjustment per lead day. The parameters are selected on chronological selection folds
before holdout metrics are computed in each training run. After iterative model development, the
holdout is descriptive confirmation rather than a permanently untouched benchmark.

## Locked holdout

| Method | MAE (₹/quintal) | WAPE | Samples |
|---|---:|---:|---:|
| Five-report moving average | 489.75 | 9.6% | 198,396 |
| Validated recent-level + lead-aware blend | 492.82 | 9.6% | 198,396 |
| Last observation | 522.80 | 10.2% | 198,396 |
| Global histogram gradient boosting | 554.40 | 10.8% | 198,396 |
| Seven-day seasonal naive | 601.44 | 11.8% | 198,396 |

The paired target-date bootstrap estimated a Validated recent-level + lead-aware blend MAE reduction of
₹-3.07/quintal with a 95% interval of
₹-5.78 to
₹-0.42. This is a stability diagnostic, not proof of
future improvement.

## Prediction intervals

Intervals are asymmetric signed-residual quantiles. Calibration uses market, model lead, and
recent-volatility context when enough prior errors exist, then backs off to state/crop, crop,
lead, or global groups. Locked-holdout coverage is reported by state, crop, lead, and market.

## Training data

- Rows: 1,966,170
- Dates: 2024-09-08 to 2026-09-28
- User-visible target offsets: 1 to 7 days from one
  common comparison date
- Maximum model lead: 28 days from each market's latest report

## Explanation boundary

Permutation importance is measured on the locked holdout using a tree trained only before that
period. It is a diagnostic of model behavior, not causal evidence or an independently actionable
recommendation.

## Limitations

- Missing reports remain unknown and are not imputed as observed prices.
- Market-day targets aggregate varieties and grades for a stable comparison unit.
- Shocks, closures, revisions, lot quality, and unentered costs can change realized proceeds.
- A common target date improves comparison fairness but older market origins require longer model
  leads and are clearly marked as less fresh.
