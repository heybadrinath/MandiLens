import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Database,
  Download,
  GitCompareArrows,
  Info,
  PackageOpen,
  Scale,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrivalsChart, HistoryChart, SeasonalChart } from "@/components/charts";
import { ConsistencyBadge, PriceBand, StatusBadge } from "@/components/data-ui";
import { buildPriceChartPoints, missingCalendarDays, sampleHistory } from "@/lib/analytics";
import { localeDirection, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  formatCurrency,
  formatDate,
  formatDays,
  formatMonth,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { getMarketDetail } from "@/lib/server-data";
import type { Locale } from "@/lib/types";

export async function MarketDetailPage({
  locale,
  stateSlug,
  commoditySlug,
  marketId,
}: {
  locale: Locale;
  stateSlug: string;
  commoditySlug: string;
  marketId: string;
}) {
  const [dictionary, detail] = await Promise.all([
    getDictionary(locale),
    getMarketDetail(stateSlug, commoditySlug, marketId),
  ]);
  if (!detail) notFound();
  const { common, detail: copy, home } = dictionary;
  const { manifest, partition, market, observations, forecasts, seasonal } = detail;
  const latest = observations.at(-1);
  if (!latest) notFound();
  const varieties = [
    ...new Set(observations.map((item) => item.example_variety).filter(Boolean)),
  ].sort();
  const historyPoints = buildPriceChartPoints(observations);
  const arrivalPoints = sampleHistory(
    observations.filter((item) => item.arrivals_tonnes !== null),
    150,
  ).map((item) => ({ date: item.date, arrivals: item.arrivals_tonnes ?? 0 }));
  const calendar = buildCalendar(latest.date, observations, 84);
  const partitionMeta = manifest.partitions.find(
    (item) => item.stateSlug === stateSlug && item.commoditySlug === commoditySlug,
  );
  const flatOutlook =
    forecasts.length > 1 &&
    forecasts.every((item) => item.forecast_price === forecasts[0].forecast_price);

  return (
    <div className="page market-detail" lang={locale} dir={localeDirection(locale)}>
      <Link
        className="back-link"
        href={`${localizePath("/markets", locale)}?state=${encodeURIComponent(partition.state)}&commodity=${encodeURIComponent(partition.commodity)}`}
      >
        <ArrowLeft size={16} />
        {copy.back}
      </Link>
      <header className="market-detail__header">
        <div>
          <p className="kicker">
            {partition.commodity} · {market.district} · {partition.state}
          </p>
          <h1>{market.market}</h1>
          <p>{copy.observedBody}</p>
        </div>
        <div className="market-detail__actions">
          <Link
            className="button button--secondary"
            href={`${localizePath("/compare", locale)}?commodity=${encodeURIComponent(partition.commodity)}&markets=${encodeURIComponent(`${stateSlug}/${commoditySlug}/${marketId}`)}`}
          >
            <GitCompareArrows size={16} />
            {copy.addToCompare}
          </Link>
          {partitionMeta ? (
            <a className="button button--secondary" href={partitionMeta.url} download>
              <Download size={16} />
              {copy.downloadPartition}
            </a>
          ) : null}
        </div>
      </header>

      <section className="observed-summary" aria-labelledby="observed-title">
        <div className="observed-summary__lead">
          <div>
            <p className="kicker">{copy.observedData}</p>
            <h2 id="observed-title">{formatDate(latest.date, locale)}</h2>
          </div>
          <div>
            <StatusBadge
              days={market.latest_age_days}
              threshold={manifest.meta.freshnessThresholdDays}
              locale={locale}
              copy={common}
            />
            <ConsistencyBadge tier={market.coverage_tier} copy={common} />
          </div>
          <PriceBand
            minimum={latest.min_price}
            representative={latest.representative_price}
            maximum={latest.max_price}
            locale={locale}
          />
        </div>
        <div className="observed-stats">
          <DataStat
            label={copy.minimum}
            value={formatCurrency(latest.min_price, locale)}
            icon={<span className="stat-dot stat-dot--yellow" />}
          />
          <DataStat
            label={copy.representative}
            value={formatCurrency(latest.representative_price, locale)}
            icon={<span className="stat-dot stat-dot--green" />}
          />
          <DataStat
            label={copy.maximum}
            value={formatCurrency(latest.max_price, locale)}
            icon={<span className="stat-dot stat-dot--orange" />}
          />
          <DataStat
            label={copy.arrivals}
            value={
              latest.arrivals_tonnes === null
                ? common.noData
                : `${formatNumber(latest.arrivals_tonnes, locale)} ${manifest.meta.arrivalUnit}`
            }
            icon={<PackageOpen size={17} />}
          />
        </div>
        <div className="date-context">
          <span>
            <CalendarDays size={15} />
            {common.latestReport} {formatDate(latest.date, locale)}
          </span>
          <span>
            <Database size={15} />
            {common.sourceThrough} {formatDate(manifest.meta.dateRange[1], locale)}
          </span>
        </div>
      </section>

      <section
        className="reading-guide reading-guide--detail"
        aria-labelledby="detail-reading-guide"
      >
        <div className="reading-guide__intro">
          <BookOpenCheck aria-hidden="true" />
          <div>
            <p className="kicker">{home.reportBody}</p>
            <h2 id="detail-reading-guide">{home.reportTitle}</h2>
          </div>
        </div>
        <div className="reading-guide__items">
          {[0, 3, 4, 7].map((index) => (
            <div key={home.glossary[index].title}>
              <strong>{home.glossary[index].title}</strong>
              <p>{home.glossary[index].body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="detail-chart-card detail-chart-card--wide"
        aria-labelledby="history-title"
      >
        <div className="card-heading">
          <div>
            <p className="kicker">{common.priceUnit}</p>
            <h2 id="history-title">{copy.historyTitle}</h2>
            <p>{copy.historyBody}</p>
          </div>
          <Scale aria-hidden="true" />
        </div>
        <HistoryChart
          data={historyPoints}
          locale={locale}
          label={`${copy.historyTitle}. ${copy.historyBody}`}
          representativeLabel={copy.representative}
          rangeLabel={copy.rangeLegend}
        />
        <ChartDataTable
          label={copy.viewTable}
          observations={observations.slice(-36).reverse()}
          locale={locale}
          copy={copy}
          manifest={manifest}
        />
      </section>

      <div className="detail-chart-grid">
        <section className="detail-chart-card" aria-labelledby="arrivals-title">
          <div className="card-heading">
            <div>
              <p className="kicker">{manifest.meta.arrivalUnit}</p>
              <h2 id="arrivals-title">{copy.arrivalsTitle}</h2>
              <p>{copy.arrivalsBody}</p>
            </div>
            <PackageOpen aria-hidden="true" />
          </div>
          {arrivalPoints.length ? (
            <ArrivalsChart
              data={arrivalPoints}
              locale={locale}
              label={`${copy.arrivalsTitle}. ${copy.arrivalsBody}`}
            />
          ) : (
            <p className="missing-copy">{common.noData}</p>
          )}
          <details className="chart-data">
            <summary>{copy.viewTable}</summary>
            <table>
              <thead>
                <tr>
                  <th>{copy.date}</th>
                  <th>{copy.arrivals}</th>
                </tr>
              </thead>
              <tbody>
                {observations
                  .slice(-24)
                  .reverse()
                  .map((item) => (
                    <tr key={item.date}>
                      <td>{formatDate(item.date, locale)}</td>
                      <td>
                        {item.arrivals_tonnes === null
                          ? "—"
                          : formatNumber(item.arrivals_tonnes, locale)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="detail-chart-card" aria-labelledby="seasonal-title">
          <div className="card-heading">
            <div>
              <p className="kicker">{common.priceUnit}</p>
              <h2 id="seasonal-title">{copy.seasonalTitle}</h2>
              <p>{copy.seasonalBody}</p>
            </div>
            <Sprout aria-hidden="true" />
          </div>
          <SeasonalChart
            data={seasonal.map((item) => ({
              month: formatMonth(item.month, locale),
              price: item.median_price,
              observations: item.observations,
            }))}
            locale={locale}
            label={`${copy.seasonalTitle}. ${copy.seasonalBody}`}
          />
          <details className="chart-data">
            <summary>{copy.viewTable}</summary>
            <table>
              <thead>
                <tr>
                  <th>{copy.date}</th>
                  <th>{copy.representative}</th>
                  <th>{copy.observations}</th>
                </tr>
              </thead>
              <tbody>
                {seasonal.map((item) => (
                  <tr key={item.month}>
                    <td>{formatMonth(item.month, locale)}</td>
                    <td>{formatCurrency(item.median_price, locale)}</td>
                    <td>{formatNumber(item.observations, locale, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      </div>

      <div className="detail-evidence-grid">
        <section className="reporting-card">
          <div className="card-heading">
            <div>
              <p className="kicker">
                {formatPercent(market.weekly_coverage, locale)}{" "}
                {copy.reportingDay.toLocaleLowerCase()}
              </p>
              <h2>{copy.reportingTitle}</h2>
              <p>{copy.reportingBody}</p>
            </div>
            <CalendarDays aria-hidden="true" />
          </div>
          <div
            className="report-calendar"
            role="img"
            aria-label={`${copy.reportingTitle}. ${copy.reportingBody}`}
          >
            {calendar.map((day) => (
              <span
                key={day.date}
                className={day.reported ? "has-report" : "is-missing"}
                title={`${formatDate(day.date, locale)} · ${day.reported ? copy.reportingDay : copy.missingReport}`}
              >
                <i aria-hidden="true" />
                <span className="sr-only">
                  {formatDate(day.date, locale)}:{" "}
                  {day.reported ? copy.reportingDay : copy.missingReport}
                </span>
              </span>
            ))}
          </div>
          <dl className="reporting-metrics">
            <div>
              <dt>{copy.observations}</dt>
              <dd>{formatNumber(observations.length, locale, 0)}</dd>
            </div>
            <div>
              <dt>{copy.missingDays}</dt>
              <dd>{formatNumber(missingCalendarDays(observations), locale, 0)}</dd>
            </div>
            <div>
              <dt>{copy.firstReport}</dt>
              <dd>{formatDate(market.first_date, locale)}</dd>
            </div>
            <div>
              <dt>{copy.largestGap}</dt>
              <dd>{formatDays(market.maximum_gap_days, locale)}</dd>
            </div>
          </dl>
        </section>
        <section className="variety-card">
          <div className="card-heading">
            <div>
              <p className="kicker">
                {formatNumber(varieties.length, locale, 0)} {copy.varieties.toLocaleLowerCase()}
              </p>
              <h2>{copy.varieties}</h2>
              <p>{copy.varietiesNote}</p>
            </div>
            <Sprout aria-hidden="true" />
          </div>
          <div className="variety-list">
            {varieties.map((variety) => (
              <span key={variety}>{variety}</span>
            ))}
          </div>
          <div className="source-notice">
            <Info size={16} />
            <p>
              {latest.aggregation_method}. {latest.example_variety_basis}.
            </p>
          </div>
        </section>
      </div>

      <section className="observation-table-card">
        <div className="card-heading">
          <div>
            <p className="kicker">{copy.tableBody}</p>
            <h2>{copy.tableTitle}</h2>
          </div>
          <Database aria-hidden="true" />
        </div>
        <ChartDataTable
          label={copy.viewTable}
          observations={observations.slice(-30).reverse()}
          locale={locale}
          copy={copy}
          manifest={manifest}
          open
        />
      </section>

      <section className="outlook-section" aria-labelledby="outlook-title">
        <div className="outlook-heading">
          <div>
            <p className="kicker">{copy.reliability}</p>
            <h2 id="outlook-title">{copy.outlookTitle}</h2>
            <p>{copy.outlookBody}</p>
          </div>
          <Link href={localizePath("/forecast-reliability", locale)}>
            {common.learnMore}
            <span className="sr-only"> — {copy.outlookTitle}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
        {forecasts.length ? (
          <>
            <div className="outlook-summary">
              <div>
                <span>{copy.lastObserved}</span>
                <strong>{formatCurrency(forecasts[0].current_representative_price, locale)}</strong>
                <small>{formatDate(forecasts[0].observed_date, locale)}</small>
              </div>
              <div>
                <span>{copy.estimate}</span>
                <strong>{formatCurrency(forecasts[0].forecast_price, locale)}</strong>
                <small>{manifest.modelSummary.selectedLabel}</small>
              </div>
              <div>
                <span>{copy.reliability}</span>
                <strong>
                  {formatPercent(
                    manifest.modelSummary.predictionInterval.empirical_coverage,
                    locale,
                  )}
                </strong>
                <small>{copy.expectedRange}</small>
              </div>
              {flatOutlook ? (
                <p>
                  <strong>
                    {locale === "en" ? "Why the central estimate repeats" : copy.outlookTitle}
                  </strong>
                  {locale === "en"
                    ? "The evaluated production model rounds to one central level for this market and window. The day-specific ranges still change because uncertainty is calibrated separately by forecast horizon. This is a flat model result, not duplicated interface data."
                    : copy.outlookBody}
                </p>
              ) : null}
            </div>
            <div className="forecast-table-wrap">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>{copy.targetDate}</th>
                    <th>{copy.estimate}</th>
                    <th>{copy.expectedRange}</th>
                    <th>{copy.lastObserved}</th>
                    <th>{copy.reliability}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((forecast) => {
                    const change =
                      (forecast.forecast_price - forecast.current_representative_price) /
                      Math.max(forecast.current_representative_price, 1);
                    return (
                      <tr
                        key={forecast.forecast_date}
                        className={forecast.wide_interval ? "wide" : ""}
                      >
                        <td>
                          <strong>{formatDate(forecast.forecast_date, locale)}</strong>
                          <small>{formatDays(forecast.target_offset_days, locale)}</small>
                        </td>
                        <td>
                          <strong>{formatCurrency(forecast.forecast_price, locale)}</strong>
                          <small>
                            {formatPercent(change, locale)} {copy.lastObserved.toLocaleLowerCase()}
                          </small>
                        </td>
                        <td>
                          <strong>
                            {formatCurrency(forecast.forecast_low, locale)}–
                            {formatCurrency(forecast.forecast_high, locale)}
                          </strong>
                          <small>{copy.expectedRange}</small>
                        </td>
                        <td>
                          <strong>{formatDays(forecast.lead_days, locale)}</strong>
                          <small>{formatDate(forecast.observed_date, locale)}</small>
                        </td>
                        <td>
                          <strong>{forecast.interval_calibration_level}</strong>
                          <small>
                            n={formatNumber(forecast.interval_calibration_samples, locale, 0)}
                          </small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="missing-copy">{copy.insufficientForecast}</p>
        )}
        <div className="forecast-warning">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>{common.notAdvice}</strong>
            <p>
              {copy.reliabilityBody}{" "}
              {formatPercent(manifest.modelSummary.predictionInterval.empirical_coverage, locale)}{" "}
              historical empirical interval coverage.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function DataStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="data-stat">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ChartDataTable({
  label,
  observations,
  locale,
  copy,
  manifest,
  open = false,
}: {
  label: string;
  observations: ReturnType<typeof sampleHistory>;
  locale: Locale;
  copy: Awaited<ReturnType<typeof getDictionary>>["detail"];
  manifest: Awaited<ReturnType<typeof getMarketDetail>> extends infer T
    ? T extends { manifest: infer M }
      ? M
      : never
    : never;
  open?: boolean;
}) {
  return (
    <details className="chart-data" open={open}>
      <summary>{label}</summary>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{copy.date}</th>
              <th>{copy.minimum}</th>
              <th>{copy.representative}</th>
              <th>{copy.maximum}</th>
              <th>{copy.arrivals}</th>
              <th>{copy.varieties}</th>
              <th>{copy.anomaly}</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((item) => (
              <tr key={item.date}>
                <td>{formatDate(item.date, locale)}</td>
                <td>{formatCurrency(item.min_price, locale)}</td>
                <td>{formatCurrency(item.representative_price, locale)}</td>
                <td>{formatCurrency(item.max_price, locale)}</td>
                <td>
                  {item.arrivals_tonnes === null
                    ? "—"
                    : `${formatNumber(item.arrivals_tonnes, locale)} ${manifest.meta.arrivalUnit}`}
                </td>
                <td>
                  {formatNumber(item.variety_count, locale, 0)} · {item.example_variety}
                </td>
                <td>{item.is_anomaly ? "●" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function buildCalendar(lastDate: string, observations: Array<{ date: string }>, days: number) {
  const available = new Set(observations.map((item) => item.date));
  const end = new Date(`${lastDate}T00:00:00Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - index - 1));
    const iso = date.toISOString().slice(0, 10);
    return { date: iso, reported: available.has(iso) };
  });
}
