import type { Metadata } from "next";
import {
  ArrowRight,
  Boxes,
  Braces,
  CalendarClock,
  DatabaseZap,
  Layers3,
  Scale,
} from "lucide-react";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "The batch architecture, transformations, leakage controls, forecasting, and market-ranking formula behind MandiLens.",
};

export default function MethodologyPage() {
  return (
    <div className="content-page">
      <PageIntro
        eyebrow="Methodology"
        title="A batch-first system with fewer moving parts—and clearer evidence."
        summary="Official monthly responses are cached and checksummed, transformed into compact Parquet, evaluated out of time, and exported as one static application artifact. The browser never runs the training model."
        aside={
          <div className="intro-stamp">
            <span>Production boundary</span>
            <strong>Static forecasts</strong>
            <small>No request-time ML service</small>
          </div>
        }
      />

      <section className="architecture-flow" aria-label="Architecture flow">
        <div>
          <DatabaseZap aria-hidden="true" />
          <span>01</span>
          <strong>Official source</strong>
          <small>AGMARKNET 2.0</small>
        </div>
        <ArrowRight className="flow-arrow" aria-hidden="true" />
        <div>
          <Braces aria-hidden="true" />
          <span>02</span>
          <strong>Python pipeline</strong>
          <small>Validate · aggregate</small>
        </div>
        <ArrowRight className="flow-arrow" aria-hidden="true" />
        <div>
          <CalendarClock aria-hidden="true" />
          <span>03</span>
          <strong>Evaluation</strong>
          <small>Rolling-origin folds</small>
        </div>
        <ArrowRight className="flow-arrow" aria-hidden="true" />
        <div>
          <Layers3 aria-hidden="true" />
          <span>04</span>
          <strong>Static artifact</strong>
          <small>History · forecasts</small>
        </div>
        <ArrowRight className="flow-arrow" aria-hidden="true" />
        <div>
          <Scale aria-hidden="true" />
          <span>05</span>
          <strong>Browser ranking</strong>
          <small>Your cost assumptions</small>
        </div>
      </section>

      <section className="prose-section prose-section--split">
        <div>
          <p className="eyebrow">Data path</p>
          <h2>From variety reports to a stable market-day unit</h2>
        </div>
        <div className="prose-copy">
          <p>
            Each official response is stored by commodity, year, and month with a source manifest
            and SHA-256 checksum. Reruns skip valid cached files; scheduled refreshes revisit only
            recent months.
          </p>
          <p>
            Rows pass identity, date, numeric, positivity, ordering, duplicate, arrival, and
            extreme-value checks. Accepted varieties are aggregated to one commodity-market-day:
            minimum of source minima, maximum of source maxima, and an arrival-weighted modal price
            when arrival weights exist (otherwise the median modal price).
          </p>
          <p>
            Variety information remains visible as context, but it is not offered as a filter
            because coverage and naming are not consistently reliable across all selected series.
          </p>
        </div>
      </section>

      <section className="method-grid">
        <article>
          <span>Features</span>
          <h3>Only information available at the forecast origin</h3>
          <p>
            As-of lags, rolling means and medians, rolling deviation, momentum, spread, arrivals,
            freshness, reporting frequency, calendar fields, market, district, commodity, and
            coverage tier.
          </p>
        </article>
        <article>
          <span>Targets</span>
          <h3>Observed future reports, not filled calendar rows</h3>
          <p>
            One-to-seven-day targets are created only where an actual future report exists. Missing
            reporting days do not become a price of zero and are not forward-filled as ground truth.
          </p>
        </article>
        <article>
          <span>Selection</span>
          <h3>A complexity threshold protects the production choice</h3>
          <p>
            The tree candidate must reduce pooled rolling-origin MAE by at least 1% versus the best
            simple baseline. If it cannot, the baseline wins.
          </p>
        </article>
        <article>
          <span>Intervals</span>
          <h3>Earlier errors calibrate later ranges</h3>
          <p>
            Commodity-and-horizon absolute-error quantiles build an empirical 80% interval. Later
            folds use only residuals from earlier folds when checking coverage.
          </p>
        </article>
      </section>

      <section className="decision-formula">
        <div>
          <Boxes aria-hidden="true" />
          <p className="eyebrow">Decision layer</p>
          <h2>Market ranking is a calculation, not another model.</h2>
        </div>
        <div className="decision-formula__math">
          <span>forecast price ₹/q</span>
          <b>×</b>
          <span>quantity q</span>
          <b>−</b>
          <span>user cost ₹</span>
          <b>=</b>
          <strong>estimated net ₹</strong>
        </div>
        <ul>
          <li>Quantity converts from kilograms, quintals, or metric tonnes.</li>
          <li>Cost can be entered as a total, per quintal, or per tonne for each market.</li>
          <li>The forecast low and high values produce a corresponding net range.</li>
          <li>
            No distance, route, vehicle, toll, loading, commission, or spoilage value is invented.
          </li>
        </ul>
      </section>

      <section className="choice-table">
        <div>
          <p className="eyebrow">Architecture decisions</p>
          <h2>What was deliberately omitted</h2>
        </div>
        <dl>
          <div>
            <dt>FastAPI</dt>
            <dd>
              Request-time inference adds cost, latency, cold starts, and another failure boundary
              without changing these precomputed weekly decisions.
            </dd>
          </div>
          <div>
            <dt>PostgreSQL / auth</dt>
            <dd>
              The MVP has no accounts, saved watchlists, or transactional state. Static analytical
              artifacts are the simpler fit.
            </dd>
          </div>
          <div>
            <dt>Maps / distance</dt>
            <dd>
              Reliable coordinates and route-specific costs were not established across the chosen
              markets, so the UI asks for actual user costs.
            </dd>
          </div>
          <div>
            <dt>Weather</dt>
            <dd>
              No measured validation gain justified an additional external dependency in this
              release.
            </dd>
          </div>
          <div>
            <dt>Deep learning</dt>
            <dd>
              The selected tree only narrowly improved on a strong baseline. No evidence justified
              the added data, tuning, and maintenance burden of a larger model.
            </dd>
          </div>
        </dl>
      </section>

      <div className="next-link-panel">
        <div>
          <span>Audit the inputs</span>
          <strong>Review provenance, licensing, and attribution.</strong>
        </div>
        <Link href="/sources">
          Open sources <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
