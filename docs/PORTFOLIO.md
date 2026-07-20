# Portfolio-ready project explanation

## 1. Problem

Government mandi reports expose observations but do not directly combine current comparison,
reporting quality, historical context, forecast uncertainty, and user-specific selling costs. A
higher displayed price can still produce a lower expected return after costs.

## 2. Users

Farmers, Farmer Producer Organizations, agricultural traders, market analysts, agritech product
teams, and public-market researchers who need a transparent comparison rather than a black-box
recommendation.

## 3. Data

183,174 official AGMARKNET 2.0 variety-level reports for Maharashtra onion, potato, and tomato from
January 2021 through 20 July 2026. The Government of India catalogue and Government Open Data
Licence – India are linked and attributed.

## 4. Data-quality challenges

Irregular reporting, duplicate rows, inconsistent market display capitalization, multiple varieties
per market-day, extreme values, gaps, unequal series coverage, and the risk of interpreting missing
reports as zero. The pipeline accepted 183,148 rows, excluded 25 exact duplicates and one extreme
row with reasons, resolved all selected market references, and retained 2,578 robust anomaly flags.

## 5. Solution

A public responsive application for current min/modal/max comparison, historical and seasonal
analysis, anomaly and gap context, seven-day forecast ranges, user-controlled quantity and cost
assumptions, point/low/high estimated net realization, ranked markets, and downloadable CSV results.

## 6. Architecture

A Python batch pipeline produces versioned Parquet, model, report, and static JSON artifacts. A
Next.js App Router frontend is statically deployed to Vercel. GitHub Actions validates and refreshes
the snapshot weekly. There is no always-on model API, database, authentication system, or paid
service.

## 7. Modeling approach

Leakage-safe global grouped features include as-of price lags, rolling means/median/deviation,
momentum, spread, arrivals, reporting frequency, freshness, calendar context, market, district,
commodity, horizon, and coverage tier. A portable scikit-learn histogram gradient-boosting
regressor uses absolute-error loss.

## 8. Baselines

Last observation, five-report moving average, and seven-day seasonal naive are evaluated on exactly
the same future targets as the tree model.

## 9. Validation

Four expanding rolling-origin evaluations score 36,609 one-to-seven-day future observations. No
random split is used. The tree must lower pooled MAE by at least 1% versus the strongest baseline.
Intervals use prior-fold absolute-error quantiles, and performance is segmented by horizon,
commodity, market, and coverage.

## 10. Results

The tree reached ₹250.67 MAE and 13.79% WAPE, versus ₹253.51 MAE for the strongest baseline and
₹348.46 for seasonal naive. That is a narrow 1.12% improvement over the strongest baseline and a
28.06% improvement over seasonal naive. The 80% interval target achieved 92.44% later-fold
empirical coverage on 27,340 forecasts. Tomato remained the hardest segment at 19.60% WAPE.

## 11. Deployment

Static Next.js deployment on Vercel Hobby plus standard GitHub Actions public-repository runners.
The ongoing service cost is ₹0, no payment method or expiring credit is used, and there is no
backend cold start.

## 12. Limitations

The published 21 series favor regular reporters and do not represent every mandi. Market-day values
aggregate varieties. The ranking excludes costs the user does not enter and uses no inferred route
distance. Forecasts and historical coverage do not guarantee future results.

## 13. Next steps

Validate market coordinates and transport contracts before adding distance; add variety and grade
filters only where coverage supports them; measure new weather, arrivals-revision, or holiday
features out of time; and add accounts or alerts only after a user need justifies persistence.

## Short portfolio description

MandiLens is a deployed Maharashtra mandi-intelligence platform built from official AGMARKNET data.
It combines a restartable Polars/Parquet pipeline, explicit data-quality reporting, chronological
baseline-versus-tree evaluation, empirical seven-day price intervals, and an accessible Next.js
decision interface that ranks selected markets using costs supplied by the user. The system is
batch-first, statically hosted, automatically refreshed, and costs ₹0 to operate.

## Resume-ready description

Designed and deployed a batch-first agricultural data product using official Indian mandi reports,
with reproducible validation, grouped time-series features, rolling-origin model selection,
uncertainty calibration, responsive analytics, and automated free-tier deployment.

## Verified resume bullet

- Built and deployed an agricultural market-intelligence platform that validated 183,174 official
  mandi observations and published 32,617 Maharashtra market-day records; produced seven-day
  empirical price intervals and user-cost market rankings, with a chronologically validated tree
  model reducing MAE 1.12% versus the strongest baseline and 28.06% versus seasonal naive across
  36,609 future forecasts.

## Honest alternative bullet focused on engineering

- Engineered a restartable Polars/Parquet pipeline and responsive Next.js decision product for 21
  Maharashtra commodity-market series, adding explicit rejection tracking, anomaly/freshness
  analytics, tested net-realization ranking, weekly CI refreshes, and ₹0 static deployment.
