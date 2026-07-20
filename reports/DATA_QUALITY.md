# Data-quality report

Generated: 2026-07-20T09:31:48.894789+00:00

## Current refresh

This run processed **1,569,829** variety-level rows from
**2,100** state, commodity, and month responses. It accepted
**1,564,481** rows and excluded
**5,348** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,100** monthly responses,
**1,569,829** input rows, and **1,564,481** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,421,838** market-day
observations across **5,360** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-07-01 to 2026-07-20
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 189
- Distinct markets: 120
- Stale selected series: 11
- Long reporting gaps: 44
- Anomaly flags retained: 6,607

## Current-refresh exclusions

- `exact_duplicate`: 1,545
- `invalid_price_order`: 78
- `non_positive_price`: 3,705
- `price_above_safety_ceiling`: 20

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
