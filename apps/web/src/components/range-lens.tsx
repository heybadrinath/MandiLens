import { formatCurrency } from "@/lib/format";

export function RangeLens({
  low,
  point,
  high,
  label,
  compact = false,
}: {
  low: number;
  point: number;
  high: number;
  label: string;
  compact?: boolean;
}) {
  const minimum = Math.min(low, point, high);
  const maximum = Math.max(low, point, high);
  const span = Math.max(maximum - minimum, 1);
  const pointPosition = ((point - minimum) / span) * 100;

  return (
    <div
      className={`range-lens${compact ? " range-lens--compact" : ""}`}
      aria-label={`${label}: ${formatCurrency(low)} to ${formatCurrency(high)}, point ${formatCurrency(point)}`}
    >
      <div className="range-lens__labels" aria-hidden="true">
        <span>{formatCurrency(low)}</span>
        <strong>{formatCurrency(point)}</strong>
        <span>{formatCurrency(high)}</span>
      </div>
      <div className="range-lens__track" aria-hidden="true">
        <span className="range-lens__endpoint range-lens__endpoint--low" />
        <span className="range-lens__beam" />
        <span
          className="range-lens__point"
          style={{ left: `${Math.min(96, Math.max(4, pointPosition))}%` }}
        />
        <span className="range-lens__endpoint range-lens__endpoint--high" />
      </div>
      {!compact ? <p className="range-lens__caption">{label}</p> : null}
    </div>
  );
}
