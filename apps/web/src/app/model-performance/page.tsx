import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, FlaskConical, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { getMandiData } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Model performance",
  description:
    "Chronological validation, baseline comparisons, uncertainty coverage, and segmented forecast errors.",
};

export default async function ModelPerformancePage() {
  const data = await getMandiData();
  const model = data.model;
  const bestBaseline = model.method_comparison
    .filter((item) => item.method !== "hist_gradient_boosting")
    .sort((left, right) => left.mae - right.mae)[0];
  const treeSelected = model.selected_method === "hist_gradient_boosting";
  const improvement = bestBaseline ? 1 - model.selected_metrics.mae / bestBaseline.mae : 0;
  const maximumImportance = Math.max(1, ...model.feature_importance.map((item) => item.importance));

  return (
    <div className="content-page">
      <PageIntro
        eyebrow="Model evidence"
        title={
          treeSelected
            ? "The tree cleared a deliberately high bar—barely."
            : "The tree model lost. The baseline earned production."
        }
        summary={
          treeSelected
            ? `Four methods were evaluated on future-only windows. The tree reduced MAE by ${formatPercent(improvement, 2)} versus ${bestBaseline.label?.toLowerCase()}, narrowly clearing the preset 1% complexity threshold.`
            : `Four methods were evaluated on future-only windows. Complexity had to reduce MAE by at least 1% versus the strongest baseline; it did not, so ${model.selected_label.toLowerCase()} is published.`
        }
        aside={
          <div className="intro-stamp intro-stamp--coral">
            <span>Selected method</span>
            <strong>{model.selected_label}</strong>
            <small>Version {data.modelMetadata.model_version}</small>
          </div>
        }
      />

      <section className="metric-ribbon" aria-label="Selected performance">
        <div>
          <span>MAE</span>
          <strong>{formatCurrency(model.selected_metrics.mae)}</strong>
          <small>Per quintal</small>
        </div>
        <div>
          <span>WAPE</span>
          <strong>{formatPercent(model.selected_metrics.wape)}</strong>
          <small>Weighted absolute error</small>
        </div>
        <div>
          <span>Directional accuracy</span>
          <strong>{formatPercent(model.selected_metrics.directional_accuracy)}</strong>
          <small>Up / down / unchanged</small>
        </div>
        <div>
          <span>Evaluation sample</span>
          <strong>{model.selected_metrics.n.toLocaleString("en-IN")}</strong>
          <small>Future forecasts</small>
        </div>
      </section>

      <section className="table-section" aria-labelledby="comparison-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Head-to-head</p>
            <h2 id="comparison-heading">Every required baseline versus the tree</h2>
          </div>
          <p>Lower error is better. Sample sizes are identical.</p>
        </div>
        <div className="table-scroll" tabIndex={0}>
          <table className="evidence-table evidence-table--model">
            <thead>
              <tr>
                <th>Method</th>
                <th>Status</th>
                <th>MAE</th>
                <th>WAPE</th>
                <th>sMAPE</th>
                <th>Directional accuracy</th>
                <th>n</th>
              </tr>
            </thead>
            <tbody>
              {model.method_comparison.map((metric) => {
                const selected = metric.method === model.selected_method;
                return (
                  <tr key={metric.method} className={selected ? "is-selected" : ""}>
                    <td>
                      <strong>{metric.label}</strong>
                      <small>
                        {metric.method === "hist_gradient_boosting" ? "Tree candidate" : "Baseline"}
                      </small>
                    </td>
                    <td>
                      {selected ? (
                        <span className="badge badge--good">
                          <CheckCircle2 size={13} /> Selected
                        </span>
                      ) : (
                        <span className="badge">Evaluated</span>
                      )}
                    </td>
                    <td>{formatCurrency(metric.mae)}</td>
                    <td>{formatPercent(metric.wape)}</td>
                    <td>{formatPercent(metric.smape)}</td>
                    <td>{formatPercent(metric.directional_accuracy)}</td>
                    <td>{metric.n.toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="content-grid">
        <section className="content-card content-card--wide">
          <p className="eyebrow">Rolling-origin validation</p>
          <h2>Training always stops before the scored future</h2>
          <div className="fold-timeline">
            {model.rolling_folds.map((fold) => (
              <div key={fold.fold_index}>
                <span>Fold {fold.fold_index + 1}</span>
                <strong>
                  {formatDate(fold.test_start)} → {formatDate(fold.test_end_exclusive)}
                </strong>
                <small>
                  {fold.training_rows.toLocaleString("en-IN")} train ·{" "}
                  {fold.test_rows.toLocaleString("en-IN")} test
                </small>
              </div>
            ))}
          </div>
          <p className="content-note">
            Lags and rolling statistics are computed as of each forecast origin. Dates without a
            source report are not scored as zero-valued outcomes.
          </p>
        </section>

        <section className="content-card content-card--accent">
          <FlaskConical aria-hidden="true" />
          <p className="eyebrow">Uncertainty check</p>
          <h2>{formatPercent(model.prediction_interval.empirical_coverage)}</h2>
          <p>
            Empirical coverage across {model.prediction_interval.n.toLocaleString("en-IN")}{" "}
            later-fold forecasts for an interval targeting{" "}
            {formatPercent(model.prediction_interval.nominal_coverage)}.
          </p>
          <small>Conservative coverage is not a guarantee of future calibration.</small>
        </section>
      </div>

      <section className="segment-section">
        <div>
          <p className="eyebrow">Error segmentation</p>
          <h2>Performance changes by commodity and horizon</h2>
        </div>
        <div className="segment-columns">
          <div>
            <h3>By commodity</h3>
            {model.performance_by_commodity.map((metric) => (
              <div className="metric-bar" key={metric.segment}>
                <span>{metric.segment}</span>
                <i style={{ width: `${Math.min(100, metric.wape * 330)}%` }} />
                <strong>{formatPercent(metric.wape)} WAPE</strong>
                <small>
                  {formatCurrency(metric.mae)} MAE · n={metric.n.toLocaleString("en-IN")}
                </small>
              </div>
            ))}
          </div>
          <div>
            <h3>By day ahead</h3>
            {model.performance_by_horizon.map((metric) => (
              <div className="horizon-row" key={metric.segment}>
                <span>Day {metric.segment}</span>
                <strong>{formatCurrency(metric.mae)}</strong>
                <small>
                  {formatPercent(metric.wape)} WAPE · n={metric.n.toLocaleString("en-IN")}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      {model.feature_importance.length > 0 ? (
        <section className="importance-section">
          <div>
            <p className="eyebrow">Permutation importance</p>
            <h2>Recent prices carry most of the predictive load</h2>
            <p>
              Importance is the increase in absolute error after shuffling one input. It describes
              model reliance, not cause and effect.
            </p>
          </div>
          <div className="importance-list">
            {model.feature_importance.slice(0, 10).map((item) => (
              <div key={item.feature}>
                <span>{item.feature.replaceAll("_", " ")}</span>
                <i style={{ width: `${(item.importance / maximumImportance) * 100}%` }} />
                <strong>+{formatCurrency(item.importance)} MAE</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="notice notice--amber">
        <TriangleAlert aria-hidden="true" />
        <div>
          <strong>Do not overread directional accuracy.</strong> It measures whether the predicted
          direction from the origin matches the reported outcome. The last-observation baseline
          predicts “unchanged,” which explains its low directional score despite competitive
          absolute error.
        </div>
      </section>

      <div className="next-link-panel">
        <div>
          <span>Next</span>
          <strong>See how features, aggregation, and interval calibration work.</strong>
        </div>
        <Link href="/methodology">
          Open methodology <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
