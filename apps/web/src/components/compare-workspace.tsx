"use client";

import { Check, Copy, Download, Info, Search, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ComparisonChart } from "@/components/charts";
import { ConsistencyBadge, EmptyState, PriceBand, StatusBadge } from "@/components/data-ui";
import type { Dictionary } from "@/i18n/types";
import {
  compareOnCommonDate,
  comparisonToCsv,
  type ComparisonMode,
  type ComparisonPrice,
  type QuantityUnit,
  type TransportMethod,
} from "@/lib/calculations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { Locale, Manifest, MarketSummary, Observation, PartitionData } from "@/lib/types";

const EMPTY_OBSERVATIONS: Record<string, Observation[]> = {};

export function CompareWorkspace({
  locale,
  markets,
  manifest,
  common,
  copy,
}: {
  locale: Locale;
  markets: MarketSummary[];
  manifest: Manifest;
  common: Dictionary["common"];
  copy: Dictionary["compare"];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialKeys = (searchParams.get("markets") ?? "")
    .split(",")
    .filter((key) => markets.some((item) => item.key === key));
  const initialCommodity =
    searchParams.get("commodity") ??
    markets.find((item) => initialKeys.includes(item.key))?.commodity ??
    manifest.meta.commodities[0];
  const [commodity, setCommodity] = useState(initialCommodity);
  const [selected, setSelected] = useState<string[]>(initialKeys.slice(0, 4));
  const [marketSearch, setMarketSearch] = useState("");
  const [mode, setMode] = useState<ComparisonMode>(
    searchParams.get("mode") === "forecast" ? "forecast" : "observed",
  );
  const [observedDate, setObservedDate] = useState(searchParams.get("date") ?? "");
  const [observedData, setObservedData] = useState<{
    selectionKey: string;
    byMarket: Record<string, Observation[]>;
  }>({ selectionKey: "", byMarket: {} });
  const [day, setDay] = useState(Math.min(7, Math.max(1, Number(searchParams.get("day") ?? 1))));
  const [quantity, setQuantity] = useState(Math.max(0, Number(searchParams.get("quantity") ?? 1)));
  const [quantityUnit, setQuantityUnit] = useState<QuantityUnit>(
    (searchParams.get("unit") as QuantityUnit) || "tonne",
  );
  const [transportMethod, setTransportMethod] = useState<TransportMethod>(
    (searchParams.get("costMethod") as TransportMethod) || "total",
  );
  const [transport, setTransport] = useState<Record<string, number>>({});
  const [otherCosts, setOtherCosts] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const commodityMarkets = useMemo(
    () =>
      markets
        .filter((item) => item.commodity === commodity)
        .sort(
          (left, right) =>
            left.state.localeCompare(right.state) || left.market.localeCompare(right.market),
        ),
    [commodity, markets],
  );
  const selectedMarkets = useMemo(
    () =>
      selected
        .map((key) => markets.find((item) => item.key === key))
        .filter((item): item is MarketSummary => item !== undefined)
        .filter((item) => item.commodity === commodity),
    [commodity, markets, selected],
  );
  const selectionKey = selectedMarkets.map((item) => item.key).join(",");
  const observedByMarket =
    observedData.selectionKey === selectionKey ? observedData.byMarket : EMPTY_OBSERVATIONS;
  const observationsLoading =
    selectedMarkets.length > 0 && observedData.selectionKey !== selectionKey;
  const visibleOptions = commodityMarkets.filter(
    (item) =>
      !marketSearch ||
      [item.market, item.district, item.state].some((value) =>
        value.toLocaleLowerCase().includes(marketSearch.toLocaleLowerCase()),
      ),
  );
  const commonObservedDates = useMemo(() => {
    if (
      selectedMarkets.length < 2 ||
      selectedMarkets.some((item) => observedByMarket[item.key] === undefined)
    ) {
      return [];
    }
    const [first, ...rest] = selectedMarkets.map((item) => observedByMarket[item.key] ?? []);
    const otherDates = rest.map(
      (observations) => new Set(observations.map((observation) => observation.date)),
    );
    return first
      .map((observation) => observation.date)
      .filter((date) => otherDates.every((dates) => dates.has(date)))
      .sort((left, right) => right.localeCompare(left));
  }, [observedByMarket, selectedMarkets]);
  const commonObservedDate = commonObservedDates.includes(observedDate)
    ? observedDate
    : (commonObservedDates[0] ?? null);

  useEffect(() => {
    if (selectedMarkets.length === 0) return;

    const controller = new AbortController();
    const partitions = new Map<string, MarketSummary[]>();
    for (const market of selectedMarkets) {
      const key = `${market.stateSlug}/${market.commoditySlug}`;
      partitions.set(key, [...(partitions.get(key) ?? []), market]);
    }

    Promise.all(
      [...partitions.entries()].map(async ([key, partitionMarkets]) => {
        const [stateSlug, commoditySlug] = key.split("/");
        const meta = manifest.partitions.find(
          (item) => item.stateSlug === stateSlug && item.commoditySlug === commoditySlug,
        );
        if (!meta) return [] as Array<[string, Observation[]]>;
        const response = await fetch(meta.url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to load ${meta.url}`);
        const partition = (await response.json()) as PartitionData;
        return partitionMarkets.map(
          (market) =>
            [
              market.key,
              partition.observations.filter(
                (observation) => observation.market_id === market.market_id,
              ),
            ] as [string, Observation[]],
        );
      }),
    )
      .then((entries) => {
        setObservedData({
          selectionKey,
          byMarket: Object.fromEntries(entries.flat()),
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setObservedData({ selectionKey, byMarket: {} });
      });

    return () => controller.abort();
  }, [manifest.partitions, selectedMarkets, selectionKey]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("commodity", commodity);
    if (selected.length) params.set("markets", selected.join(","));
    params.set("mode", mode);
    if (mode === "forecast") params.set("day", String(day));
    if (mode === "observed" && commonObservedDate) params.set("date", commonObservedDate);
    params.set("quantity", String(quantity));
    params.set("unit", quantityUnit);
    params.set("costMethod", transportMethod);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    commodity,
    day,
    commonObservedDate,
    pathname,
    quantity,
    quantityUnit,
    router,
    selected,
    transportMethod,
    mode,
  ]);

  const prices = useMemo<ComparisonPrice[]>(
    () =>
      selectedMarkets.flatMap((item) => {
        if (mode === "observed") {
          if (!commonObservedDate) return [];
          const observation = observedByMarket[item.key]?.find(
            (entry) => entry.date === commonObservedDate,
          );
          if (!observation) return [];
          return [
            {
              key: item.key,
              market: item.market,
              sourceDate: observation.date,
              targetDate: observation.date,
              price: observation.representative_price,
              lowPrice: observation.min_price,
              highPrice: observation.max_price,
            },
          ];
        }
        const forecast = item.forecasts.find((entry) => entry.target_offset_days === day);
        if (!forecast) return [];
        return [
          {
            key: item.key,
            market: item.market,
            sourceDate: forecast.observed_date,
            targetDate: forecast.forecast_date,
            price: forecast.forecast_price,
            lowPrice: forecast.forecast_low,
            highPrice: forecast.forecast_high,
          },
        ];
      }),
    [commonObservedDate, day, mode, observedByMarket, selectedMarkets],
  );

  const results = useMemo(() => {
    if (prices.length < 2 || quantity <= 0) return [];
    try {
      return compareOnCommonDate(
        prices,
        Object.fromEntries(
          prices.map((item) => [
            item.key,
            {
              quantity,
              quantityUnit,
              transportValue: transport[item.key] ?? 0,
              transportMethod,
              otherCosts: otherCosts[item.key] ?? 0,
            },
          ]),
        ),
      );
    } catch {
      return [];
    }
  }, [otherCosts, prices, quantity, quantityUnit, transport, transportMethod]);
  const allCostsZero = selected.every(
    (key) => (transport[key] ?? 0) === 0 && (otherCosts[key] ?? 0) === 0,
  );

  function changeCommodity(value: string) {
    setCommodity(value);
    setSelected([]);
    setMarketSearch("");
  }
  function toggleMarket(key: string) {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : current.length < 4
          ? [...current, key]
          : current,
    );
  }
  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  function download() {
    const blob = new Blob([comparisonToCsv(results)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mandilens-${commodity.toLowerCase().replaceAll(" ", "-")}-comparison.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="compare-workspace">
      <div className="compare-controls">
        <section className="compare-step compare-step--commodity">
          <span className="step-number">01</span>
          <label>
            <strong>{withoutStepNumber(copy.commodity)}</strong>
            <select
              name="commodity"
              value={commodity}
              onChange={(event) => changeCommodity(event.target.value)}
            >
              {manifest.meta.commodities.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>
        <section className="compare-step compare-step--markets">
          <span className="step-number">02</span>
          <div className="step-heading">
            <strong>{withoutStepNumber(copy.markets)}</strong>
            <small>{selected.length}/4</small>
          </div>
          <label className="market-search">
            <Search size={15} />
            <input
              name="market-search"
              aria-label={common.searchPlaceholder}
              value={marketSearch}
              onChange={(event) => setMarketSearch(event.target.value)}
              placeholder={common.searchPlaceholder}
            />
          </label>
          <div className="market-picker-list">
            {visibleOptions.map((item) => {
              const checked = selected.includes(item.key);
              return (
                <label key={item.key} className={checked ? "is-selected" : ""}>
                  <input
                    type="checkbox"
                    name="markets"
                    value={item.key}
                    checked={checked}
                    disabled={!checked && selected.length >= 4}
                    onChange={() => toggleMarket(item.key)}
                  />
                  <span className="picker-check">
                    <Check size={11} />
                  </span>
                  <span>
                    <strong>{item.market}</strong>
                    <small>
                      {item.district} · {item.state}
                    </small>
                  </span>
                  <StatusBadge
                    days={item.latest_age_days}
                    threshold={manifest.meta.freshnessThresholdDays}
                    locale={locale}
                    copy={common}
                  />
                </label>
              );
            })}
          </div>
        </section>
        <section className="compare-step compare-step--date">
          <span className="step-number">03</span>
          <strong>{withoutStepNumber(copy.dateMode)}</strong>
          <div className="mode-switch">
            <button
              type="button"
              className={mode === "observed" ? "is-active" : ""}
              onClick={() => setMode("observed")}
            >
              {copy.observed}
            </button>
            <button
              type="button"
              className={mode === "forecast" ? "is-active" : ""}
              onClick={() => setMode("forecast")}
            >
              {copy.forecast}
            </button>
          </div>
          {mode === "forecast" ? (
            <label>
              <span>{copy.commonDate}</span>
              <select
                name="forecast-day"
                value={day}
                onChange={(event) => setDay(Number(event.target.value))}
              >
                {Array.from(
                  { length: manifest.meta.forecastHorizonDays },
                  (_, index) => index + 1,
                ).map((offset) => (
                  <option key={offset} value={offset}>
                    {formatDate(addDays(manifest.meta.comparisonDate, offset), locale)} · +
                    {formatNumber(offset, locale, 0)}d
                  </option>
                ))}
              </select>
            </label>
          ) : observationsLoading ? (
            <p className="field-help">{common.loading}</p>
          ) : commonObservedDates.length > 0 ? (
            <label>
              <span>{copy.commonDate}</span>
              <select
                name="observed-date"
                value={commonObservedDate ?? ""}
                onChange={(event) => setObservedDate(event.target.value)}
              >
                {commonObservedDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date, locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="field-help">{copy.observedUnavailable}</p>
          )}
        </section>
        <section className="compare-step compare-step--assumptions">
          <span className="step-number">04</span>
          <strong>{withoutStepNumber(copy.quantity)}</strong>
          <div className="input-pair">
            <label>
              <span>{withoutStepNumber(copy.quantity)}</span>
              <input
                type="number"
                name="quantity"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </label>
            <label>
              <span>{copy.quantityUnit}</span>
              <select
                name="quantity-unit"
                value={quantityUnit}
                onChange={(event) => setQuantityUnit(event.target.value as QuantityUnit)}
              >
                <option value="kg">kg</option>
                <option value="quintal">quintal</option>
                <option value="tonne">tonne</option>
              </select>
            </label>
          </div>
          <label>
            <span>{copy.transportMethod}</span>
            <select
              name="cost-method"
              value={transportMethod}
              onChange={(event) => setTransportMethod(event.target.value as TransportMethod)}
            >
              <option value="total">{copy.total}</option>
              <option value="per_quintal">{copy.perQuintal}</option>
              <option value="per_tonne">{copy.perTonne}</option>
            </select>
          </label>
        </section>
      </div>

      {selectedMarkets.length >= 2 ? (
        <section className="cost-board" aria-labelledby="assumptions-title">
          <div className="cost-board__head">
            <div>
              <p className="kicker">05 — 06</p>
              <h2 id="assumptions-title">{copy.assumptions}</h2>
            </div>
            <p>{copy.costsNote}</p>
          </div>
          {selectedMarkets.length ? (
            <div className="cost-grid">
              {selectedMarkets.map((item) => (
                <div key={item.key}>
                  <div>
                    <strong>{item.market}</strong>
                    <small>
                      {item.district} · {item.state}
                    </small>
                  </div>
                  <label>
                    <span>{withoutStepNumber(copy.transportCost)}</span>
                    <input
                      type="number"
                      name={`transport-${item.key}`}
                      min="0"
                      value={transport[item.key] ?? 0}
                      onChange={(event) =>
                        setTransport((current) => ({
                          ...current,
                          [item.key]: Math.max(0, Number(event.target.value)),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>{withoutStepNumber(copy.otherCosts)}</span>
                    <input
                      type="number"
                      name={`other-costs-${item.key}`}
                      min="0"
                      value={otherCosts[item.key] ?? 0}
                      onChange={(event) =>
                        setOtherCosts((current) => ({
                          ...current,
                          [item.key]: Math.max(0, Number(event.target.value)),
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="missing-copy">{copy.selectTwo}</p>
          )}
        </section>
      ) : null}

      <section className="comparison-results" aria-labelledby="results-title">
        <div className="comparison-results__head">
          <div>
            <p className="kicker">07</p>
            <h2 id="results-title">{withoutStepNumber(copy.resultTitle)}</h2>
            <p>{copy.resultBody}</p>
          </div>
          <div>
            <button className="button button--secondary" type="button" onClick={share}>
              <Copy size={15} />
              {copied ? common.copied : common.share}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={download}
              disabled={!results.length}
            >
              <Download size={15} />
              {copy.downloadCsv}
            </button>
          </div>
        </div>
        {results.length < 2 ? (
          <EmptyState
            title={copy.selectTwo}
            body={
              mode === "observed" && !commonObservedDate
                ? copy.observedUnavailable
                : copy.resultBody
            }
          />
        ) : (
          <>
            <div className="result-callout">
              <ShieldCheck aria-hidden="true" />
              <div>
                <span>{allCostsZero ? copy.priceOnly : copy.highestAmount}</span>
                <strong>
                  {results[0].market} · {formatCurrency(results[0].amount, locale)}
                </strong>
                <small>{copy.highestAmount}</small>
              </div>
            </div>
            <ComparisonChart
              data={results.map((item) => ({
                name: item.market,
                amount: item.amount,
                low: item.amountLow,
                high: item.amountHigh,
              }))}
              locale={locale}
              label={`${copy.resultTitle}. ${copy.resultBody}`}
            />
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>{withoutStepNumber(copy.markets)}</th>
                    <th>{copy.sourceDate}</th>
                    <th>{copy.targetDate}</th>
                    <th>{copy.price}</th>
                    <th>{copy.range}</th>
                    <th>{withoutStepNumber(copy.transportCost)}</th>
                    <th>{withoutStepNumber(copy.otherCosts)}</th>
                    <th>{copy.estimatedAmount}</th>
                    <th>{copy.freshness}</th>
                    <th>{copy.consistency}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const item = selectedMarkets.find((market) => market.key === result.key)!;
                    return (
                      <tr key={result.key}>
                        <td>
                          <strong>{item.market}</strong>
                          <small>
                            {item.district} · {item.state}
                          </small>
                        </td>
                        <td>{formatDate(result.sourceDate, locale)}</td>
                        <td>{formatDate(result.targetDate, locale)}</td>
                        <td>{formatCurrency(result.price, locale)}</td>
                        <td>
                          <PriceBand
                            minimum={result.lowPrice}
                            representative={result.price}
                            maximum={result.highPrice}
                            locale={locale}
                            compact
                          />
                        </td>
                        <td>{formatCurrency(result.transportCost, locale)}</td>
                        <td>{formatCurrency(result.otherCosts, locale)}</td>
                        <td>
                          <strong>{formatCurrency(result.amount, locale)}</strong>
                          <small>
                            {formatCurrency(result.amountLow, locale)} –{" "}
                            {formatCurrency(result.amountHigh, locale)}
                          </small>
                        </td>
                        <td>
                          <StatusBadge
                            days={item.latest_age_days}
                            threshold={manifest.meta.freshnessThresholdDays}
                            locale={locale}
                            copy={common}
                          />
                        </td>
                        <td>
                          <ConsistencyBadge tier={item.coverage_tier} copy={common} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="comparison-note">
              <Info aria-hidden="true" />
              <p>
                {copy.costsNote} {common.notAdvice}
              </p>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function withoutStepNumber(value: string) {
  return value.replace(/^\d+[.)]?\s*/, "");
}
