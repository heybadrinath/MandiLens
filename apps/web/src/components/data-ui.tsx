import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

import type { Dictionary } from "@/i18n/types";
import { formatCurrency, formatDate, formatDays } from "@/lib/format";
import type { FreshnessStatus, Locale } from "@/lib/types";
import { freshnessStatus } from "@/lib/types";

export function StatusBadge({
  days,
  threshold,
  locale,
  copy,
}: {
  days: number;
  threshold: number;
  locale: Locale;
  copy: Dictionary["common"];
}) {
  const status = freshnessStatus(days, threshold);
  const label = status === "fresh" ? copy.fresh : status === "recent" ? copy.recent : copy.stale;
  const Icon = status === "fresh" ? CheckCircle2 : status === "recent" ? Clock3 : AlertCircle;
  return (
    <span className={`status-badge status-badge--${status}`}>
      <Icon size={13} aria-hidden="true" />
      {label} · {formatDays(days, locale)}
    </span>
  );
}

export function ConsistencyBadge({ tier, copy }: { tier: string; copy: Dictionary["common"] }) {
  const high = tier === "high";
  return (
    <span className={`consistency-badge consistency-badge--${high ? "high" : "standard"}`}>
      <span aria-hidden="true">{high ? "●●●" : "●●○"}</span>
      {high ? copy.highConsistency : copy.standardConsistency}
    </span>
  );
}

export function Sparkline({
  points,
  label,
  tone = "green",
}: {
  points: Array<{ date: string; value: number }>;
  label: string;
  tone?: "green" | "orange" | "yellow";
}) {
  if (points.length < 2)
    return (
      <span className="sparkline-empty" aria-label={label}>
        —
      </span>
    );
  const width = 128;
  const height = 40;
  const values = points.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = points.map((item, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - 4 - ((item.value - min) / range) * (height - 8);
    return { x, y };
  });
  const path = coordinates.slice(1).reduce(
    (result, point, index) => {
      const previous = coordinates[index];
      const controlOffset = (point.x - previous.x) * 0.38;
      return `${result} C${(previous.x + controlOffset).toFixed(1)},${previous.y.toFixed(1)} ${(point.x - controlOffset).toFixed(1)},${point.y.toFixed(1)} ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    },
    `M${coordinates[0].x.toFixed(1)},${coordinates[0].y.toFixed(1)}`,
  );
  return (
    <svg
      className={`sparkline sparkline--${tone}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <path className="sparkline__area" d={`${path} L${width},${height} L0,${height} Z`} />
      <path className="sparkline__line" d={path} />
    </svg>
  );
}

export function PriceBand({
  minimum,
  representative,
  maximum,
  locale,
  compact = false,
}: {
  minimum: number;
  representative: number;
  maximum: number;
  locale: Locale;
  compact?: boolean;
}) {
  const span = maximum - minimum || 1;
  const marker = Math.max(3, Math.min(97, ((representative - minimum) / span) * 100));
  return (
    <div className={`price-band${compact ? " price-band--compact" : ""}`}>
      <div className="price-band__track" aria-hidden="true">
        <i style={{ left: `${marker}%` }} />
      </div>
      <div className="price-band__labels">
        <span>{formatCurrency(minimum, locale)}</span>
        <strong>{formatCurrency(representative, locale)}</strong>
        <span>{formatCurrency(maximum, locale)}</span>
      </div>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  body,
  aside,
}: {
  kicker: string;
  title: string;
  body: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {aside ? <div className="page-header__aside">{aside}</div> : null}
    </header>
  );
}

export function DataDateNotice({
  label,
  date,
  locale,
}: {
  label: string;
  date: string;
  locale: Locale;
}) {
  return (
    <span className="date-notice">
      <CalendarDays size={15} aria-hidden="true" />
      {label} {formatDate(date, locale)}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state" role="status">
      <span aria-hidden="true">∅</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function FeatureLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link className="feature-link" href={href}>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}

export function DefinitionList({ items }: { items: Array<{ term: string; description: string }> }) {
  return (
    <dl className="definition-grid">
      {items.map((item) => (
        <div key={item.term}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceLine({
  source,
  date,
  locale,
}: {
  source: string;
  date: string;
  locale: Locale;
}) {
  return (
    <p className="source-line">
      {source} · {formatDate(date, locale)}
    </p>
  );
}

export function freshnessTone(status: FreshnessStatus): "green" | "orange" | "yellow" {
  if (status === "fresh") return "green";
  if (status === "recent") return "yellow";
  return "orange";
}
