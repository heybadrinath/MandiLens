# Data-quality report

Generated: 2026-08-24T04:29:44.334230+00:00

## Current refresh

This run processed **136,610** variety-level rows from
**168** state, commodity, and month responses. It accepted
**136,554** rows and excluded
**56** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,184** monthly responses,
**1,659,284** input rows, and **1,653,906** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,464,130** market-day
observations across **4,961** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-07-26 to 2026-08-24
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 187
- Distinct markets: 114
- Stale selected series: 3
- Long reporting gaps: 37
- Anomaly flags retained: 6,444

## Current-refresh exclusions

- `exact_duplicate`: 33
- `invalid_price_order`: 19
- `price_above_safety_ceiling`: 4

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
