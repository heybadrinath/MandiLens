"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PriceBand, StatusBadge } from "@/components/data-ui";
import { localizePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { formatDate, formatNumber } from "@/lib/format";
import type { Locale, Manifest, MarketSummary } from "@/lib/types";

export function DataPreview({
  markets,
  locale,
  manifest,
  common,
  marketCopy,
}: {
  markets: MarketSummary[];
  locale: Locale;
  manifest: Manifest;
  common: Dictionary["common"];
  marketCopy: Dictionary["markets"];
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      markets
        .filter(
          (item) =>
            !query ||
            [item.market, item.district, item.state, item.commodity].some((value) =>
              value.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            ),
        )
        .slice(0, 24),
    [markets, query],
  );
  return (
    <div className="data-preview">
      <label className="search-field">
        <span className="sr-only">{marketCopy.search}</span>
        <Search size={17} />
        <input
          name="data-market-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={common.searchPlaceholder}
        />
      </label>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{marketCopy.market}</th>
              <th>{marketCopy.commodity}</th>
              <th>{marketCopy.reportDate}</th>
              <th>{marketCopy.representativePrice}</th>
              <th>{marketCopy.freshness}</th>
              <th>
                <span className="sr-only">{common.viewDetails}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.key}>
                <td>
                  <strong>{item.market}</strong>
                  <small>
                    {item.district} · {item.state}
                  </small>
                </td>
                <td>{item.commodity}</td>
                <td>{formatDate(item.last_date, locale)}</td>
                <td>
                  <PriceBand
                    minimum={item.latest.min_price}
                    representative={item.latest.representative_price}
                    maximum={item.latest.max_price}
                    locale={locale}
                    compact
                  />
                </td>
                <td>
                  <StatusBadge
                    days={item.latest_age_days}
                    threshold={manifest.meta.freshnessThresholdDays}
                    locale={locale}
                    copy={common}
                  />
                </td>
                <td>
                  <Link
                    href={localizePath(item.route, locale)}
                    aria-label={`${common.viewDetails}: ${item.market}`}
                  >
                    <ArrowRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {formatNumber(rows.length, locale, 0)} / {formatNumber(markets.length, locale, 0)}{" "}
        {marketCopy.results}
      </p>
    </div>
  );
}
