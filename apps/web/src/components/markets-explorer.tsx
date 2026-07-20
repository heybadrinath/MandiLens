"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ConsistencyBadge,
  EmptyState,
  PriceBand,
  Sparkline,
  StatusBadge,
} from "@/components/data-ui";
import { localizePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { formatDate, formatNumber } from "@/lib/format";
import type { Locale, Manifest, MarketSummary } from "@/lib/types";
import { freshnessStatus } from "@/lib/types";

type Filters = {
  q: string;
  state: string;
  district: string;
  commodity: string;
  market: string;
  variety: string;
  freshness: string;
  consistency: string;
  since: string;
  history: boolean;
  sort: string;
  view: "overview" | "detailed";
};

const PAGE_SIZE = 18;

export function MarketsExplorer({
  locale,
  manifest,
  markets,
  common,
  copy,
  varietyOptions,
}: {
  locale: Locale;
  manifest: Manifest;
  markets: MarketSummary[];
  common: Dictionary["common"];
  copy: Dictionary["markets"];
  varietyOptions: string[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>(() => ({
    q: searchParams.get("q") ?? "",
    state: searchParams.get("state") ?? "",
    district: searchParams.get("district") ?? "",
    commodity: searchParams.get("commodity") ?? "",
    market: searchParams.get("market") ?? "",
    variety: searchParams.get("variety") ?? "",
    freshness: searchParams.get("freshness") ?? "",
    consistency: searchParams.get("consistency") ?? "",
    since: searchParams.get("since") ?? "",
    history: searchParams.get("history") === "1",
    sort: searchParams.get("sort") ?? "recent",
    view: searchParams.get("view") === "detailed" ? "detailed" : "overview",
  }));
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page") ?? 1)));
  const [selected, setSelected] = useState<string[]>(() =>
    (searchParams.get("selected") ?? "").split(",").filter(Boolean),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (searchParams.get("focus") === "search") searchRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (key === "history" && value) params.set(key, "1");
      else if (key !== "history" && value && value !== "recent" && value !== "overview") {
        params.set(key, String(value));
      }
    }
    if (page > 1) params.set("page", String(page));
    if (selected.length) params.set("selected", selected.join(","));
    const next = params.toString();
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [filters, page, pathname, router, selected]);

  const options = useMemo(() => {
    const stateMarkets = filters.state
      ? markets.filter((item) => item.state === filters.state)
      : markets;
    const commodityMarkets = filters.commodity
      ? stateMarkets.filter((item) => item.commodity === filters.commodity)
      : stateMarkets;
    return {
      states: [...new Set(markets.map((item) => item.state))].sort(),
      districts: [...new Set(stateMarkets.map((item) => item.district))].sort(),
      commodities: [...new Set(stateMarkets.map((item) => item.commodity))].sort(),
      markets: [...new Set(commodityMarkets.map((item) => item.market))].sort(),
    };
  }, [filters.commodity, filters.state, markets]);

  const results = useMemo(() => {
    const query = filters.q.trim().toLocaleLowerCase();
    const filtered = markets.filter((item) => {
      if (
        query &&
        ![item.market, item.district, item.state, item.commodity, ...item.varietyExamples].some(
          (value) => value.toLocaleLowerCase().includes(query),
        )
      )
        return false;
      if (filters.state && item.state !== filters.state) return false;
      if (filters.district && item.district !== filters.district) return false;
      if (filters.commodity && item.commodity !== filters.commodity) return false;
      if (filters.market && item.market !== filters.market) return false;
      if (filters.variety && !item.varietyExamples.includes(filters.variety)) return false;
      if (
        filters.freshness &&
        freshnessStatus(item.latest_age_days, manifest.meta.freshnessThresholdDays) !==
          filters.freshness
      )
        return false;
      if (filters.consistency && item.coverage_tier !== filters.consistency) return false;
      if (filters.since && item.last_date < filters.since) return false;
      if (filters.history) {
        const days =
          (new Date(`${item.last_date}T00:00:00Z`).getTime() -
            new Date(`${item.first_date}T00:00:00Z`).getTime()) /
          86_400_000;
        if (days < 365) return false;
      }
      return true;
    });
    return filtered.sort((left, right) => {
      if (filters.sort === "market") return left.market.localeCompare(right.market);
      if (filters.sort === "price-low")
        return left.latest.representative_price - right.latest.representative_price;
      if (filters.sort === "price-high")
        return right.latest.representative_price - left.latest.representative_price;
      return (
        right.last_date.localeCompare(left.last_date) || left.market.localeCompare(right.market)
      );
    });
  }, [filters, manifest.meta.freshnessThresholdDays, markets]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeFilters = Object.entries(filters).filter(([key, value]) =>
    key === "history" ? value : value && !["recent", "overview"].includes(String(value)),
  ).length;
  const selectedMarkets = selected
    .map((key) => markets.find((item) => item.key === key))
    .filter((item): item is MarketSummary => Boolean(item));
  const selectedCommodity = selectedMarkets[0]?.commodity;

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "state") next.district = "";
      if (key === "state" || key === "commodity") next.market = "";
      return next;
    });
    setPage(1);
  }

  function clear() {
    setFilters({
      q: "",
      state: "",
      district: "",
      commodity: "",
      market: "",
      variety: "",
      freshness: "",
      consistency: "",
      since: "",
      history: false,
      sort: "recent",
      view: "overview",
    });
    setPage(1);
  }

  function toggleSelected(item: MarketSummary) {
    if (selected.includes(item.key)) {
      setSelected((current) => current.filter((key) => key !== item.key));
      return;
    }
    if (selected.length >= 4 || (selectedCommodity && selectedCommodity !== item.commodity)) return;
    setSelected((current) => [...current, item.key]);
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="market-explorer">
      <div className="explorer-toolbar">
        <label className="search-field">
          <span className="sr-only">{copy.search}</span>
          <Search size={17} aria-hidden="true" />
          <input
            name="market-query"
            ref={searchRef}
            value={filters.q}
            onChange={(event) => update("q", event.target.value)}
            placeholder={common.searchPlaceholder}
          />
          {filters.q ? (
            <button type="button" onClick={() => update("q", "")} aria-label={common.clearAll}>
              <X size={15} />
            </button>
          ) : null}
        </label>
        <button className="button button--secondary share-button" type="button" onClick={share}>
          <Copy size={15} />
          {copied ? common.copied : common.share}
        </button>
        <div className="view-switch" aria-label={copy.overview}>
          <button
            type="button"
            className={filters.view === "overview" ? "is-active" : ""}
            onClick={() => update("view", "overview")}
            aria-label={copy.overview}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            type="button"
            className={filters.view === "detailed" ? "is-active" : ""}
            onClick={() => update("view", "detailed")}
            aria-label={copy.detailed}
          >
            <List size={17} />
          </button>
        </div>
        <details className="mobile-filter-drawer">
          <summary>
            <Filter size={17} />
            {copy.openFilters}
            {activeFilters ? <b>{activeFilters}</b> : null}
          </summary>
          <div>
            <FilterPanel
              prefix="mobile"
              activeFilters={activeFilters}
              filters={filters}
              options={options}
              varietyOptions={varietyOptions}
              common={common}
              copy={copy}
              update={update}
              clear={clear}
            />
          </div>
        </details>
      </div>

      <div className="explorer-layout">
        <aside className="filter-panel">
          <FilterPanel
            prefix="desktop"
            activeFilters={activeFilters}
            filters={filters}
            options={options}
            varietyOptions={varietyOptions}
            common={common}
            copy={copy}
            update={update}
            clear={clear}
          />
        </aside>
        <div className="explorer-results">
          <div className="results-head">
            <div>
              <strong>{formatNumber(results.length, locale, 0)}</strong>
              <span>{copy.results}</span>
            </div>
            <label>
              <span>{copy.sort}</span>
              <select
                name="market-sort"
                value={filters.sort}
                onChange={(event) => update("sort", event.target.value)}
              >
                <option value="recent">{copy.sortRecent}</option>
                <option value="market">{copy.sortMarket}</option>
                <option value="price-low">{copy.sortPriceLow}</option>
                <option value="price-high">{copy.sortPriceHigh}</option>
              </select>
            </label>
          </div>

          {selected.length ? (
            <div className="comparison-tray">
              <div>
                <span>
                  {selected.length}/4 {copy.selectedForCompare}
                </span>
                <div>
                  {selectedMarkets.map((item) => (
                    <button key={item.key} type="button" onClick={() => toggleSelected(item)}>
                      {item.market}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              </div>
              <Link
                className={`button button--primary${selected.length < 2 ? " is-disabled" : ""}`}
                aria-disabled={selected.length < 2}
                href={
                  selected.length >= 2
                    ? `${localizePath("/compare", locale)}?commodity=${encodeURIComponent(selectedCommodity ?? "")}&markets=${encodeURIComponent(selected.join(","))}`
                    : "#"
                }
              >
                {copy.compareSelected}
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : null}

          {pageRows.length === 0 ? (
            <EmptyState title={copy.noResults} body={copy.noResultsBody} />
          ) : (
            <>
              <div className="market-table-wrap">
                <table className={`market-table market-table--${filters.view}`}>
                  <thead>
                    <tr>
                      <th>
                        <span className="sr-only">{copy.selectForCompare}</span>
                      </th>
                      <th>{copy.market}</th>
                      <th>{copy.commodity}</th>
                      <th>{copy.reportDate}</th>
                      <th>{copy.representativePrice}</th>
                      {filters.view === "detailed" ? (
                        <>
                          <th>{copy.arrivals}</th>
                          <th>{copy.consistency}</th>
                        </>
                      ) : null}
                      <th>{copy.freshness}</th>
                      <th>
                        <span className="sr-only">{common.viewDetails}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((item) => {
                      const checked = selected.includes(item.key);
                      const disabled =
                        !checked &&
                        (selected.length >= 4 ||
                          Boolean(selectedCommodity && selectedCommodity !== item.commodity));
                      return (
                        <tr key={item.key}>
                          <td>
                            <label className="compare-check">
                              <input
                                type="checkbox"
                                name="compare-market"
                                value={item.key}
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggleSelected(item)}
                              />
                              <span>
                                <Check size={12} />
                              </span>
                            </label>
                          </td>
                          <td>
                            <Link href={localizePath(item.route, locale)}>
                              <strong>{item.market}</strong>
                              <small>
                                {item.district} · {item.state}
                              </small>
                              <Sparkline
                                points={item.sparkline}
                                label={`${item.market} ${copy.history}`}
                              />
                            </Link>
                          </td>
                          <td>
                            <strong>{item.commodity}</strong>
                            <small>
                              {item.varietyExamples.slice(0, 2).join(" · ") || common.noData}
                            </small>
                          </td>
                          <td>
                            <strong>{formatDate(item.last_date, locale)}</strong>
                            <small>
                              {formatNumber(item.record_count, locale, 0)}{" "}
                              {copy.history.toLocaleLowerCase()}
                            </small>
                          </td>
                          <td>
                            <PriceBand
                              minimum={item.latest.min_price}
                              representative={item.latest.representative_price}
                              maximum={item.latest.max_price}
                              locale={locale}
                              compact
                            />
                          </td>
                          {filters.view === "detailed" ? (
                            <>
                              <td>
                                <strong>
                                  {item.latest.arrivals_tonnes === null
                                    ? "—"
                                    : formatNumber(item.latest.arrivals_tonnes, locale)}
                                </strong>
                                <small>{manifest.meta.arrivalUnit}</small>
                              </td>
                              <td>
                                <ConsistencyBadge tier={item.coverage_tier} copy={common} />
                              </td>
                            </>
                          ) : null}
                          <td>
                            <StatusBadge
                              days={item.latest_age_days}
                              threshold={manifest.meta.freshnessThresholdDays}
                              locale={locale}
                              copy={common}
                            />
                          </td>
                          <td>
                            <Link
                              className="icon-link"
                              href={localizePath(item.route, locale)}
                              aria-label={`${common.viewDetails}: ${item.market}`}
                            >
                              <ArrowRight size={16} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="market-card-list">
                {pageRows.map((item) => (
                  <MarketCard
                    key={item.key}
                    item={item}
                    locale={locale}
                    manifest={manifest}
                    common={common}
                    copy={copy}
                    checked={selected.includes(item.key)}
                    disabled={
                      !selected.includes(item.key) &&
                      (selected.length >= 4 ||
                        Boolean(selectedCommodity && selectedCommodity !== item.commodity))
                    }
                    onToggle={() => toggleSelected(item)}
                  />
                ))}
              </div>
            </>
          )}

          {pageCount > 1 ? (
            <nav className="pagination" aria-label={common.page}>
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft size={16} />
                {common.previous}
              </button>
              <span>
                {common.page} {formatNumber(safePage, locale, 0)} {common.of}{" "}
                {formatNumber(pageCount, locale, 0)}
              </span>
              <button
                type="button"
                disabled={safePage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                {common.next}
                <ChevronRight size={16} />
              </button>
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FilterPanel({
  prefix,
  activeFilters,
  filters,
  options,
  varietyOptions,
  common,
  copy,
  update,
  clear,
}: {
  prefix: string;
  activeFilters: number;
  filters: Filters;
  options: { states: string[]; districts: string[]; commodities: string[]; markets: string[] };
  varietyOptions: string[];
  common: Dictionary["common"];
  copy: Dictionary["markets"];
  update: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clear: () => void;
}) {
  return (
    <div className="filter-panel__inner">
      <div className="filter-title">
        <span>
          <SlidersHorizontal size={16} />
          {common.filters}
          {activeFilters ? <b>{activeFilters}</b> : null}
        </span>
        <button type="button" onClick={clear} disabled={!activeFilters}>
          {common.clearAll}
        </button>
      </div>
      <FilterSelect
        id={`${prefix}-state`}
        label={copy.state}
        value={filters.state}
        options={options.states}
        all={common.all}
        onChange={(value) => update("state", value)}
      />
      <FilterSelect
        id={`${prefix}-district`}
        label={copy.district}
        value={filters.district}
        options={options.districts}
        all={common.all}
        onChange={(value) => update("district", value)}
      />
      <FilterSelect
        id={`${prefix}-commodity`}
        label={copy.commodity}
        value={filters.commodity}
        options={options.commodities}
        all={common.all}
        onChange={(value) => update("commodity", value)}
      />
      <FilterSelect
        id={`${prefix}-market`}
        label={copy.market}
        value={filters.market}
        options={options.markets}
        all={common.all}
        onChange={(value) => update("market", value)}
      />
      <FilterSelect
        id={`${prefix}-variety`}
        label={copy.variety}
        value={filters.variety}
        options={varietyOptions}
        all={common.all}
        onChange={(value) => update("variety", value)}
      />
      <FilterSelect
        id={`${prefix}-freshness`}
        label={copy.freshness}
        value={filters.freshness}
        options={["fresh", "recent", "stale"]}
        labels={[common.fresh, common.recent, common.stale]}
        all={common.all}
        onChange={(value) => update("freshness", value)}
      />
      <FilterSelect
        id={`${prefix}-consistency`}
        label={copy.consistency}
        value={filters.consistency}
        options={["high", "standard"]}
        labels={[common.highConsistency, common.standardConsistency]}
        all={common.all}
        onChange={(value) => update("consistency", value)}
      />
      <label className="filter-field" htmlFor={`${prefix}-since`}>
        <span>{copy.reportDate}</span>
        <input
          id={`${prefix}-since`}
          name={`${prefix}-since`}
          type="date"
          value={filters.since}
          onChange={(event) => update("since", event.target.value)}
        />
      </label>
      <label className="check-field">
        <input
          name={`${prefix}-has-history`}
          type="checkbox"
          checked={filters.history}
          onChange={(event) => update("history", event.target.checked)}
        />
        <span>
          <Check size={12} />
        </span>
        {copy.hasHistory}
      </label>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  labels,
  all,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  labels?: string[];
  all: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{all}</option>
        {options.map((option, index) => (
          <option key={option} value={option}>
            {labels?.[index] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MarketCard({
  item,
  locale,
  manifest,
  common,
  copy,
  checked,
  disabled,
  onToggle,
}: {
  item: MarketSummary;
  locale: Locale;
  manifest: Manifest;
  common: Dictionary["common"];
  copy: Dictionary["markets"];
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="market-card">
      <div className="market-card__head">
        <div>
          <span>{item.commodity}</span>
          <h2>{item.market}</h2>
          <p>
            {item.district} · {item.state}
          </p>
        </div>
        <label className="compare-check">
          <input
            type="checkbox"
            name="compare-market"
            value={item.key}
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            aria-label={copy.selectForCompare}
          />
          <span>
            <Check size={12} />
          </span>
        </label>
      </div>
      <Sparkline points={item.sparkline} label={`${item.market} ${copy.history}`} />
      <PriceBand
        minimum={item.latest.min_price}
        representative={item.latest.representative_price}
        maximum={item.latest.max_price}
        locale={locale}
      />
      <div className="market-card__meta">
        <StatusBadge
          days={item.latest_age_days}
          threshold={manifest.meta.freshnessThresholdDays}
          locale={locale}
          copy={common}
        />
        <ConsistencyBadge tier={item.coverage_tier} copy={common} />
      </div>
      <div className="market-card__foot">
        <span>
          {copy.reportDate}
          <strong>{formatDate(item.last_date, locale)}</strong>
        </span>
        <Link href={localizePath(item.route, locale)}>
          {common.viewDetails}
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
