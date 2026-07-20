import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/data-ui";
import { localeDirection, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/types";
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { getCatalog, getEvidence, getManifest } from "@/lib/server-data";
import type { Catalog, Evidence, Locale, Manifest, ValidationSummary } from "@/lib/types";

export type InfoKind =
  | "dataQuality"
  | "forecastReliability"
  | "methodology"
  | "sources"
  | "limitations"
  | "architecture";

export async function InfoPage({ locale, kind }: { locale: Locale; kind: InfoKind }) {
  const [dictionary, manifest, evidence, catalog] = await Promise.all([
    getDictionary(locale),
    getManifest(),
    getEvidence(),
    getCatalog(),
  ]);
  const copy = dictionary.info[kind];
  const current = evidence.quality.current_refresh_validation;
  const related: Record<InfoKind, string[]> = {
    dataQuality: ["/data", "/methodology", "/limitations"],
    forecastReliability: ["/methodology", "/data-quality", "/limitations"],
    methodology: ["/sources", "/data-quality", "/forecast-reliability"],
    sources: ["/data", "/methodology", "/limitations"],
    limitations: ["/data-quality", "/forecast-reliability", "/sources"],
    architecture: ["/how-it-works", "/data", "/methodology"],
  };
  const labels: Record<string, string> = {
    "/data": dictionary.common.data,
    "/methodology": dictionary.info.methodology.title,
    "/limitations": dictionary.info.limitations.title,
    "/data-quality": dictionary.info.dataQuality.title,
    "/forecast-reliability": dictionary.info.forecastReliability.title,
    "/sources": dictionary.info.sources.title,
    "/how-it-works": dictionary.common.howItWorks,
  };

  return (
    <div className="page info-page" lang={locale} dir={localeDirection(locale)}>
      <PageHeader
        kicker={dictionary.info.keyEvidence}
        title={copy.title}
        body={copy.body}
        aside={
          <div className="prepared-card">
            <span>{dictionary.common.sourceThrough}</span>
            <strong>{formatDate(manifest.meta.dateRange[1], locale)}</strong>
            <small>{formatDate(manifest.meta.generatedAt, locale)}</small>
          </div>
        }
      />
      <section className="plain-points">
        {copy.points.map((point, index) => (
          <div key={point}>
            <span className="plain-point__number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p>{point}</p>
          </div>
        ))}
      </section>
      {kind === "dataQuality" ? (
        <DataQualityEvidence
          locale={locale}
          manifest={manifest}
          current={current}
          dictionary={dictionary}
        />
      ) : null}
      {kind === "forecastReliability" ? (
        <ForecastEvidence locale={locale} evidence={evidence} dictionary={dictionary} />
      ) : null}
      {kind === "methodology" ? <MethodEvidence dictionary={dictionary} /> : null}
      {kind === "sources" ? (
        <SourceEvidence
          locale={locale}
          manifest={manifest}
          current={current}
          dictionary={dictionary}
        />
      ) : null}
      {kind === "limitations" ? (
        <LimitationEvidence
          locale={locale}
          manifest={manifest}
          catalog={catalog}
          dictionary={dictionary}
        />
      ) : null}
      {kind === "architecture" ? <ArchitectureEvidence dictionary={dictionary} /> : null}
      {locale === "en" ? (
        <DetailedTechnicalReport
          kind={kind}
          manifest={manifest}
          evidence={evidence}
          catalog={catalog}
        />
      ) : null}
      <section className="related-links">
        <p className="kicker">{dictionary.info.readRelated}</p>
        <div>
          {related[kind].map((href) => (
            <Link key={href} href={localizePath(href, locale)}>
              {labels[href]}
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

interface TechnicalSection {
  title: string;
  summary: string;
  points: string[];
}

function DetailedTechnicalReport({
  kind,
  manifest,
  evidence,
  catalog,
}: {
  kind: InfoKind;
  manifest: Manifest;
  evidence: Evidence;
  catalog: Catalog;
}) {
  const sections = technicalSections(kind, manifest, evidence, catalog);
  return (
    <article className="technical-report">
      <header>
        <p className="kicker">Technical report</p>
        <h2>Detailed notes, interpretation, and operational boundaries</h2>
        <p>
          This section documents what the published evidence means, how it was produced, and where
          the interface deliberately avoids making a stronger claim than the data supports.
        </p>
      </header>
      <nav aria-label="On this page">
        <strong>On this page</strong>
        {sections.map((section, index) => (
          <a key={section.title} href={`#technical-section-${index + 1}`}>
            {String(index + 1).padStart(2, "0")} · {section.title}
          </a>
        ))}
      </nav>
      <div className="technical-report__body">
        {sections.map((section, index) => (
          <section id={`technical-section-${index + 1}`} key={section.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{section.title}</h2>
              <p>{section.summary}</p>
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function technicalSections(
  kind: InfoKind,
  manifest: Manifest,
  evidence: Evidence,
  catalog: Catalog,
): TechnicalSection[] {
  const model = evidence.model;
  const selection = model.selection_stability;
  const blend = selection.blend;
  const validation = evidence.quality.current_refresh_validation;
  const published = manifest.qualitySummary.published;
  const common = {
    scope: `${manifest.meta.states.length} states, ${catalog.districts.length} districts, ${manifest.meta.markets} markets, ${manifest.meta.commodities.length} commodities, and ${formatNumber(manifest.meta.observedRecords, "en", 0)} prepared market-day records`,
    dates: `${manifest.meta.dateRange[0]} through ${manifest.meta.dateRange[1]}`,
  };

  const reports: Record<InfoKind, TechnicalSection[]> = {
    dataQuality: [
      {
        title: "Validation boundary",
        summary:
          "Quality checks run before any row can influence a chart, aggregate, comparison, or forecast feature.",
        points: [
          `${formatNumber(validation.input_records, "en", 0)} source variety rows were inspected in the current refresh; ${formatNumber(validation.accepted_variety_records ?? validation.accepted_records ?? 0, "en", 0)} passed validation and ${formatNumber(validation.excluded_records, "en", 0)} were excluded.`,
          "Non-positive prices, impossible minimum/representative/maximum ordering, exact duplicates, and values above the configured safety ceiling are rejected with explicit reason codes.",
          "Corrections and unresolved market references are recorded separately so a clean published count is never presented as proof that the source itself was error-free.",
        ],
      },
      {
        title: "Aggregation and missingness",
        summary:
          "The public unit is a market, commodity, and report date; source varieties are retained as evidence but are not rendered as duplicate market rows.",
        points: [
          "Representative price is arrival-weighted only when every retained variety reports arrivals; otherwise the median variety modal price is used.",
          "A missing report remains missing. The pipeline never converts an absent date or absent arrival quantity into a zero price or zero arrival.",
          `${formatNumber(published.anomaly_records, "en", 0)} published records carry a statistical anomaly flag; the flag is a review signal, not automatic proof of a bad source record.`,
        ],
      },
      {
        title: "Coverage and recency",
        summary:
          "Freshness and reporting consistency describe different risks and are shown separately throughout the product.",
        points: [
          `${formatNumber(published.stale_series, "en", 0)} published series are stale and ${formatNumber(published.long_gap_series, "en", 0)} contain a long reporting gap under the configured thresholds.`,
          "Freshness counts calendar days from the dataset comparison date to a series' latest report; consistency measures how regularly the market reported during its active window.",
          `The prepared coverage currently spans ${common.scope}, covering ${common.dates}.`,
        ],
      },
      {
        title: "Audit trail",
        summary:
          "Published counts, reason totals, manifests, and partition checksums make the transformation reviewable after each refresh.",
        points: [
          "The data page exposes partition size, date range, and SHA-256 checksum so a downloaded file can be matched to this prepared release.",
          "Quality evidence is generated from the same artifacts the application reads; display totals are not maintained in a separate manual dashboard.",
          "A later source correction can change historical aggregates, so a snapshot date and generated timestamp accompany every release.",
        ],
      },
    ],
    forecastReliability: [
      {
        title: "How the production method is selected",
        summary:
          "Candidate methods are compared on chronological folds. A later time holdout is reported separately and is not an input to the automated selector.",
        points: [
          `${model.selected_label} is the current production point method. The best lead-aware candidate improved pooled selection MAE by ${formatPercent(selection.candidate_improvement, "en")}; the gate requires ${formatPercent(selection.required_improvement, "en")}.`,
          `The candidate won ${selection.candidate_fold_wins} of ${selection.usable_folds} usable selection folds; the configured stability gate requires ${formatPercent(selection.required_fold_win_share, "en")}.`,
          "Lag, rolling, calendar, market, crop, freshness, arrival-coverage, and volatility features are computed only from information available at each forecast origin.",
        ],
      },
      {
        title: "How the seven-day point path is produced",
        summary: `The production blend keeps ${formatPercent(blend.baseline_weight, "en")} of the stable ${blend.baseline_label.toLowerCase()}, adds ${formatPercent(blend.tree_weight, "en")} of a lead-aware tree estimate, and applies a ${formatPercent(blend.level_drift_weight, "en")} damped recent-level adjustment per lead day.`,
        points: [
          `The automated search selected the tree and level-drift weights from ${blend.tested_tree_weights.length * blend.tested_level_drift_weights.length} parameter pairs using only chronological selection folds; holdout values are computed afterward.`,
          "Lead day, target weekday, target week, target month, recent momentum, volatility, arrivals, and market context can now change the central estimate from one target date to the next.",
          "No cosmetic noise is added. A few genuinely stable series may still round to the same rupee on adjacent days, while their uncertainty ranges remain separately calibrated by horizon.",
        ],
      },
      {
        title: "Locked holdout performance",
        summary: `The final holdout runs from ${model.locked_holdout.start} to ${model.locked_holdout.end} and contains ${formatNumber(model.selected_metrics.n, "en", 0)} forecast examples.`,
        points: [
          `Mean absolute error is ${formatCurrency(model.selected_metrics.mae, "en")} per quintal and WAPE is ${formatPercent(model.selected_metrics.wape, "en")}.`,
          `Directional accuracy is ${formatPercent(model.selected_metrics.directional_accuracy, "en")}; this is contextual evidence, not a guarantee for a particular market or date.`,
          "Aggregate metrics can hide weak commodities or markets, so the published evaluation retains segmented horizon, commodity, state, market, and coverage results.",
        ],
      },
      {
        title: "Uncertainty and safe interpretation",
        summary:
          "Intervals are asymmetric residual ranges calibrated on earlier out-of-time errors with hierarchical fallback when a narrow segment has too few examples.",
        points: [
          `The nominal interval target is ${formatPercent(model.prediction_interval.nominal_coverage, "en")}; empirical locked-holdout coverage is ${formatPercent(model.prediction_interval.empirical_coverage, "en")}.`,
          "Coverage below the nominal target is visible because hiding it would overstate reliability. Wider intervals should be read as less precision, not as a larger expected price move.",
          "Forecasts are secondary to observed reports and are information only, not trading, procurement, or financial advice.",
        ],
      },
    ],
    methodology: [
      {
        title: "Acquire and identify",
        summary: `The pipeline reads official ${manifest.source.name} responses and records source identity before transforming any market row.`,
        points: [
          `The prepared window covers ${common.dates}; the current refresh contains ${formatNumber(validation.source_file_count, "en", 0)} source files.`,
          "State, district, market, commodity, variety, unit, date, price, and arrival fields remain traceable through the prepared artifacts.",
          "Source retrieval time and dataset source-through date are separate so users can distinguish data recency from application build time.",
        ],
      },
      {
        title: "Validate and normalize",
        summary:
          "Records are parsed into stable types, checked for valid price order and bounds, deduplicated, and normalized into consistent market identifiers and units.",
        points: [
          "Prices are expressed as rupees per quintal (100 kg) and arrivals as metric tonnes in the public contract.",
          "Invalid records are excluded with reason codes; a statistical anomaly can remain published because unusual is not equivalent to incorrect.",
          "Missing values remain nullable and reporting gaps are measured rather than silently interpolated into observed history.",
        ],
      },
      {
        title: "Aggregate, model, and calibrate",
        summary:
          "Variety rows become market-day observations, time-safe features are built, candidate point methods are evaluated, and residual intervals are calibrated.",
        points: [
          "Every forecast target uses an explicit origin date, target date, lead time, and common comparison date.",
          "Selection folds and the locked holdout are chronological; random train/test splits are not used for the published time-series claim.",
          "Forecast point and interval methods are versioned with the history artifact that produced them.",
        ],
      },
      {
        title: "Publish and explain",
        summary:
          "The final export creates a manifest, partitioned market JSON, evidence summaries, checksums, and static routes consumed by the web application.",
        points: [
          "Observed data, forecasts, quality evidence, and definitions are kept separate so the interface can state which claim comes from which layer.",
          "Market pages expose source partitions and detailed tables; high-level charts never replace the downloadable evidence.",
          "Product copy uses qualified language such as represented, prepared, estimate, and empirical coverage to preserve the method's boundaries.",
        ],
      },
    ],
    sources: [
      {
        title: "Primary authority",
        summary: `${manifest.source.provider} publishes the underlying market price and arrival reports through AGMARKNET 2.0.`,
        points: [
          "MandiLens is an independent prepared interface and does not imply government endorsement.",
          "The source catalogue and API URL are preserved in the manifest rather than replaced with an unattributed copy.",
          `The public release currently represents ${common.scope}.`,
        ],
      },
      {
        title: "Retrieval and release identity",
        summary:
          "A release distinguishes the latest source date, the retrieval timestamp, and the application generation timestamp.",
        points: [
          `Source data is represented through ${manifest.meta.dateRange[1]}; it was retrieved at ${manifest.meta.sourceRetrievedAt}.`,
          "Per-partition date ranges reveal when an individual commodity or market ends earlier than the overall dataset.",
          "Checksums allow a consumer to verify that a downloaded partition belongs to the manifest being read.",
        ],
      },
      {
        title: "Licence and attribution",
        summary: `The configured licence is ${manifest.source.license}.`,
        points: [
          "Attribution is required and the source provider is named on source and data pages.",
          "The licence link is published beside the catalogue link so downstream users can inspect the governing terms directly.",
          "Prepared calculations, labels, and forecasts are identified as application outputs rather than source-published facts.",
        ],
      },
      {
        title: "What the source does not prove",
        summary:
          "An official source establishes provenance, not complete coverage, error-free reporting, or suitability for a transaction decision.",
        points: [
          "Markets can report irregularly, varieties can differ, arrivals can be missing, and historical corrections can alter prior values.",
          "A report is a market observation for its stated date; it is not a live executable bid or guaranteed farmer realization.",
          "The application therefore pairs source attribution with validation counts, freshness, consistency, and limitations.",
        ],
      },
    ],
    limitations: [
      {
        title: "Coverage is selective",
        summary:
          "The interface covers represented markets selected by configured activity and reporting criteria; it is not a census of every mandi in a state.",
        points: [
          `Current scope is ${common.scope}.`,
          "A missing state–commodity cell means no published series in this release, not proof that the commodity is never traded there.",
          "Cross-state comparisons can reflect different varieties, grades, market practices, and reporting schedules.",
        ],
      },
      {
        title: "Reported prices are contextual",
        summary:
          "Minimum, maximum, and aggregated representative prices summarize retained source rows for one market day.",
        points: [
          "The representative aggregate is not a statistical mode, a quote, an offer, or a guaranteed transaction value.",
          "Variety-level dispersion can be hidden by one aggregate, so the interface retains a variety count and representative example.",
          "Arrival quantities may be incomplete and are not assumed to be zero when absent.",
        ],
      },
      {
        title: "Forecasts have measurable error",
        summary:
          "The outlook is an evaluated secondary estimate and can be flat when the selected baseline finds no defensible day-specific movement.",
        points: [
          `Locked-holdout MAE is ${formatCurrency(model.selected_metrics.mae, "en")} per quintal and empirical interval coverage is ${formatPercent(model.prediction_interval.empirical_coverage, "en")}.`,
          "Performance varies by commodity, market, volatility, freshness, and horizon; aggregate metrics should not be treated as a local guarantee.",
          "The seven-day outlook is not a recommendation and should not replace current local verification.",
        ],
      },
      {
        title: "Comparison costs are user assumptions",
        summary: "The comparison workspace includes only the quantity and costs the user enters.",
        points: [
          "Transport, commission, handling, taxes, grade, quality, spoilage, payment timing, and counterparty risk are not inferred.",
          "A highest estimated amount is a mathematical result under the entered assumptions, not a recommendation to sell in that market.",
          "Different target dates are not ranked together because that would combine market and time effects into one misleading result.",
        ],
      },
    ],
    architecture: [
      {
        title: "Data preparation layer",
        summary:
          "A Python pipeline retrieves, validates, normalizes, aggregates, evaluates, forecasts, and exports versioned artifacts.",
        points: [
          "Columnar Parquet files retain full prepared history and evaluation outputs efficiently.",
          "The model bundle, report JSON, human-readable reports, data-quality ledger, and public manifest are generated from the same run.",
          "Pipeline stages fail when required training or forecast rows are absent instead of publishing an empty success state.",
        ],
      },
      {
        title: "Published data contract",
        summary:
          "The web layer consumes one compact manifest plus state-and-commodity JSON partitions rather than downloading the entire history on every route.",
        points: [
          "Each partition declares market, observation, forecast, and seasonal records with its date range, byte size, and checksum.",
          "Stable slugs and market identifiers make routes shareable while visible labels preserve the official market names.",
          "Observed records and forecasts remain separate types so an estimate cannot silently replace a source observation.",
        ],
      },
      {
        title: "Application layer",
        summary:
          "Next.js renders crawlable route content while focused client components handle filters, comparison state, copying, and downloads.",
        points: [
          "Market and technical pages read prepared artifacts on the server; browser-side filtering operates on the published catalogue.",
          "URL parameters preserve market filters, selected comparisons, dates, quantities, and cost methods for reproducible shared views.",
          "Charts include text descriptions and expandable tables so visual summaries are not the only way to inspect values.",
        ],
      },
      {
        title: "Operational and trust boundaries",
        summary:
          "The static release design favors reviewable artifacts, deterministic builds, and low runtime complexity.",
        points: [
          "A new data refresh changes the generated manifest and partitions; the UI does not mutate source history at runtime.",
          "Language routes reuse the same numerical contract so translation cannot change prices, dates, or evidence counts.",
          "Deployment readiness depends on passing pipeline tests, application tests, type checks, lint, and a production build against the published artifacts.",
        ],
      },
    ],
  };
  return reports[kind];
}

function DataQualityEvidence({
  locale,
  manifest,
  current,
  dictionary,
}: {
  locale: Locale;
  manifest: Manifest;
  current: ValidationSummary;
  dictionary: Dictionary;
}) {
  const accepted = current.accepted_variety_records ?? current.accepted_records ?? 0;
  const published = manifest.qualitySummary.published;
  return (
    <>
      <section className="evidence-metrics">
        <EvidenceMetric
          label={dictionary.data.sourceRows}
          value={formatCompact(current.input_records, locale)}
        />
        <EvidenceMetric
          label={dictionary.data.acceptedRows}
          value={formatCompact(accepted, locale)}
          tone="green"
        />
        <EvidenceMetric
          label={dictionary.data.rejectedRows}
          value={formatNumber(current.excluded_records, locale, 0)}
          tone="orange"
        />
        <EvidenceMetric
          label={dictionary.home.preparedObservations}
          value={formatCompact(published.records, locale)}
          tone="yellow"
        />
        <EvidenceMetric
          label={dictionary.common.stale}
          value={formatNumber(published.stale_series, locale, 0)}
        />
        <EvidenceMetric
          label={dictionary.detail.anomaly}
          value={formatNumber(published.anomaly_records, locale, 0)}
        />
      </section>
      <section className="evidence-table-card">
        <div>
          <p className="kicker">{dictionary.data.rejectedRows}</p>
          <h2>{dictionary.info.dataQuality.title}</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{dictionary.data.rejectedRows}</th>
                <th>{dictionary.data.sourceRows}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(current.exclusion_reasons ?? {}).map(([reason, count]) => (
                <tr key={reason}>
                  <td>{reason.replaceAll("_", " ")}</td>
                  <td>{formatNumber(Number(count), locale, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ForecastEvidence({
  locale,
  evidence,
  dictionary,
}: {
  locale: Locale;
  evidence: Evidence;
  dictionary: Dictionary;
}) {
  const model = evidence.model;
  return (
    <>
      <section className="evidence-metrics">
        <EvidenceMetric
          label={dictionary.detail.reliability}
          value={model.selected_label}
          tone="green"
        />
        <EvidenceMetric label="MAE" value={formatCurrency(model.selected_metrics.mae, locale)} />
        <EvidenceMetric label="WAPE" value={formatPercent(model.selected_metrics.wape, locale)} />
        <EvidenceMetric
          label={dictionary.data.trainingExamples}
          value={formatCompact(model.selected_metrics.n, locale)}
        />
        <EvidenceMetric
          label={dictionary.detail.expectedRange}
          value={formatPercent(model.prediction_interval.empirical_coverage, locale)}
          tone="yellow"
        />
        <EvidenceMetric
          label={dictionary.detail.reliability}
          value={formatPercent(model.prediction_interval.nominal_coverage, locale)}
        />
      </section>
      <section className="evidence-table-card">
        <div>
          <p className="kicker">{dictionary.info.forecastReliability.points[0]}</p>
          <h2>{dictionary.info.forecastReliability.title}</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>MAE</th>
                <th>WAPE</th>
                <th>sMAPE</th>
                <th>n</th>
              </tr>
            </thead>
            <tbody>
              {model.selection_method_comparison.map((metric) => (
                <tr
                  key={metric.method}
                  className={metric.method === model.selected_method ? "is-selected" : ""}
                >
                  <td>
                    <strong>{metric.label}</strong>
                    {metric.method === model.selected_method ? <span>Selected</span> : null}
                  </td>
                  <td>{formatCurrency(metric.mae, locale)}</td>
                  <td>{formatPercent(metric.wape, locale)}</td>
                  <td>{formatPercent(metric.smape, locale)}</td>
                  <td>{formatNumber(metric.n, locale, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="evidence-note">
          {dictionary.info.forecastReliability.points[2]} {dictionary.common.notAdvice}
        </p>
      </section>
    </>
  );
}

function MethodEvidence({ dictionary }: { dictionary: Dictionary }) {
  return (
    <section className="method-cards">
      {[
        [dictionary.home.glossary[3].title, dictionary.home.glossary[3].body],
        [dictionary.home.glossary[8].title, dictionary.home.glossary[8].body],
        [dictionary.detail.expectedRange, dictionary.detail.reliabilityBody],
        [dictionary.compare.estimatedAmount, dictionary.compare.costsNote],
        [dictionary.detail.anomaly, dictionary.info.dataQuality.points[2]],
      ].map(([title, body], index) => (
        <article key={title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h2>{title}</h2>
          <p>{body}</p>
        </article>
      ))}
    </section>
  );
}

function SourceEvidence({
  locale,
  manifest,
  current,
  dictionary,
}: {
  locale: Locale;
  manifest: Manifest;
  current: ValidationSummary;
  dictionary: Dictionary;
}) {
  return (
    <>
      <section className="source-authority">
        <ShieldCheck aria-hidden="true" />
        <div>
          <p className="kicker">{dictionary.common.officialSource}</p>
          <h2>{manifest.source.name}</h2>
          <p>{manifest.source.provider}</p>
        </div>
        <div>
          <a
            className="button button--primary"
            href={manifest.source.catalogUrl}
            target="_blank"
            rel="noreferrer"
          >
            {dictionary.common.officialSource}
            <ExternalLink size={15} />
          </a>
          <a href={manifest.source.licenseUrl} target="_blank" rel="noreferrer">
            {manifest.source.license}
            <ExternalLink size={13} />
          </a>
        </div>
      </section>
      <section className="source-facts">
        <div>
          <span>{dictionary.data.coverageTitle}</span>
          <strong>{manifest.meta.states.map((state) => state.name).join(", ")}</strong>
        </div>
        <div>
          <span>{dictionary.home.coveredCommodities}</span>
          <strong>{manifest.meta.commodities.join(", ")}</strong>
        </div>
        <div>
          <span>{dictionary.common.sourceThrough}</span>
          <strong>{formatDate(manifest.meta.dateRange[1], locale)}</strong>
        </div>
        <div>
          <span>{dictionary.data.sourceRows}</span>
          <strong>{formatNumber(current.source_file_count, locale, 0)}</strong>
        </div>
      </section>
    </>
  );
}

function LimitationEvidence({
  locale,
  manifest,
  catalog,
  dictionary,
}: {
  locale: Locale;
  manifest: Manifest;
  catalog: Catalog;
  dictionary: Dictionary;
}) {
  return (
    <section className="limitation-grid">
      <article>
        <span className="limitation-index">01</span>
        <h2>{dictionary.data.coverageTitle}</h2>
        <p>{dictionary.home.browseStatesBody}</p>
        <strong>
          {formatNumber(manifest.meta.states.length, locale, 0)} ·{" "}
          {formatNumber(catalog.districts.length, locale, 0)} ·{" "}
          {formatNumber(manifest.meta.markets, locale, 0)}
        </strong>
      </article>
      <article>
        <span className="limitation-index">02</span>
        <h2>{dictionary.data.varietyLimit}</h2>
        <p>{dictionary.detail.varietiesNote}</p>
        <strong>
          {formatNumber(catalog.varietyExamples.length, locale, 0)} {dictionary.detail.varieties}
        </strong>
      </article>
      <article>
        <span className="limitation-index">03</span>
        <h2>{dictionary.detail.outlookTitle}</h2>
        <p>{dictionary.detail.reliabilityBody}</p>
        <strong>
          {formatPercent(manifest.modelSummary.predictionInterval.empirical_coverage, locale)}
        </strong>
      </article>
    </section>
  );
}

function ArchitectureEvidence({ dictionary }: { dictionary: Dictionary }) {
  const stages = [
    { title: "AGMARKNET 2.0", body: dictionary.how.steps[0].body },
    dictionary.how.steps[1],
    dictionary.how.steps[3],
    dictionary.how.steps[5],
    dictionary.how.steps[6],
    { title: "Next.js", body: dictionary.how.cards[4].body },
  ];
  return (
    <ol className="architecture-flow" aria-label={dictionary.info.architecture.title}>
      {stages.map((stage, index) => (
        <li key={stage.title}>
          <span>{index + 1}</span>
          <strong>{stage.title}</strong>
          <small>{stage.body}</small>
          {index < stages.length - 1 ? (
            <span className="architecture-flow__connector" aria-hidden="true">
              <ArrowRight />
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function EvidenceMetric({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={`evidence-metric evidence-metric--${tone}`}>
      <strong>{value}</strong>
      <span>
        <i aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
