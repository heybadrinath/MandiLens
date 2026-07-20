# Data-quality report

Generated: 2026-07-20T05:16:42.675593+00:00

## Plain-language result

The pipeline read **183,174** variety-level observations and
accepted **183,148** after explicit validation.
It excluded **26** records rather than silently fixing
questionable prices. The published application contains **32,617**
market-day observations across **21** selected market/commodity
series.

It normalized **442** market display names for whitespace
and capitalization. These corrections did not overwrite source prices.

## Coverage

- Date range: 2021-01-01 to 2026-07-20
- Commodities: Onion, Potato, Tomato
- State: Maharashtra
- Selected markets: 14
- Stale selected series: 0
- Long reporting gaps: 0
- Anomaly flags: 2,578

## Exclusions

- `exact_duplicate`: 25
- `price_above_safety_ceiling`: 1

## Interpretation

Reporting coverage measures whether a market reported in a week, not whether it traded every
day. A missing report is not treated as a zero price. Anomaly flags identify unusual values for
review; they do not prove that a source observation is wrong. Market names are normalized for
display, and unresolved official market references remain visible as a quality limitation.
