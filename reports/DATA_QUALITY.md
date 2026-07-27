# Data-quality report

Generated: 2026-07-27T06:57:01.810314+00:00

## Current refresh

This run processed **138,344** variety-level rows from
**168** state, commodity, and month responses. It accepted
**138,273** rows and excluded
**71** rows with recorded reasons.

## Cumulative retained source window

The committed quality ledger covers **2,100** monthly responses,
**1,587,475** input rows, and **1,582,120** accepted
rows. These cumulative totals are separate from the rows downloaded in the current refresh.

The rolling all-market layer retains **1,438,471** market-day
observations across **5,542** series so previously unselected
markets can qualify during a later refresh.

## Published product coverage

- Date range: 2024-07-01 to 2026-07-27
- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Commodities with eligible series: Arecanut, Banana, Brinjal, Coconut, Cotton, Green Chilli, Groundnut, Maize, Onion, Paddy (Common), Potato, Ragi, Tomato, Turmeric
- Selected market/commodity series: 185
- Distinct markets: 115
- Stale selected series: 6
- Long reporting gaps: 40
- Anomaly flags retained: 6,695

## Current-refresh exclusions

- `exact_duplicate`: 53
- `invalid_price_order`: 14
- `price_above_safety_ceiling`: 4

## Interpretation

Weekly coverage means at least one report appeared in a week; it does not imply daily trading.
Missing reports stay unknown. Anomaly flags indicate unusual observations for review, not proven
source errors. A market-day representative price is an arrival-weighted mean only when every
variety row reports arrivals; otherwise it is the median of the reported variety modal prices.
