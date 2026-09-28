# MandiLens dataset card

## Dataset

- **Name:** MandiLens multi-state market-day price snapshot
- **Provider:** Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare, Government of India
- **Source:** https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi
- **Retrieved:** 2026-09-28
- **License:** [Government Open Data License - India](https://www.data.gov.in/godl)
- **Date range:** 2024-08-30 to 2026-09-28
- **Published selected-market records:** 88,852
- **Retained all-market records:** 1,481,324

## Configured coverage

- States: Andhra Pradesh, Karnataka, Kerala, Maharashtra, Tamil Nadu, Telangana
- Crops: Onion, Potato, Tomato, Paddy (Common), Maize, Groundnut, Banana, Coconut, Green Chilli, Turmeric, Brinjal, Ragi, Cotton, Arecanut
- Unit: Indian rupees per quintal; arrivals in metric tonnes
- Granularity: one market, crop, and day after variety-level aggregation
- Publication rule: only series meeting the documented coverage and freshness thresholds

## Transformations

- Validated positive ordered minimum, modal, and maximum source prices
- Removed exact duplicates and retained exclusion reasons by source month
- Used arrival-weighted variety modal prices only when arrival reporting was complete
- Used a median variety modal price when arrival reporting was partial or missing
- Selected active series from a committed rolling all-market coverage window
- Flagged robust price anomalies without deleting them

## Known limitations

- Reporting is irregular and does not establish that no trade occurred on missing days
- Representative market-day prices aggregate varieties and grades
- Arrival quantities are source-reported and can be partial or revised
- Only state and crop groups with eligible recent reporting are published

## Attribution

Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare, Government of India, AGMARKNET market price and arrival reports, Open Government Data
Platform India / AGMARKNET 2.0, retrieved 2026-09-28,
https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi. Source data is published under Government Open Data License - India:
https://www.data.gov.in/godl.

The provider does not endorse MandiLens. Source data is supplied without warranty. MandiLens
validates, aggregates, filters, and flags the derived records as described above.
