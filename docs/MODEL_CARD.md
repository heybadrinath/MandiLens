# MandiLens model card

## Intended use

Short-range decision-support price intervals for eligible market and crop series. Forecasts are
not guaranteed prices, market quotes, trading instructions, or financial advice.

## Selected production method

**Validated recent-level + lead-aware blend** (`recent_level_tree_blend`), version
`2eb0a60ad9b1`. Selection used chronological expanding-window folds. The final
time holdout is reported separately and is not an input to the automated selector.

The best lead-aware candidate ships only when it improves pooled selection MAE by at least
1.0% and wins the configured share of folds. The selected blend
uses 70% Five-report moving average and
30% global tree output, plus a 7.5% damped
recent-level adjustment per lead day. The parameters are selected on chronological selection folds
before holdout metrics are computed in each training run. After iterative model development, the
holdout is descriptive confirmation rather than a permanently untouched benchmark.

## Locked holdout

| Method | MAE (₹/quintal) | WAPE | Samples |
|---|---:|---:|---:|
| Validated recent-level + lead-aware blend | 541.48 | 10.7% | 194,179 |
| Five-report moving average | 543.32 | 10.7% | 194,179 |
| Last observation | 569.06 | 11.2% | 194,179 |
| Global histogram gradient boosting | 577.56 | 11.4% | 194,179 |
| Seven-day seasonal naive | 656.49 | 12.9% | 194,179 |

The paired target-date bootstrap estimated a Validated recent-level + lead-aware blend MAE reduction of
₹1.83/quintal with a 95% interval of
₹-1.27 to
₹4.94. This is a stability diagnostic, not proof of
future improvement.

## Prediction intervals

Intervals are asymmetric signed-residual quantiles. Calibration uses market, model lead, and
recent-volatility context when enough prior errors exist, then backs off to state/crop, crop,
lead, or global groups. Locked-holdout coverage is reported by state, crop, lead, and market.

## Training data

- Rows: 1,965,033
- Dates: 2024-07-28 to 2026-08-17
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
