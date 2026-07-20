import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Database,
  GitCompareArrows,
  Landmark,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";

import { Sparkline, StatusBadge } from "@/components/data-ui";
import { localeDirection, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/format";
import { getCatalog, getManifest } from "@/lib/server-data";
import type { Locale } from "@/lib/types";

const featureIcons = [
  Store,
  GitCompareArrows,
  BarChart3,
  Database,
  CalendarCheck2,
  ShieldCheck,
  Landmark,
];
const featureRoutes = [
  "/markets",
  "/compare",
  "/markets",
  "/markets",
  "/markets",
  "/forecast-reliability",
  "/data",
];

export async function HomePage({ locale }: { locale: Locale }) {
  const [dictionary, manifest, catalog] = await Promise.all([
    getDictionary(locale),
    getManifest(),
    getCatalog(),
  ]);
  const { common, home } = dictionary;

  return (
    <div className="page page--home" lang={locale} dir={localeDirection(locale)}>
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="kicker">
            <span />
            {home.heroKicker}
          </p>
          <h1>{home.heroTitle}</h1>
          <p>{home.heroBody}</p>
          <div className="hero-actions">
            <Link className="button button--primary" href={localizePath("/markets", locale)}>
              {common.exploreMarkets}
              <ArrowRight size={16} />
            </Link>
            <Link className="button button--secondary" href={localizePath("/compare", locale)}>
              {common.compareMarkets}
            </Link>
          </div>
          <form className="hero-search" action={localizePath("/markets", locale)} role="search">
            <label htmlFor="home-search">{home.searchLabel}</label>
            <div>
              <Search size={18} aria-hidden="true" />
              <input id="home-search" name="q" placeholder={common.searchPlaceholder} />
              <button type="submit">
                {common.globalSearch}
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </div>

        <div className="hero-ledger" aria-label={home.commodityPulseTitle}>
          <div className="hero-ledger__head">
            <span>{common.officialSource}</span>
            <span>{formatDate(manifest.meta.dateRange[1], locale)}</span>
          </div>
          <div className="hero-ledger__title">
            <div>
              <small>{home.preparedObservations}</small>
              <strong>{formatCompact(manifest.meta.observedRecords, locale)}</strong>
            </div>
            <span className="prepared-seal">
              <i />
              {home.snapshotTitle}
            </span>
          </div>
          <div className="hero-ledger__chart" aria-hidden="true">
            {catalog.commodities.slice(0, 7).map((item, index) => {
              const height =
                28 +
                (item.marketCount /
                  Math.max(...catalog.commodities.map((entry) => entry.marketCount))) *
                  72;
              return <i key={item.name} style={{ height: `${height}%` }} data-tone={index % 3} />;
            })}
          </div>
          <div className="hero-ledger__rows">
            {catalog.commodities.slice(0, 3).map((item) => (
              <Link
                key={item.name}
                href={`${localizePath("/markets", locale)}?commodity=${encodeURIComponent(item.name)}`}
              >
                <span className="commodity-token">{item.name.slice(0, 1)}</span>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {formatNumber(item.marketCount, locale, 0)} {home.reportingMarkets}
                  </small>
                </span>
                <span>
                  <strong>
                    {formatCurrency(item.latestMin, locale)}–
                    {formatCurrency(item.latestMax, locale)}
                  </strong>
                  <small>{formatDate(item.latestDate, locale)}</small>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="snapshot-card" aria-labelledby="snapshot-title">
        <div className="snapshot-card__intro">
          <p className="kicker">
            {common.sourceThrough} {formatDate(manifest.meta.dateRange[1], locale)}
          </p>
          <h2 id="snapshot-title">{home.snapshotTitle}</h2>
          <p>{home.snapshotNote}</p>
        </div>
        <div className="snapshot-metrics">
          <SnapshotMetric
            value={manifest.meta.states.length}
            label={home.coveredStates}
            locale={locale}
          />
          <SnapshotMetric
            value={catalog.districts.length}
            label={home.coveredDistricts}
            locale={locale}
          />
          <SnapshotMetric
            value={manifest.meta.markets}
            label={home.coveredMarkets}
            locale={locale}
          />
          <SnapshotMetric
            value={manifest.meta.commodities.length}
            label={home.coveredCommodities}
            locale={locale}
          />
          <SnapshotMetric
            value={manifest.meta.observedRecords}
            label={home.preparedObservations}
            locale={locale}
            compact
          />
          <div className="snapshot-metric">
            <strong>{formatDateTime(manifest.meta.generatedAt, locale)}</strong>
            <span>{home.preparedTime}</span>
          </div>
        </div>
      </section>

      <section className="section-block" aria-labelledby="states-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{home.coveredStates}</p>
            <h2 id="states-title">{home.browseStatesTitle}</h2>
          </div>
          <p>{home.browseStatesBody}</p>
        </div>
        <div className="state-grid">
          {catalog.states.map((state) => (
            <Link
              className="state-card"
              href={`${localizePath("/markets", locale)}?state=${encodeURIComponent(state.name)}`}
              key={state.slug}
            >
              <div className="state-card__head">
                <span className="state-glyph" aria-hidden="true">
                  {state.name.slice(0, 2).toUpperCase()}
                </span>
                <ArrowRight size={16} />
              </div>
              <h3>{state.name}</h3>
              <dl>
                <div>
                  <dt>{home.districts}</dt>
                  <dd>{formatNumber(state.districtCount, locale, 0)}</dd>
                </div>
                <div>
                  <dt>{home.markets}</dt>
                  <dd>{formatNumber(state.marketCount, locale, 0)}</dd>
                </div>
                <div>
                  <dt>{home.commodities}</dt>
                  <dd>{formatNumber(state.commodityCount, locale, 0)}</dd>
                </div>
              </dl>
              <div className="state-card__freshness">
                <span>
                  <i style={{ width: `${(state.freshSeries / state.seriesCount) * 100}%` }} />
                </span>
                <small>
                  {state.freshSeries}/{state.seriesCount} {home.seriesFresh}
                </small>
              </div>
              <p>
                {common.latestReport} · {formatDate(state.latestDate, locale)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="pulse-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{home.latestPriceRange}</p>
            <h2 id="pulse-title">{home.commodityPulseTitle}</h2>
          </div>
          <p>{home.commodityPulseBody}</p>
        </div>
        <div className="commodity-board" role="list">
          <div className="commodity-board__labels" aria-hidden="true">
            <span>{home.commodities}</span>
            <span>{home.commodityPulseTitle}</span>
            <span>{home.latestPriceRange}</span>
            <span>{common.latestReport}</span>
          </div>
          {catalog.commodities.map((commodity, index) => (
            <Link
              className="commodity-row"
              href={`${localizePath("/markets", locale)}?commodity=${encodeURIComponent(commodity.name)}`}
              key={commodity.name}
              role="listitem"
            >
              <div className="commodity-row__identity">
                <span className={`commodity-token commodity-token--${index % 4}`}>
                  {commodity.name.slice(0, 1)}
                </span>
                <div>
                  <h3>{commodity.name}</h3>
                  <small>
                    {formatNumber(commodity.marketCount, locale, 0)} {home.reportingMarkets}
                  </small>
                </div>
              </div>
              <div className="commodity-row__trend">
                <Sparkline
                  points={commodity.sparkline}
                  label={`${commodity.name} ${home.commodityPulseTitle}`}
                />
              </div>
              <div className="commodity-row__range">
                <strong>
                  {formatCurrency(commodity.latestMin, locale)}–
                  {formatCurrency(commodity.latestMax, locale)}
                </strong>
                <small>{common.priceUnit}</small>
              </div>
              <div className="commodity-row__status">
                <StatusBadge
                  days={Math.max(
                    0,
                    Math.round(
                      (new Date(`${manifest.meta.dateRange[1]}T00:00:00Z`).getTime() -
                        new Date(`${commodity.latestDate}T00:00:00Z`).getTime()) /
                        86_400_000,
                    ),
                  )}
                  threshold={manifest.meta.freshnessThresholdDays}
                  locale={locale}
                  copy={common}
                />
                <small>{formatDate(commodity.latestDate, locale)}</small>
              </div>
              <ArrowRight className="commodity-row__arrow" size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="features-title">
        <div className="section-heading">
          <div>
            <p className="kicker">MandiLens</p>
            <h2 id="features-title">{home.whatTitle}</h2>
          </div>
          <p>{home.whatBody}</p>
        </div>
        <div className="feature-grid">
          {home.features.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <Link
                className="feature-card"
                href={localizePath(featureRoutes[index], locale)}
                key={feature.title}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{feature.title}</strong>
                  <small>{feature.body}</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="report-guide" aria-labelledby="report-title">
        <div className="report-guide__intro">
          <p className="kicker">{home.reportBody}</p>
          <h2 id="report-title">{home.reportTitle}</h2>
          <div className="mini-price-band">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="report-guide__terms">
          {home.glossary.map((item, index) => (
            <div key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="trust-panel" aria-labelledby="trust-title">
        <div className="trust-panel__lead">
          <ShieldCheck aria-hidden="true" />
          <p className="kicker">{common.officialSource}</p>
          <h2 id="trust-title">{home.trustTitle}</h2>
          <p>{home.trustBody}</p>
          <Link className="button button--ink" href={localizePath("/data", locale)}>
            {common.learnMore}
            <span className="sr-only"> — {home.trustTitle}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="trust-panel__items">
          {home.trustItems.map((item, index) => (
            <div key={item.title}>
              <span>{index + 1}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SnapshotMetric({
  value,
  label,
  locale,
  compact = false,
}: {
  value: number;
  label: string;
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <div className="snapshot-metric">
      <strong>{compact ? formatCompact(value, locale) : formatNumber(value, locale, 0)}</strong>
      <span>{label}</span>
    </div>
  );
}
