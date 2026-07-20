"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Info,
  MapPin,
  RefreshCw,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PriceForecastChart, SeasonalChart } from "@/components/charts";
import { RangeLens } from "@/components/range-lens";
import {
  buildPriceChartPoints,
  missingCalendarDays,
  selectHistory,
  type HistoryRange,
} from "@/lib/analytics";
import {
  quantityToQuintals,
  rankMarkets,
  rankingsToCsv,
  type QuantityUnit,
  type TransportMethod,
} from "@/lib/calculations";
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  freshnessLabel,
} from "@/lib/format";
import type { Commodity, MandiData } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ALL_DISTRICTS = "All districts";

function DataLoading() {
  return (
    <section className="dashboard-loading" aria-live="polite" aria-busy="true">
      <div className="loading-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <p className="eyebrow">Opening the market ledger</p>
        <h2>Loading verified observations and forecasts…</h2>
        <p>The static dataset is about 390 KB over the network and contains no credentials.</p>
      </div>
    </section>
  );
}

function DataError({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="dashboard-error" role="alert">
      <TriangleAlert aria-hidden="true" />
      <div>
        <p className="eyebrow">Data unavailable</p>
        <h2>The prepared market snapshot could not be loaded.</h2>
        <p>Your inputs were not sent anywhere. Check your connection and retry the static file.</p>
        <button className="button button--primary" type="button" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>
      </div>
    </section>
  );
}

export function MarketDashboard() {
  const [data, setData] = useState<MandiData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/mandilens.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Data request failed with ${response.status}`);
        return response.json() as Promise<MandiData>;
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, [attempt]);

  if (error)
    return (
      <DataError
        onRetry={() => {
          setError(false);
          setAttempt((value) => value + 1);
        }}
      />
    );
  if (!data) return <DataLoading />;
  return <DashboardReady data={data} />;
}

function DashboardReady({ data }: { data: MandiData }) {
  const [commodity, setCommodity] = useState<Commodity>("Onion");
  const [district, setDistrict] = useState(ALL_DISTRICTS);
  const [referenceMarketId, setReferenceMarketId] = useState("");
  const [selectedMarketIds, setSelectedMarketIds] = useState<string[] | null>(null);
  const [horizon, setHorizon] = useState(3);
  const [historyRange, setHistoryRange] = useState<HistoryRange>(365);
  const [quantity, setQuantity] = useState(1);
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>("tonne");
  const [transportMethod, setTransportMethod] = useState<TransportMethod>("total");
  const [costsByMarket, setCostsByMarket] = useState<Record<string, number>>({});

  const commodityMarkets = useMemo(
    () =>
      data.markets
        .filter((item) => item.commodity === commodity)
        .sort((left, right) => left.market.localeCompare(right.market)),
    [commodity, data.markets],
  );
  const districts = useMemo(
    () => [...new Set(commodityMarkets.map((item) => item.district))].sort(),
    [commodityMarkets],
  );
  const availableMarkets = useMemo(
    () =>
      district === ALL_DISTRICTS
        ? commodityMarkets
        : commodityMarkets.filter((item) => item.district === district),
    [commodityMarkets, district],
  );
  const effectiveSelectedIds = useMemo(
    () => selectedMarketIds ?? availableMarkets.map((item) => item.market_id),
    [availableMarkets, selectedMarketIds],
  );

  const effectiveReferenceMarketId = availableMarkets.some(
    (item) => item.market_id === referenceMarketId,
  )
    ? referenceMarketId
    : (availableMarkets[0]?.market_id ?? "");
  const referenceMarket = availableMarkets.find(
    (item) => item.market_id === effectiveReferenceMarketId,
  );
  const referenceForecasts = useMemo(
    () =>
      data.forecasts
        .filter(
          (item) => item.commodity === commodity && item.market_id === effectiveReferenceMarketId,
        )
        .sort((left, right) => left.horizon - right.horizon),
    [commodity, data.forecasts, effectiveReferenceMarketId],
  );
  const referenceForecast = referenceForecasts.find((item) => item.horizon === horizon);
  const history = useMemo(
    () => selectHistory(data.observations, commodity, effectiveReferenceMarketId, historyRange),
    [commodity, data.observations, effectiveReferenceMarketId, historyRange],
  );
  const latestObservation = useMemo(
    () =>
      data.observations
        .filter(
          (item) => item.commodity === commodity && item.market_id === effectiveReferenceMarketId,
        )
        .at(-1),
    [commodity, data.observations, effectiveReferenceMarketId],
  );
  const chartPoints = useMemo(
    () => buildPriceChartPoints(history, referenceForecasts),
    [history, referenceForecasts],
  );
  const seasonalPoints = useMemo(
    () =>
      data.seasonal
        .filter(
          (item) => item.commodity === commodity && item.market_id === effectiveReferenceMarketId,
        )
        .map((item) => ({
          month: MONTHS[item.month - 1],
          price: item.median_price,
          observations: item.observations,
        })),
    [commodity, data.seasonal, effectiveReferenceMarketId],
  );
  const comparisonForecasts = useMemo(
    () =>
      data.forecasts.filter(
        (item) =>
          item.commodity === commodity &&
          item.horizon === horizon &&
          effectiveSelectedIds.includes(item.market_id) &&
          availableMarkets.some((market) => market.market_id === item.market_id),
      ),
    [availableMarkets, commodity, data.forecasts, effectiveSelectedIds, horizon],
  );

  const quantityError =
    !Number.isFinite(quantity) || quantity <= 0
      ? "Enter a quantity greater than zero."
      : quantityToQuintals(quantity, quantityUnit) > 1_000_000
        ? "Quantity is above 1,000,000 quintals. Check the unit or enter a smaller value."
        : null;
  const hasInvalidCost = effectiveSelectedIds.some((id) => {
    const value = costsByMarket[id] ?? 0;
    return !Number.isFinite(value) || value < 0;
  });
  const ranking = useMemo(() => {
    if (quantityError || hasInvalidCost) return [];
    return rankMarkets(comparisonForecasts, quantity, quantityUnit, transportMethod, costsByMarket);
  }, [
    comparisonForecasts,
    costsByMarket,
    hasInvalidCost,
    quantity,
    quantityError,
    quantityUnit,
    transportMethod,
  ]);

  const missingReports = missingCalendarDays(history);
  const anomalyCount = history.filter((item) => item.is_anomaly).length;
  const allCostsZero = effectiveSelectedIds.every((id) => (costsByMarket[id] ?? 0) === 0);
  const spread =
    ranking.length > 1
      ? Math.max(...ranking.map((item) => item.forecast.forecast_price)) -
        Math.min(...ranking.map((item) => item.forecast.forecast_price))
      : 0;
  const forecastStart = referenceForecasts[0]?.forecast_date;

  function switchCommodity(nextCommodity: Commodity) {
    setCommodity(nextCommodity);
    setDistrict(ALL_DISTRICTS);
    setReferenceMarketId("");
    setSelectedMarketIds(null);
  }

  function switchDistrict(nextDistrict: string) {
    setDistrict(nextDistrict);
    setReferenceMarketId("");
    setSelectedMarketIds(null);
  }

  function toggleMarket(marketId: string, checked: boolean) {
    const next = new Set(effectiveSelectedIds);
    if (checked) next.add(marketId);
    else next.delete(marketId);
    setSelectedMarketIds([...next]);
  }

  function downloadComparison() {
    const blob = new Blob([rankingsToCsv(ranking)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mandilens-${commodity.toLowerCase()}-${horizon}d-comparison.csv`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="market-dashboard" id="market-lens" aria-labelledby="market-lens-title">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Live prepared snapshot</p>
          <h2 id="market-lens-title">Open the market lens</h2>
          <p>Compare evidence first, then add your own selling-cost assumptions.</p>
        </div>
        <div className="data-stamp">
          <span className="live-dot" aria-hidden="true" />
          Source through {formatDate(data.meta.dateRange[1])}
        </div>
      </div>

      <div className="control-deck" aria-label="Market filters">
        <fieldset className="commodity-switch">
          <legend>Commodity</legend>
          <div>
            {data.meta.commodities.map((item) => (
              <button
                key={item}
                type="button"
                className={item === commodity ? "is-active" : ""}
                aria-pressed={item === commodity}
                onClick={() => switchCommodity(item)}
              >
                <span aria-hidden="true">{item.slice(0, 1)}</span>
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="control-grid">
          <label>
            <span>State</span>
            <select value={data.meta.state} disabled aria-describedby="state-help">
              <option>{data.meta.state}</option>
            </select>
            <small id="state-help">Focused scope</small>
          </label>
          <label>
            <span>District</span>
            <select value={district} onChange={(event) => switchDistrict(event.target.value)}>
              <option>{ALL_DISTRICTS}</option>
              {districts.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="control-grid__wide">
            <span>Reference market</span>
            <select
              value={effectiveReferenceMarketId}
              onChange={(event) => setReferenceMarketId(event.target.value)}
            >
              {availableMarkets.map((item) => (
                <option key={item.market_id} value={item.market_id}>
                  {item.market} · {item.district}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>History</span>
            <select
              value={String(historyRange)}
              onChange={(event) =>
                setHistoryRange(
                  event.target.value === "all"
                    ? "all"
                    : (Number(event.target.value) as HistoryRange),
                )
              }
            >
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="1095">3 years</option>
              <option value="all">All history</option>
            </select>
          </label>
        </div>

        <fieldset className="horizon-switch">
          <legend>Forecast horizon</legend>
          <div>
            {Array.from({ length: data.meta.forecastHorizonDays }, (_, index) => index + 1).map(
              (day) => (
                <button
                  key={day}
                  type="button"
                  className={day === horizon ? "is-active" : ""}
                  aria-pressed={day === horizon}
                  onClick={() => setHorizon(day)}
                >
                  {day}d
                </button>
              ),
            )}
          </div>
        </fieldset>
      </div>

      {!referenceMarket || !referenceForecast || !latestObservation ? (
        <div className="empty-state">
          <Info aria-hidden="true" />
          <h3>No sufficiently covered market matches these filters.</h3>
          <p>
            Choose all districts or another commodity. Missing reports are never filled as zero.
          </p>
        </div>
      ) : (
        <>
          <section className="market-pulse" aria-labelledby="pulse-title">
            <div className="market-pulse__lead">
              <div className="market-pulse__location">
                <MapPin size={16} aria-hidden="true" />
                {referenceMarket.district} · {referenceMarket.market}
              </div>
              <h3 id="pulse-title">{formatCurrency(referenceForecast.current_modal_price)}</h3>
              <p className="price-unit">Latest observed modal price · per quintal</p>
              <div className="market-pulse__badges">
                <span
                  className={
                    referenceForecast.freshness_days > data.meta.freshnessThresholdDays
                      ? "badge badge--warn"
                      : "badge badge--good"
                  }
                >
                  {freshnessLabel(referenceForecast.freshness_days)}
                </span>
                <span className="badge">
                  {formatPercent(referenceMarket.weekly_coverage)} weekly coverage
                </span>
              </div>
              <RangeLens
                low={referenceForecast.current_min_price}
                point={referenceForecast.current_modal_price}
                high={referenceForecast.current_max_price}
                label={`Observed min · modal · max on ${formatDate(referenceForecast.observed_date)}`}
              />
            </div>

            <div className="market-pulse__forecast">
              <div className="metric-kicker">
                <span>Prepared forecast</span>
                <span>{horizon}-day horizon</span>
              </div>
              <div className="forecast-number">
                {formatCurrency(referenceForecast.forecast_price)}
              </div>
              <RangeLens
                low={referenceForecast.forecast_low}
                point={referenceForecast.forecast_price}
                high={referenceForecast.forecast_high}
                label={`Empirical 80% interval for ${formatDate(referenceForecast.forecast_date)}`}
              />
              <div className="signal-grid">
                <Signal
                  label="Recent movement"
                  value={formatPercent(referenceForecast.recent_change_pct)}
                  tone={referenceForecast.recent_change_pct}
                />
                <Signal
                  label="vs 90-day level"
                  value={formatPercent(referenceForecast.seasonal_position_pct)}
                  tone={referenceForecast.seasonal_position_pct}
                />
                <Signal
                  label="Interval width"
                  value={formatPercent(referenceForecast.interval_width_pct)}
                  tone={-referenceForecast.interval_width_pct}
                />
              </div>
            </div>

            <div className="market-pulse__facts">
              <Fact
                icon={<Activity size={17} />}
                label="Arrivals"
                value={`${formatNumber(referenceForecast.current_arrivals_tonnes)} t`}
                detail="Source-reported"
              />
              <Fact
                icon={<Scale size={17} />}
                label="Observed spread"
                value={formatCurrency(
                  referenceForecast.current_max_price - referenceForecast.current_min_price,
                )}
                detail="Max minus min"
              />
              <Fact
                icon={<ShieldCheck size={17} />}
                label="Reporting"
                value={
                  referenceMarket.coverage_tier === "high" ? "High coverage" : "Lower coverage"
                }
                detail={`${referenceMarket.record_count.toLocaleString("en-IN")} recent rows`}
              />
              <Fact
                icon={<Info size={17} />}
                label="Variety view"
                value={latestObservation.primary_variety}
                detail={`${latestObservation.variety_count} source variet${latestObservation.variety_count === 1 ? "y" : "ies"} aggregated`}
              />
            </div>
          </section>

          <div className="analysis-grid">
            <section className="analysis-panel analysis-panel--wide" aria-labelledby="trend-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Observed → forecast</p>
                  <h3 id="trend-title">Price path with uncertainty</h3>
                </div>
                <div className="chart-legend" aria-label="Chart legend">
                  <span>
                    <i className="legend-observed" /> Observed
                  </span>
                  <span>
                    <i className="legend-forecast" /> Forecast
                  </span>
                  <span>
                    <i className="legend-interval" /> 80% interval
                  </span>
                </div>
              </div>
              <PriceForecastChart points={chartPoints} forecastStart={forecastStart} />
              <div className="chart-notes">
                <span>{history.length.toLocaleString("en-IN")} reports shown</span>
                <span>{missingReports.toLocaleString("en-IN")} calendar days without a report</span>
                <span>{anomalyCount.toLocaleString("en-IN")} unusual movements flagged</span>
              </div>
            </section>

            <section className="analysis-panel" aria-labelledby="season-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Aggregated history</p>
                  <h3 id="season-title">Seasonal shape</h3>
                </div>
              </div>
              <SeasonalChart points={seasonalPoints} />
              <p className="panel-footnote">
                Median modal price by calendar month across available years. This is descriptive,
                not a future guarantee.
              </p>
            </section>
          </div>

          <section className="realization-section" aria-labelledby="realization-title">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Your assumptions</p>
                <h3 id="realization-title">Estimated net-realization board</h3>
                <p>Rank prepared forecasts after the costs you enter for each market.</p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={downloadComparison}
                disabled={ranking.length === 0}
              >
                <Download size={16} aria-hidden="true" /> Download CSV
              </button>
            </div>

            <div className="calculator-layout">
              <div className="assumption-panel">
                <div className="assumption-grid">
                  <label>
                    <span>Quantity</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantity}
                      aria-invalid={Boolean(quantityError)}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                    />
                  </label>
                  <label>
                    <span>Unit</span>
                    <select
                      value={quantityUnit}
                      onChange={(event) => setQuantityUnit(event.target.value as QuantityUnit)}
                    >
                      <option value="kg">Kilograms</option>
                      <option value="quintal">Quintals</option>
                      <option value="tonne">Metric tonnes</option>
                    </select>
                  </label>
                  <label className="assumption-grid__wide">
                    <span>Transport-cost method</span>
                    <select
                      value={transportMethod}
                      onChange={(event) =>
                        setTransportMethod(event.target.value as TransportMethod)
                      }
                    >
                      <option value="total">Total trip cost per market</option>
                      <option value="per_quintal">Cost per quintal</option>
                      <option value="per_tonne">Cost per metric tonne</option>
                    </select>
                  </label>
                </div>
                {quantityError ? (
                  <p className="field-error" role="alert">
                    {quantityError}
                  </p>
                ) : null}
                {hasInvalidCost ? (
                  <p className="field-error" role="alert">
                    Transport costs cannot be negative.
                  </p>
                ) : null}

                <fieldset className="market-picker">
                  <legend>Markets to compare</legend>
                  <div>
                    {availableMarkets.map((market) => (
                      <label key={market.market_id}>
                        <input
                          type="checkbox"
                          checked={effectiveSelectedIds.includes(market.market_id)}
                          onChange={(event) => toggleMarket(market.market_id, event.target.checked)}
                        />
                        <span>{market.market}</span>
                        <small>{market.district}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="cost-list">
                  <div className="cost-list__heading">
                    <span>Market</span>
                    <span>
                      {transportMethod === "total"
                        ? "Total ₹"
                        : transportMethod === "per_quintal"
                          ? "₹ / quintal"
                          : "₹ / tonne"}
                    </span>
                  </div>
                  {availableMarkets
                    .filter((market) => effectiveSelectedIds.includes(market.market_id))
                    .map((market) => (
                      <label key={market.market_id}>
                        <span>{market.market}</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={costsByMarket[market.market_id] ?? 0}
                          aria-label={`Transport cost for ${market.market}`}
                          aria-invalid={(costsByMarket[market.market_id] ?? 0) < 0}
                          onChange={(event) =>
                            setCostsByMarket((current) => ({
                              ...current,
                              [market.market_id]: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    ))}
                </div>
              </div>

              <div className="formula-panel">
                <p className="eyebrow">Transparent calculation</p>
                <div className="formula">
                  <span>Estimated net</span>
                  <strong>= forecast ₹/quintal × quantity in quintals − your cost</strong>
                </div>
                <dl>
                  <div>
                    <dt>Converted quantity</dt>
                    <dd>
                      {quantityError
                        ? "—"
                        : `${formatNumber(quantityToQuintals(quantity, quantityUnit))} q`}
                    </dd>
                  </div>
                  <div>
                    <dt>Distance used</dt>
                    <dd>None</dd>
                  </div>
                  <div>
                    <dt>Default rate</dt>
                    <dd>None</dd>
                  </div>
                  <div>
                    <dt>Not included</dt>
                    <dd>Commission, tolls, loading, spoilage</dd>
                  </div>
                </dl>
                <p className="formula-panel__note">
                  Coordinates and route quality were not reliable enough for this release, so no
                  distance or transport rate is silently invented.
                </p>
              </div>
            </div>

            {allCostsZero && ranking.length > 0 ? (
              <div className="notice notice--amber" role="status">
                <TriangleAlert size={18} aria-hidden="true" />
                <div>
                  <strong>Price-only ranking.</strong> All transport inputs are ₹0. Add your actual
                  market-specific costs before making a selling decision.
                </div>
              </div>
            ) : null}

            {ranking.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <Info aria-hidden="true" />
                <h4>Select at least one market and provide valid assumptions.</h4>
              </div>
            ) : (
              <div className="ranking-wrap">
                <div className="ranking-summary">
                  <div>
                    <span>Options ranked</span>
                    <strong>{ranking.length}</strong>
                  </div>
                  <div>
                    <span>Forecast-price spread</span>
                    <strong>{formatCurrency(spread)}</strong>
                  </div>
                  <div>
                    <span>Top estimated net</span>
                    <strong>{formatCurrency(ranking[0].net)}</strong>
                  </div>
                  <div>
                    <span>Top uncertainty span</span>
                    <strong>{formatCurrency(ranking[0].netHigh - ranking[0].netLow)}</strong>
                  </div>
                </div>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  aria-label="Scrollable ranked market comparison"
                >
                  <table className="ranking-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Market</th>
                        <th>Forecast range</th>
                        <th>Your cost</th>
                        <th>Estimated net range</th>
                        <th>Freshness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((row) => {
                        const change =
                          (row.forecast.forecast_price - row.forecast.current_modal_price) /
                          Math.max(row.forecast.current_modal_price, 1);
                        return (
                          <tr key={row.forecast.market_id}>
                            <td>
                              <span className={row.rank === 1 ? "rank rank--top" : "rank"}>
                                {row.rank}
                              </span>
                            </td>
                            <td>
                              <strong>{row.forecast.market}</strong>
                              <span>{row.forecast.district}</span>
                              <span
                                className={
                                  change >= 0 ? "movement movement--up" : "movement movement--down"
                                }
                              >
                                {change >= 0 ? (
                                  <ArrowUpRight size={13} />
                                ) : (
                                  <ArrowDownRight size={13} />
                                )}
                                {formatPercent(change)} vs latest
                              </span>
                            </td>
                            <td>
                              <RangeLens
                                low={row.forecast.forecast_low}
                                point={row.forecast.forecast_price}
                                high={row.forecast.forecast_high}
                                label="Forecast range"
                                compact
                              />
                            </td>
                            <td>
                              <strong>{formatCurrency(row.transportCost)}</strong>
                              <span>
                                {transportMethod === "total" ? "entered total" : "calculated total"}
                              </span>
                            </td>
                            <td>
                              <strong>{formatCurrency(row.net)}</strong>
                              <span>
                                {formatCurrency(row.netLow)} – {formatCurrency(row.netHigh)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  row.forecast.freshness_days > data.meta.freshnessThresholdDays
                                    ? "badge badge--warn"
                                    : "badge badge--good"
                                }
                              >
                                {row.forecast.freshness_days}d old
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          <section className="evidence-strip" aria-label="Evidence and caveats">
            <div>
              <span>Observed records</span>
              <strong>{formatCompact(data.meta.observedRecords)}</strong>
              <small>Published market-days</small>
            </div>
            <div>
              <span>Validation sample</span>
              <strong>{formatCompact(data.model.selected_metrics.n)}</strong>
              <small>Rolling-origin forecasts</small>
            </div>
            <div>
              <span>Selected error</span>
              <strong>{formatCurrency(data.model.selected_metrics.mae)}</strong>
              <small>MAE per quintal</small>
            </div>
            <div>
              <span>Interval coverage</span>
              <strong>{formatPercent(data.model.prediction_interval.empirical_coverage)}</strong>
              <small>Later-fold empirical</small>
            </div>
            <a href="/model-performance">
              Read the model evidence <span aria-hidden="true">→</span>
            </a>
          </section>
        </>
      )}
    </section>
  );
}

function Signal({ label, value, tone }: { label: string; value: string; tone: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone > 0.001 ? "signal-up" : tone < -0.001 ? "signal-down" : ""}>
        {value}
      </strong>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="fact-row">
      <span className="fact-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </div>
  );
}
