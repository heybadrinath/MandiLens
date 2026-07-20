import {
  ArrowRight,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Landmark,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";

import { DataPreview } from "@/components/data-preview";
import { DataDateNotice, DefinitionList, PageHeader } from "@/components/data-ui";
import { localeDirection, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatBytes, formatCompact, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import {
  getCatalog,
  getEvidence,
  getEvidenceFileSize,
  getManifest,
  getManifestFileSize,
} from "@/lib/server-data";
import type { Locale } from "@/lib/types";

export async function DataPage({ locale }: { locale: Locale }) {
  const [dictionary, manifest, evidence, catalog, manifestBytes, evidenceBytes] = await Promise.all(
    [
      getDictionary(locale),
      getManifest(),
      getEvidence(),
      getCatalog(),
      getManifestFileSize(),
      getEvidenceFileSize(),
    ],
  );
  const { common, data: copy, markets: marketCopy } = dictionary;
  const quality = evidence.quality.current_refresh_validation;
  const forecastRecords = manifest.partitions.reduce(
    (total, item) => total + item.forecastCount,
    0,
  );
  const accepted = quality.accepted_variety_records ?? quality.accepted_records ?? 0;

  return (
    <div className="page data-page" lang={locale} dir={localeDirection(locale)}>
      <PageHeader
        kicker={copy.kicker}
        title={copy.title}
        body={copy.body}
        aside={
          <DataDateNotice
            label={common.sourceThrough}
            date={manifest.meta.dateRange[1]}
            locale={locale}
          />
        }
      />

      <section className="data-provenance">
        <div>
          <Landmark aria-hidden="true" />
          <span>
            <small>{common.officialSource}</small>
            <strong>{manifest.source.name}</strong>
            <em>{manifest.source.provider}</em>
          </span>
        </div>
        <dl>
          <div>
            <dt>{copy.retrieval}</dt>
            <dd>{formatDateTime(manifest.meta.sourceRetrievedAt, locale)}</dd>
          </div>
          <div>
            <dt>{copy.updateFrequency}</dt>
            <dd>{copy.updateFrequencyValue}</dd>
          </div>
          <div>
            <dt>{copy.licence}</dt>
            <dd>
              <a href={manifest.source.licenseUrl} target="_blank" rel="noreferrer">
                {manifest.source.license}
                <ExternalLink size={13} />
              </a>
            </dd>
          </div>
          <div>
            <dt>{copy.units}</dt>
            <dd>
              {manifest.meta.priceUnit}; {manifest.meta.arrivalUnit}
            </dd>
          </div>
        </dl>
      </section>

      <section className="processing-card" aria-labelledby="funnel-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{copy.funnelBody}</p>
            <h2 id="funnel-title">{copy.funnelTitle}</h2>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>
        <div className="processing-funnel">
          <FunnelStep
            index="01"
            label={copy.sourceRows}
            value={quality.input_records}
            locale={locale}
            tone="ink"
          />
          <FunnelStep
            index="02"
            label={copy.acceptedRows}
            value={accepted}
            locale={locale}
            tone="green"
          />
          <FunnelStep
            index="03"
            label={copy.marketDays}
            value={manifest.meta.observedRecords}
            locale={locale}
            tone="yellow"
          />
          <FunnelStep
            index="04"
            label={copy.forecastRecords}
            value={forecastRecords}
            locale={locale}
            tone="orange"
          />
        </div>
        <div className="rejected-row">
          <X size={16} aria-hidden="true" />
          <span>
            <strong>{formatNumber(quality.excluded_records, locale, 0)}</strong>
            {copy.rejectedRows}
          </span>
          <small>
            {Object.entries(quality.exclusion_reasons ?? {})
              .map(
                ([reason, count]) =>
                  `${reason.replaceAll("_", " ")}: ${formatNumber(count, locale, 0)}`,
              )
              .join(" · ")}
          </small>
        </div>
        <div className="stage-notes">
          <span>
            <strong>{formatCompact(evidence.model.selected_metrics.n, locale)}</strong>
            {copy.trainingExamples}
          </span>
          <span>
            <strong>{formatNumber(manifest.meta.series, locale, 0)}</strong>
            {marketCopy.results}
          </span>
          <span>
            <strong>{formatNumber(catalog.arrivalsMarketCount, locale, 0)}</strong>
            {marketCopy.arrivals}
          </span>
          <span>
            <strong>{formatNumber(catalog.forecastMarketCount, locale, 0)}</strong>
            {copy.forecastMarkets}
          </span>
        </div>
      </section>

      <section className="section-block" aria-labelledby="coverage-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{copy.coverageBody}</p>
            <h2 id="coverage-title">{copy.coverageTitle}</h2>
          </div>
          <Database aria-hidden="true" />
        </div>
        <div className="coverage-table-wrap">
          <table className="coverage-table">
            <thead>
              <tr>
                <th>{marketCopy.state}</th>
                <th>{dictionary.home.districts}</th>
                <th>{dictionary.home.markets}</th>
                <th>{dictionary.home.commodities}</th>
                <th>{copy.marketDays}</th>
                <th>{common.latestReport}</th>
              </tr>
            </thead>
            <tbody>
              {catalog.states.map((state) => (
                <tr key={state.slug}>
                  <td>
                    <Link
                      href={`${localizePath("/markets", locale)}?state=${encodeURIComponent(state.name)}`}
                    >
                      <strong>{state.name}</strong>
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                  <td>{formatNumber(state.districtCount, locale, 0)}</td>
                  <td>{formatNumber(state.marketCount, locale, 0)}</td>
                  <td>{formatNumber(state.commodityCount, locale, 0)}</td>
                  <td>{formatNumber(state.observationCount, locale, 0)}</td>
                  <td>{formatDate(state.latestDate, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block" aria-labelledby="matrix-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{copy.matrixBody}</p>
            <h2 id="matrix-title">{copy.matrixTitle}</h2>
          </div>
        </div>
        <div className="coverage-matrix-wrap" tabIndex={0}>
          <table className="coverage-matrix">
            <thead>
              <tr>
                <th>{marketCopy.state}</th>
                {manifest.meta.commodities.map((commodity) => (
                  <th key={commodity}>
                    <span>{commodity}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manifest.meta.states.map((state) => (
                <tr key={state.slug}>
                  <th>{state.name}</th>
                  {manifest.meta.commodities.map((commodity) => {
                    const partition = manifest.partitions.find(
                      (item) => item.stateSlug === state.slug && item.commodity === commodity,
                    );
                    return (
                      <td key={commodity} className={partition ? "is-covered" : ""}>
                        <span className="sr-only">
                          {partition ? copy.available : copy.notAvailable}
                        </span>
                        {partition ? (
                          <span title={`${partition.marketCount} ${dictionary.home.markets}`}>
                            {formatNumber(partition.marketCount, locale, 0)}
                          </span>
                        ) : (
                          <span aria-hidden="true">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block" aria-labelledby="preview-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{copy.previewBody}</p>
            <h2 id="preview-title">{copy.previewTitle}</h2>
          </div>
        </div>
        <DataPreview
          markets={catalog.markets}
          locale={locale}
          manifest={manifest}
          common={common}
          marketCopy={marketCopy}
        />
      </section>

      <section className="data-dictionary" aria-labelledby="dictionary-title">
        <div>
          <p className="kicker">{copy.units}</p>
          <h2 id="dictionary-title">{copy.dictionaryTitle}</h2>
          <p>{copy.varietyLimit}</p>
        </div>
        <DefinitionList
          items={[
            {
              term: copy.sourceRows,
              description: copy.funnelBody,
            },
            {
              term: copy.acceptedRows,
              description: dictionary.info.dataQuality.points[0],
            },
            {
              term: copy.rejectedRows,
              description: dictionary.info.dataQuality.points[0],
            },
            { term: copy.marketDays, description: dictionary.home.glossary[3].body },
            {
              term: copy.trainingExamples,
              description: dictionary.info.forecastReliability.points[0],
            },
            {
              term: copy.forecastRecords,
              description: dictionary.detail.outlookBody,
            },
          ]}
        />
      </section>

      <section className="downloads-section" aria-labelledby="downloads-title">
        <div className="section-heading">
          <div>
            <p className="kicker">{copy.downloadsBody}</p>
            <h2 id="downloads-title">{copy.downloadsTitle}</h2>
          </div>
          <Download aria-hidden="true" />
        </div>
        <div className="download-list">
          <DownloadRow
            href="/data/manifest.json"
            name="manifest.json"
            description={copy.downloadsBody}
            size={manifestBytes}
            checksum="—"
            locale={locale}
            copy={copy}
            prepared={manifest.meta.generatedAt}
          />
          <DownloadRow
            href="/data/evidence.json"
            name="evidence.json"
            description={dictionary.info.dataQuality.body}
            size={evidenceBytes}
            checksum="—"
            locale={locale}
            copy={copy}
            prepared={evidence.quality.generated_at}
          />
          {manifest.meta.states.map((state) => {
            const partitions = manifest.partitions.filter((item) => item.stateSlug === state.slug);
            return (
              <details className="download-group" key={state.slug}>
                <summary>
                  <span>
                    <FileJson size={17} />
                    <strong>{state.name}</strong>
                    <small>
                      {formatNumber(partitions.length, locale, 0)} JSON partitions ·{" "}
                      {formatBytes(
                        partitions.reduce((total, item) => total + item.bytes, 0),
                        locale,
                      )}
                    </small>
                  </span>
                  <ArrowRight size={15} />
                </summary>
                <div>
                  {partitions.map((item) => (
                    <DownloadRow
                      key={item.url}
                      href={item.url}
                      name={`${item.commoditySlug}.json`}
                      description={`${item.commodity} · ${formatNumber(item.marketCount, locale, 0)} ${dictionary.home.markets} · ${formatNumber(item.observationCount, locale, 0)} ${copy.marketDays}`}
                      size={item.bytes}
                      checksum={item.sha256}
                      locale={locale}
                      copy={copy}
                      prepared={manifest.meta.generatedAt}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="data-limitations">
        <Scale aria-hidden="true" />
        <div>
          <p className="kicker">{copy.limitations}</p>
          <h2>{dictionary.info.limitations.title}</h2>
          <p>
            {copy.varietyLimit} {dictionary.info.limitations.body}
          </p>
          <Link href={localizePath("/limitations", locale)}>
            {common.learnMore}
            <span className="sr-only"> — {dictionary.info.limitations.title}</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FunnelStep({
  index,
  label,
  value,
  locale,
  tone,
}: {
  index: string;
  label: string;
  value: number;
  locale: Locale;
  tone: string;
}) {
  return (
    <div className={`funnel-step funnel-step--${tone}`}>
      <small>{index}</small>
      <strong>{formatCompact(value, locale)}</strong>
      <span>
        <i aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}

function DownloadRow({
  href,
  name,
  description,
  size,
  checksum,
  locale,
  copy,
  prepared,
}: {
  href: string;
  name: string;
  description: string;
  size: number;
  checksum: string;
  locale: Locale;
  copy: Awaited<ReturnType<typeof getDictionary>>["data"];
  prepared: string;
}) {
  return (
    <a className="download-row" href={href} download>
      <FileJson aria-hidden="true" />
      <span>
        <strong>{name}</strong>
        <small>{description}</small>
      </span>
      <span>
        <small>{copy.format}</small>
        <strong>JSON</strong>
      </span>
      <span>
        <small>{copy.size}</small>
        <strong>{formatBytes(size, locale)}</strong>
      </span>
      <span>
        <small>{copy.prepared}</small>
        <strong>{formatDate(prepared, locale)}</strong>
      </span>
      <span className="checksum">
        <small>{copy.checksum}</small>
        <code title={checksum}>{checksum === "—" ? checksum : `${checksum.slice(0, 10)}…`}</code>
      </span>
      <Download size={16} />
    </a>
  );
}
