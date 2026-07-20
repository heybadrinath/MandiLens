import type { Metadata } from "next";
import { ExternalLink, FileCheck2, Landmark, Scale } from "lucide-react";

import { PageIntro } from "@/components/page-intro";
import { formatDate } from "@/lib/format";
import { getMandiData } from "@/lib/server-data";

export const metadata: Metadata = {
  title: "Sources and licence",
  description:
    "Official AGMARKNET provenance, Government Open Data Licence attribution, transformations, and redistribution notes.",
};

export default async function SourcesPage() {
  const data = await getMandiData();
  const source = data.sources[0];

  return (
    <div className="content-page">
      <PageIntro
        eyebrow="Sources & licence"
        title="One authoritative source, named and linked."
        summary="MandiLens retrieves observed market reports from the Government of India’s AGMARKNET 2.0 service and republishes a transformed, attributed subset under the Government Open Data Licence – India."
        aside={
          <div className="intro-stamp">
            <span>Retrieved</span>
            <strong>{formatDate(data.meta.sourceRetrievedAt.slice(0, 10))}</strong>
            <small>{data.quality.validation.source_file_count} monthly responses</small>
          </div>
        }
      />

      <section className="source-hero">
        <Landmark aria-hidden="true" />
        <div>
          <p className="eyebrow">Primary authority</p>
          <h2>{source.name}</h2>
          <p>{source.provider}</p>
        </div>
        <div className="source-actions">
          <a
            className="button button--primary"
            href={source.catalogUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open official catalogue <ExternalLink size={15} />
          </a>
          <a className="text-link" href={source.licenseUrl} target="_blank" rel="noreferrer">
            Read the licence <ExternalLink size={14} />
          </a>
        </div>
      </section>

      <div className="content-grid">
        <section className="content-card content-card--wide">
          <FileCheck2 aria-hidden="true" />
          <p className="eyebrow">Provenance record</p>
          <h2>What was retrieved and retained</h2>
          <dl className="definition-list">
            <div>
              <dt>Geography</dt>
              <dd>{data.meta.state}</dd>
            </div>
            <div>
              <dt>Commodities</dt>
              <dd>{data.meta.commodities.join(", ")}</dd>
            </div>
            <div>
              <dt>Date range</dt>
              <dd>
                {formatDate(data.meta.dateRange[0])} – {formatDate(data.meta.dateRange[1])}
              </dd>
            </div>
            <div>
              <dt>Source granularity</dt>
              <dd>Market · commodity · variety · reporting date</dd>
            </div>
            <div>
              <dt>Published unit</dt>
              <dd>
                {data.meta.priceUnit}; arrivals in {data.meta.arrivalUnit}
              </dd>
            </div>
            <div>
              <dt>Audit material</dt>
              <dd>Monthly raw responses, retrieval manifest, checksums, validation report</dd>
            </div>
          </dl>
        </section>
        <section className="content-card content-card--accent">
          <Scale aria-hidden="true" />
          <p className="eyebrow">Licence</p>
          <h2>{source.license}</h2>
          <p>
            Reuse, adaptation, derivative publication, and commercial or non-commercial use are
            permitted subject to attribution, non-endorsement, and other licence terms.
          </p>
          <a className="text-link" href={source.licenseUrl} target="_blank" rel="noreferrer">
            Verify at data.gov.in <ExternalLink size={14} />
          </a>
        </section>
      </div>

      <section className="prose-section prose-section--split">
        <div>
          <p className="eyebrow">Modifications</p>
          <h2>This is a derived analytical snapshot</h2>
        </div>
        <div className="prose-copy">
          <p>
            MandiLens filters Maharashtra and three commodities, normalizes market display names,
            validates source semantics, excludes exact duplicates and invalid rows with reasons, and
            aggregates varieties into a market-day comparison unit.
          </p>
          <p>
            It selects seven active, regularly reporting series per commodity; adds robust anomaly
            flags; engineers time-safe features; evaluates forecast methods; calibrates uncertainty
            ranges; and exports deployment-sized history and forecast data.
          </p>
          <p>
            The Government of India and the source provider do not endorse MandiLens. Source data
            and derived outputs carry no warranty.
          </p>
        </div>
      </section>

      <section className="attribution-box">
        <p className="eyebrow">Copyable attribution</p>
        <blockquote>
          Directorate of Marketing and Inspection, Ministry of Agriculture and Farmers Welfare,
          Government of India, AGMARKNET market price and arrival reports, retrieved 20 July 2026
          via AGMARKNET 2.0 / Open Government Data Platform India. Licensed under the Government
          Open Data Licence – India. Modified by MandiLens as documented.
        </blockquote>
      </section>
    </div>
  );
}
