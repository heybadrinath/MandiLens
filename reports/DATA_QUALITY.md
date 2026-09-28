# Data-quality report

Generated: 2026-09-28T10:13:40.530315+00:00

## Current refresh

This run processed **149,184** variety-level rows from
**168** state, commodity, and month responses. It accepted
**149,105** rows and excluded
**79** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,268** monthly responses,
**1,749,330** input rows, and **1,743,890** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,481,324** market-day
observations across **4,967** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-08-30 to 2026-09-28
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 193
- Distinct markets: 121
- Stale selected series: 5
- Long reporting gaps: 34
- Anomaly flags retained: 6,402

## Current-refresh exclusions

- `exact_duplicate`: 27
- `invalid_price_order`: 47
- `price_above_safety_ceiling`: 5

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
