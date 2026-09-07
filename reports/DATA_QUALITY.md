# Data-quality report

Generated: 2026-09-07T08:40:52.932960+00:00

## Current refresh

This run processed **95,180** variety-level rows from
**168** state, commodity, and month responses. It accepted
**95,152** rows and excluded
**28** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,268** monthly responses,
**1,695,326** input rows, and **1,689,937** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,470,478** market-day
observations across **4,966** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-08-09 to 2026-09-07
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 186
- Distinct markets: 109
- Stale selected series: 3
- Long reporting gaps: 34
- Anomaly flags retained: 6,441

## Current-refresh exclusions

- `exact_duplicate`: 14
- `invalid_price_order`: 11
- `price_above_safety_ceiling`: 3

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
