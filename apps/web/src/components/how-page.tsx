import {
  ArrowRight,
  Check,
  Database,
  FileCheck2,
  Layers3,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/data-ui";
import { localeDirection, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatCompact, formatDate } from "@/lib/format";
import { getManifest } from "@/lib/server-data";
import type { Locale } from "@/lib/types";

const stepIcons = [RefreshCw, FileCheck2, Scale, Layers3, Database, Sparkles, UploadCloud];
const cardRoutes = [
  "/sources",
  "/data-quality",
  "/forecast-reliability",
  "/methodology",
  "/architecture",
  "/limitations",
];

export async function HowPage({ locale }: { locale: Locale }) {
  const [dictionary, manifest] = await Promise.all([getDictionary(locale), getManifest()]);
  const { common, how } = dictionary;
  return (
    <div className="page how-page" lang={locale} dir={localeDirection(locale)}>
      <PageHeader
        kicker={how.kicker}
        title={how.title}
        body={how.body}
        aside={
          <div className="prepared-card">
            <span>{common.sourceThrough}</span>
            <strong>{formatDate(manifest.meta.dateRange[1], locale)}</strong>
            <small>
              {formatCompact(manifest.meta.observedRecords, locale)}{" "}
              {dictionary.home.preparedObservations}
            </small>
          </div>
        }
      />
      <section className="process-steps" aria-label={how.title}>
        {how.steps.map((step, index) => {
          const Icon = stepIcons[index];
          return (
            <article key={step.title} className={index === how.steps.length - 1 ? "is-final" : ""}>
              <div className="process-step__marker">
                <span className="process-step__number">{String(index + 1).padStart(2, "0")}</span>
                <Icon aria-hidden="true" />
              </div>
              <div className="process-step__copy">
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </div>
              {index < how.steps.length - 1 ? (
                <ArrowRight className="process-arrow" aria-hidden="true" />
              ) : (
                <Check className="process-arrow" aria-hidden="true" />
              )}
            </article>
          );
        })}
      </section>
      <section className="technical-index" aria-labelledby="technical-title">
        <div className="technical-index__lead">
          <ShieldCheck aria-hidden="true" />
          <p className="kicker">{dictionary.info.keyEvidence}</p>
          <h2 id="technical-title">{how.technicalTitle}</h2>
          <p>{how.technicalBody}</p>
        </div>
        <div className="technical-card-grid">
          {how.cards.map((card, index) => (
            <Link key={card.title} href={localizePath(cardRoutes[index], locale)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{card.title}</strong>
                <small>{card.body}</small>
              </div>
              <ArrowRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
