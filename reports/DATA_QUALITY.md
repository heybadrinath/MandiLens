# Data-quality report

Generated: 2026-09-21T09:21:12.006805+00:00

## Current refresh

This run processed **130,240** variety-level rows from
**168** state, commodity, and month responses. It accepted
**130,185** rows and excluded
**55** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,268** monthly responses,
**1,730,386** input rows, and **1,724,970** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,477,116** market-day
observations across **4,966** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-08-23 to 2026-09-21
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 192
- Distinct markets: 116
- Stale selected series: 2
- Long reporting gaps: 35
- Anomaly flags retained: 6,497

## Current-refresh exclusions

- `exact_duplicate`: 22
- `invalid_price_order`: 28
- `price_above_safety_ceiling`: 5

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
