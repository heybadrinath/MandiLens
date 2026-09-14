# Data-quality report

Generated: 2026-09-14T09:18:42.707586+00:00

## Current refresh

This run processed **112,355** variety-level rows from
**168** state, commodity, and month responses. It accepted
**112,316** rows and excluded
**39** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,268** monthly responses,
**1,712,501** input rows, and **1,707,101** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,473,569** market-day
observations across **4,962** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-08-16 to 2026-09-14
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 188
- Distinct markets: 112
- Stale selected series: 4
- Long reporting gaps: 36
- Anomaly flags retained: 6,376

## Current-refresh exclusions

- `exact_duplicate`: 20
- `invalid_price_order`: 15
- `price_above_safety_ceiling`: 4

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
