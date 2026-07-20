import { DataDateNotice, PageHeader } from "@/components/data-ui";
import { CompareWorkspace } from "@/components/compare-workspace";
import { localeDirection } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCatalog, getManifest } from "@/lib/server-data";
import type { Locale } from "@/lib/types";

export async function ComparePage({ locale }: { locale: Locale }) {
  const [dictionary, manifest, catalog] = await Promise.all([
    getDictionary(locale),
    getManifest(),
    getCatalog(),
  ]);
  return (
    <div className="page" lang={locale} dir={localeDirection(locale)}>
      <PageHeader
        kicker={dictionary.compare.kicker}
        title={dictionary.compare.title}
        body={dictionary.compare.body}
        aside={
          <DataDateNotice
            label={dictionary.common.sourceThrough}
            date={manifest.meta.dateRange[1]}
            locale={locale}
          />
        }
      />
      <CompareWorkspace
        locale={locale}
        markets={catalog.markets}
        manifest={manifest}
        common={dictionary.common}
        copy={dictionary.compare}
      />
    </div>
  );
}
