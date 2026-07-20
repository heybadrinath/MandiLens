import { BookOpenCheck, CalendarDays } from "lucide-react";

import { MarketsExplorer } from "@/components/markets-explorer";
import { DataDateNotice, PageHeader } from "@/components/data-ui";
import { localeDirection } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCatalog, getManifest } from "@/lib/server-data";
import type { Locale } from "@/lib/types";

export async function MarketsPage({ locale }: { locale: Locale }) {
  const [dictionary, manifest, catalog] = await Promise.all([
    getDictionary(locale),
    getManifest(),
    getCatalog(),
  ]);
  return (
    <div className="page" lang={locale} dir={localeDirection(locale)}>
      <PageHeader
        kicker={dictionary.markets.kicker}
        title={dictionary.markets.title}
        body={dictionary.markets.body}
        aside={
          <DataDateNotice
            label={dictionary.common.sourceThrough}
            date={manifest.meta.dateRange[1]}
            locale={locale}
          />
        }
      />
      <section className="reading-guide" aria-labelledby="market-reading-guide">
        <div className="reading-guide__intro">
          <BookOpenCheck aria-hidden="true" />
          <div>
            <p className="kicker">{dictionary.home.reportBody}</p>
            <h2 id="market-reading-guide">{dictionary.home.reportTitle}</h2>
          </div>
        </div>
        <div className="reading-guide__items">
          {[3, 6, 7].map((index) => (
            <div key={dictionary.home.glossary[index].title}>
              <strong>{dictionary.home.glossary[index].title}</strong>
              <p>{dictionary.home.glossary[index].body}</p>
            </div>
          ))}
        </div>
      </section>
      <MarketsExplorer
        locale={locale}
        manifest={manifest}
        markets={catalog.markets}
        common={dictionary.common}
        copy={dictionary.markets}
        varietyOptions={catalog.varietyExamples}
      />
      <div className="market-caution">
        <CalendarDays aria-hidden="true" />
        <p>{dictionary.markets.comparisonCaution}</p>
      </div>
    </div>
  );
}
