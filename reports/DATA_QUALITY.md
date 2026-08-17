# Data-quality report

Generated: 2026-08-17T04:18:47.412168+00:00

## Current refresh

This run processed **118,043** variety-level rows from
**168** state, commodity, and month responses. It accepted
**117,996** rows and excluded
**47** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,184** monthly responses,
**1,640,717** input rows, and **1,635,348** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,460,591** market-day
observations across **4,965** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-07-19 to 2026-08-17
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 187
- Distinct markets: 114
- Stale selected series: 6
- Long reporting gaps: 39
- Anomaly flags retained: 6,441

## Current-refresh exclusions

- `exact_duplicate`: 31
- `invalid_price_order`: 13
- `price_above_safety_ceiling`: 3

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
