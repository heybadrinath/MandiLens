import type { Metadata } from "next";
import { Check, FileWarning, ScanLine, ShieldCheck } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { formatDate, formatPercent } from "@/lib/format";
import { getMandiData } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Data quality",
  description: "Measured validation, exclusions, coverage, freshness, and known gaps in MandiLens.",
};

export default async function DataQualityPage() {
  const data = await getMandiData();
  const { validation, published } = data.quality;
  const acceptanceRate = validation.accepted_variety_records / validation.input_records;

  return (
    <div className="content-page">
      <PageIntro
        eyebrow="Data quality"
        title="Every rejection has a reason. Every gap stays a gap."
        summary="Mandi reports are irregular operational data, not a clean daily price feed. The pipeline preserves source responses, applies explicit invariants, and reports what changed or was excluded."
        aside={
          <div className="intro-stamp">
            <span>Snapshot through</span>
            <strong>{formatDate(published.date_max)}</strong>
            <small>{validation.source_file_count} monthly source files</small>
          </div>
        }
      />

      <section className="metric-ribbon" aria-label="Validation results">
        <div>
          <span>Source rows</span>
          <strong>{validation.input_records.toLocaleString("en-IN")}</strong>
          <small>Variety-level reports</small>
        </div>
        <div>
          <span>Accepted</span>
          <strong>{formatPercent(acceptanceRate, 2)}</strong>
          <small>{validation.accepted_variety_records.toLocaleString("en-IN")} rows</small>
        </div>
        <div>
          <span>Excluded</span>
          <strong>{validation.excluded_records}</strong>
          <small>Never silently dropped</small>
        </div>
        <div>
          <span>Published</span>
          <strong>{published.records.toLocaleString("en-IN")}</strong>
          <small>Market-day aggregates</small>
        </div>
      </section>

      <div className="content-grid">
        <section className="content-card content-card--wide">
          <p className="eyebrow">Validation ledger</p>
          <h2>What the pipeline found</h2>
          <div className="finding-grid">
            <div className="finding finding--good">
              <Check aria-hidden="true" />
              <span>
                <strong>{validation.unresolved_market_references}</strong>
                <small>unresolved market references</small>
              </span>
            </div>
            <div className="finding finding--good">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>{published.stale_series}</strong>
                <small>stale selected series</small>
              </span>
            </div>
            <div className="finding finding--warn">
              <FileWarning aria-hidden="true" />
              <span>
                <strong>{validation.exclusion_reasons.exact_duplicate ?? 0}</strong>
                <small>exact duplicates excluded</small>
              </span>
            </div>
            <div className="finding finding--warn">
              <ScanLine aria-hidden="true" />
              <span>
                <strong>{published.anomaly_records.toLocaleString("en-IN")}</strong>
                <small>unusual market-days flagged</small>
              </span>
            </div>
          </div>
          <p className="content-note">
            The remaining excluded row exceeded the ₹2,50,000 per-quintal safety ceiling. Anomaly
            flags stay in the published history because unusual does not automatically mean wrong.
          </p>
        </section>

        <section className="content-card">
          <p className="eyebrow">Corrections</p>
          <h2>
            {validation.corrected_records.toLocaleString("en-IN")} display-name normalizations
          </h2>
          <p>
            Capitalization and spacing in market names were standardized for stable display and
            matching. Prices were not overwritten to make them look cleaner.
          </p>
        </section>
      </div>

      <section className="prose-section">
        <div>
          <p className="eyebrow">Automated guardrails</p>
          <h2>Checks before a row can enter the analytical layer</h2>
        </div>
        <ol className="guardrail-list">
          <li>
            <span>01</span>
            <div>
              <strong>Identity and schema</strong>
              <p>
                Required market, commodity, district reference, date, and numeric price fields must
                parse.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Price semantics</strong>
              <p>
                Prices must be positive and ordered minimum ≤ modal ≤ maximum, with a documented
                extreme ceiling.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Duplicate control</strong>
              <p>
                Exact market, commodity, variety, date, and price duplicates are retained in the
                rejection ledger.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Series fitness</strong>
              <p>
                Market selection uses recent weekly reporting, record count, and last-report age—not
                name recognition.
              </p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <strong>Anomaly context</strong>
              <p>
                A trailing robust median and deviation score marks unusual prices without deleting
                valid shocks.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="table-section" aria-labelledby="coverage-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Published scope</p>
            <h2 id="coverage-heading">Selected market series</h2>
          </div>
          <p>
            {published.series} series · {published.markets} distinct markets ·{" "}
            {published.commodities.join(", ")}
          </p>
        </div>
        <div className="table-scroll" tabIndex={0} aria-label="Scrollable market coverage table">
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Commodity</th>
                <th>Market</th>
                <th>District</th>
                <th>Recent rows</th>
                <th>Weekly coverage</th>
                <th>Last report</th>
                <th>Maximum gap</th>
              </tr>
            </thead>
            <tbody>
              {data.markets.map((market) => (
                <tr key={`${market.commodity}-${market.market_id}`}>
                  <td>
                    <span
                      className="commodity-dot"
                      data-commodity={market.commodity.toLowerCase()}
                    />
                    {market.commodity}
                  </td>
                  <td>
                    <strong>{market.market}</strong>
                  </td>
                  <td>{market.district}</td>
                  <td>{market.record_count.toLocaleString("en-IN")}</td>
                  <td>{formatPercent(market.weekly_coverage)}</td>
                  <td>{formatDate(market.last_date)}</td>
                  <td>{market.maximum_gap_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="notice notice--blue">
        <ScanLine aria-hidden="true" />
        <div>
          <strong>Interpret coverage carefully.</strong> It means at least one report appeared in
          each recent week for the selected series. It does not prove daily trading, and missing
          reports are never converted into ₹0 prices.
        </div>
      </section>
    </div>
  );
}
