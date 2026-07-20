# MandiLens dataset card

## Dataset

- **Name:** MandiLens Maharashtra market-day price snapshot
- **Provider:** Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare, Government of India
- **Source:** https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi
- **Retrieved:** 2026-07-20
- **License:** [Government Open Data License - India](https://www.data.gov.in/godl)
- **Date range:** 2021-01-01 to 2026-07-20
- **Published records:** 32,617

## Scope

- State: Maharashtra
- Commodities: Onion, Potato, Tomato
- Unit: Indian rupees per quintal; arrivals in metric tonnes
- Granularity: one market/commodity/day after variety aggregation

## Transformations

- Validated positive ordered min, modal, and max prices
- Removed exact duplicates and retained exclusion reasons
- Aggregated varieties to market-day using arrival-weighted modal price when available
- Selected active series using weekly reporting coverage
- Flagged robust price anomalies without deleting them

## Known limitations

- Reporting is irregular and does not establish that no trade occurred on missing days
- Market-day values aggregate varieties and grades for a stable comparison unit
- Arrival quantities are source-reported and may be revised

## Attribution

Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare, Government of India, 2026, AGMARKNET market price and arrival reports, Open Government
Data Platform India / AGMARKNET 2.0, retrieved 2026-07-20,
https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi. Published under Government Open Data License - India:
https://www.data.gov.in/godl.

The provider does not endorse MandiLens. Source data is supplied without warranty. MandiLens
normalizes, validates, aggregates, filters, and flags records as described above.
