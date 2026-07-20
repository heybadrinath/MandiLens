import type { Metadata } from "next";
import { CircleOff, CloudSun, MapPinned, ReceiptIndianRupee, TriangleAlert } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { formatPercent } from "@/lib/format";
import { getMandiData } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Limitations",
  description:
    "Responsible-use boundaries and missing information in MandiLens forecasts and net estimates.",
};

const limitations = [
  {
    icon: MapPinned,
    title: "No route or distance estimate",
    text: "Market coordinates, route conditions, vehicle capacity, and trip origin were not validated consistently. Enter the transport amount you actually expect.",
  },
  {
    icon: ReceiptIndianRupee,
    title: "Net is not profit",
    text: "Commission, loading, unloading, tolls, labour, spoilage, taxes, quality deductions, and payment timing are not included unless you fold them into your entered cost.",
  },
  {
    icon: CloudSun,
    title: "No weather claim",
    text: "Weather enrichment was omitted because no measured validation improvement justified the dependency. The model does not claim weather-driven causation.",
  },
  {
    icon: CircleOff,
    title: "Missing report ≠ no trade",
    text: "AGMARKNET reporting is irregular. Blank dates remain unknown, and the selected markets may differ from less consistently reported markets.",
  },
];

export default async function LimitationsPage() {
  const data = await getMandiData();
  const selected = data.model.selected_label;
  const coverage = data.model.prediction_interval.empirical_coverage;
  const target = data.model.prediction_interval.nominal_coverage;

  return (
    <div className="content-page">
      <PageIntro
        eyebrow="Responsible use"
        title="A range is not a promise. A ranking is not an instruction."
        summary="MandiLens organizes public information for comparison. It cannot observe lot quality, live bids, individual contracts, road conditions, or the full cost of a sale. Confirm decisions with current market and transport information."
        aside={
          <div className="intro-stamp intro-stamp--coral">
            <span>Intended use</span>
            <strong>Decision support</strong>
            <small>Not financial advice</small>
          </div>
        }
      />

      <section className="limitation-grid">
        {limitations.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon aria-hidden="true" />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="prose-section prose-section--split">
        <div>
          <p className="eyebrow">Forecast boundaries</p>
          <h2>What can make future error different</h2>
        </div>
        <div className="prose-copy">
          <p>
            Supply shocks, market closures, festivals, policy changes, crop disease, sudden weather,
            source revisions, and thin reporting can move prices outside the displayed empirical
            interval.
          </p>
          <p>
            The selected {selected.toLowerCase()} performed best on pooled chronological MAE by only
            a small margin. Its competitive result does not prove that market prices are easy to
            predict.
          </p>
          <p>
            The reported {formatPercent(coverage)} interval coverage exceeded the{" "}
            {formatPercent(target)} target on later evaluation folds. That makes the historical
            interval conservative in those samples; it does not guarantee {formatPercent(coverage)}
            coverage after deployment.
          </p>
        </div>
      </section>

      <section className="prose-section prose-section--split">
        <div>
          <p className="eyebrow">Representation boundaries</p>
          <h2>Selection and aggregation change what the data means</h2>
        </div>
        <div className="prose-copy">
          <p>
            Only seven recently active, weekly covered series per commodity are published. Results
            describe this Maharashtra subset and should not be generalized to every Indian mandi.
          </p>
          <p>
            Market-day prices aggregate varieties for stability. The result is useful for broad
            comparison but may not match the price of a specific grade, lot, packaging type, or
            negotiated transaction.
          </p>
          <p>
            An anomaly flag means statistically unusual relative to recent history. It is neither a
            correction nor proof of a source error.
          </p>
        </div>
      </section>

      <section className="notice notice--amber">
        <TriangleAlert aria-hidden="true" />
        <div>
          <strong>Before acting:</strong> confirm the latest quote with the market, validate your
          crop grade and sale unit, enter all known costs, inspect the low-end net estimate, and
          consider alternatives outside this selected dataset.
        </div>
      </section>
    </div>
  );
}
