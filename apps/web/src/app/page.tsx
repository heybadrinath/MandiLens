import { ArrowDown, ArrowRight, Database, Gauge, IndianRupee, ScanSearch } from "lucide-react";
import Link from "next/link";

import { MarketDashboard } from "@/components/market-dashboard";
import { formatCompact, formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { getMandiData } from "@/lib/server-data";

export default async function Home() {
  const data = await getMandiData();
  const bestBaseline = data.model.method_comparison
    .filter((item) => item.method !== "hist_gradient_boosting")
    .sort((left, right) => left.mae - right.mae)[0];
  const treeSelected = data.model.selected_method === "hist_gradient_boosting";
  const treeImprovement = bestBaseline ? 1 - data.model.selected_metrics.mae / bestBaseline.mae : 0;

  return (
    <>
      <section className="hero">
        <div className="hero__content">
          <div className="hero__copy">
            <div className="hero__eyebrow">
              <span>Official AGMARKNET observations</span>
              <span aria-hidden="true">/</span>
              <span>Updated {formatDate(data.meta.dateRange[1])}</span>
            </div>
            <h1>
              See the range.
              <br />
              Count the cost.
              <br />
              <em>Choose with context.</em>
            </h1>
            <p>
              MandiLens turns noisy Maharashtra wholesale reports into comparable market evidence,
              seven-day price ranges, and a transparent net-realization estimate using costs you
              control.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#market-lens">
                Open market lens <ArrowDown size={17} aria-hidden="true" />
              </a>
              <Link className="text-link" href="/methodology">
                Inspect the method <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="hero__trust">
              <span>
                <span className="live-dot" aria-hidden="true" /> No synthetic prices
              </span>
              <span>No login</span>
              <span>No hidden transport rate</span>
            </div>
          </div>

          <div
            className="hero-lens"
            aria-label="Illustration of an observed price range becoming a forecast interval"
          >
            <div className="hero-lens__header">
              <span>Market range / decision lens</span>
              <span>Maharashtra</span>
            </div>
            <div className="hero-lens__crop">
              <span className="crop-initial">O</span>
              <span>
                <strong>Onion</strong>
                <small>Selected example</small>
              </span>
              <span className="badge badge--good">High coverage</span>
            </div>
            <div className="hero-lens__range">
              <div className="hero-lens__range-label">
                <span>Observed</span>
                <strong>min · modal · max</strong>
              </div>
              <div className="hero-lens__track hero-lens__track--observed">
                <i />
                <i />
                <i />
              </div>
              <div className="hero-lens__range-label">
                <span>Prepared</span>
                <strong>80% interval</strong>
              </div>
              <div className="hero-lens__track hero-lens__track--forecast">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="hero-lens__equation">
              <span>forecast × quantity</span>
              <b>−</b>
              <span>your market cost</span>
              <b>=</b>
              <strong>estimated net</strong>
            </div>
            <div className="hero-lens__foot">
              <span>
                <ScanSearch size={15} /> uncertainty visible
              </span>
              <span>not a promised price</span>
            </div>
          </div>
        </div>
        <div className="hero-stats" aria-label="Project evidence summary">
          <div>
            <Database aria-hidden="true" />
            <span>
              <strong>{formatCompact(data.quality.validation.input_records)}</strong>
              <small>source rows validated</small>
            </span>
          </div>
          <div>
            <Gauge aria-hidden="true" />
            <span>
              <strong>{data.meta.series}</strong>
              <small>covered market series</small>
            </span>
          </div>
          <div>
            <ScanSearch aria-hidden="true" />
            <span>
              <strong>{data.meta.forecastHorizonDays} days</strong>
              <small>forecast range</small>
            </span>
          </div>
          <div>
            <IndianRupee aria-hidden="true" />
            <span>
              <strong>₹0</strong>
              <small>operating cost</small>
            </span>
          </div>
        </div>
      </section>

      <section className="problem-strip">
        <div>
          <p className="eyebrow">Why this exists</p>
          <h2>The highest board price is not automatically the best selling option.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <strong>Observe</strong>
            <p>Separate official min, modal, and max reports from missing days and anomalies.</p>
          </li>
          <li>
            <span>02</span>
            <strong>Estimate</strong>
            <p>Show a short-term range and publish how the method performed out of time.</p>
          </li>
          <li>
            <span>03</span>
            <strong>Decide</strong>
            <p>Subtract market-specific costs supplied by the user—never a made-up rate.</p>
          </li>
        </ol>
      </section>

      <MarketDashboard />

      <section className="method-preview">
        <div>
          <p className="eyebrow">Evidence, not model theatre</p>
          <h2>
            {treeSelected
              ? `The tree cleared the bar—by ${formatPercent(treeImprovement, 2)}, not by a landslide.`
              : "The simpler method won. So the simpler method ships."}
          </h2>
          <p>
            {treeSelected
              ? `Global histogram gradient boosting was evaluated against three baselines on four chronological windows. It reduced MAE from ${formatCurrency(bestBaseline.mae)} for the strongest baseline to ${formatCurrency(data.model.selected_metrics.mae)}, narrowly exceeding the preset 1% complexity threshold.`
              : `A tree model was evaluated against three baselines on four chronological windows. It did not earn the preset 1% improvement, so MandiLens publishes ${data.model.selected_label.toLowerCase()} and says so plainly.`}
          </p>
          <Link className="button button--light" href="/model-performance">
            Review all results <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <dl>
          <div>
            <dt>Selected MAE</dt>
            <dd>{formatCurrency(data.model.selected_metrics.mae)}</dd>
          </div>
          <div>
            <dt>Selected WAPE</dt>
            <dd>{formatPercent(data.model.selected_metrics.wape)}</dd>
          </div>
          <div>
            <dt>Evaluation forecasts</dt>
            <dd>{data.model.selected_metrics.n.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Empirical interval coverage</dt>
            <dd>{formatPercent(data.model.prediction_interval.empirical_coverage)}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
