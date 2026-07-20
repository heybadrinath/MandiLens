"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/types";

const chartMargin = { top: 10, right: 36, left: 0, bottom: 2 };
const chartInitialDimension = { width: 720, height: 320 };
const smallChartInitialDimension = { width: 560, height: 260 };
const chartColors = {
  grid: "#e4e9e2",
  primary: "#536f59",
  primaryStrong: "#385141",
  secondary: "#91a294",
  range: "#d9c88f",
  surface: "#f3f6f1",
} as const;

const defaultTooltipStyle = {
  border: "1px solid #dce3da",
  borderRadius: "10px",
  background: "rgba(255, 255, 255, 0.98)",
  boxShadow: "0 10px 30px rgba(31, 46, 34, 0.1)",
  color: chartColors.primaryStrong,
  fontSize: "10px",
  padding: "9px 11px",
};

const defaultTooltipLabelStyle = {
  marginBottom: "5px",
  color: "#6d776e",
  fontFamily: "var(--font-mono), monospace",
  fontSize: "9px",
};

export function HistoryChart({
  data,
  locale,
  label,
  representativeLabel,
  rangeLabel,
}: {
  data: Array<{ date: string; minimum: number; representative: number; maximum: number }>;
  locale: Locale;
  label: string;
  representativeLabel: string;
  rangeLabel: string;
}) {
  const chartData = data.map((item) => ({ ...item, range: [item.minimum, item.maximum] }));
  return (
    <div className="chart chart--history" role="img" aria-label={label}>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="chart-legend__range" />
          {rangeLabel}
        </span>
        <span>
          <i className="chart-legend__line" />
          {representativeLabel}
        </span>
      </div>
      <div className="chart__canvas">
        <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
          <ComposedChart data={chartData} margin={chartMargin}>
            <defs>
              <linearGradient id="range-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.range} stopOpacity={0.42} />
                <stop offset="100%" stopColor={chartColors.range} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={chartColors.grid}
              strokeDasharray="3 5"
              strokeOpacity={0.9}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) =>
                formatDate(value, locale, { month: "short", year: "2-digit" })
              }
              minTickGap={44}
              tickMargin={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value: number) => formatNumber(value, locale, 0)}
              width={58}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<HistoryTooltip locale={locale} />}
              cursor={{
                stroke: chartColors.primary,
                strokeDasharray: "3 5",
                strokeOpacity: 0.28,
                strokeWidth: 1,
              }}
            />
            <Area
              name={rangeLabel}
              type="monotone"
              dataKey="range"
              stroke="none"
              fill="url(#range-fill)"
              isAnimationActive={false}
            />
            <Line
              name={representativeLabel}
              type="monotone"
              dataKey="representative"
              stroke={chartColors.primary}
              strokeWidth={2.25}
              dot={false}
              activeDot={{
                r: 4,
                fill: chartColors.primaryStrong,
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HistoryTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ payload: { minimum: number; representative: number; maximum: number } }>;
  label?: string;
  locale: Locale;
}) {
  if (!active || !payload?.length || !label) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{formatDate(label, locale)}</strong>
      <span>
        {formatCurrency(point.minimum, locale)} — {formatCurrency(point.maximum, locale)}
      </span>
      <b>{formatCurrency(point.representative, locale)}</b>
    </div>
  );
}

export function ArrivalsChart({
  data,
  locale,
  label,
}: {
  data: Array<{ date: string; arrivals: number }>;
  locale: Locale;
  label: string;
}) {
  return (
    <div className="chart chart--small chart--arrivals" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={smallChartInitialDimension}>
        <ComposedChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="arrivals-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.secondary} stopOpacity={0.48} />
              <stop offset="100%" stopColor={chartColors.secondary} stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={chartColors.grid}
            strokeDasharray="3 5"
            strokeOpacity={0.9}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) =>
              formatDate(value, locale, { month: "short", year: "2-digit" })
            }
            minTickGap={48}
            tickMargin={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => formatNumber(value, locale, 0)}
            width={52}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(value) => formatDate(String(value), locale)}
            formatter={(value) => formatNumber(Number(value), locale)}
            contentStyle={defaultTooltipStyle}
            labelStyle={defaultTooltipLabelStyle}
            cursor={{ stroke: chartColors.primary, strokeOpacity: 0.2, strokeWidth: 1 }}
          />
          <Area
            dataKey="arrivals"
            type="monotone"
            stroke={chartColors.secondary}
            strokeWidth={1.6}
            fill="url(#arrivals-fill)"
            dot={false}
            activeDot={{
              r: 3.5,
              fill: chartColors.primaryStrong,
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeasonalChart({
  data,
  locale,
  label,
}: {
  data: Array<{ month: string; price: number; observations: number }>;
  locale: Locale;
  label: string;
}) {
  return (
    <div className="chart chart--small chart--seasonal" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={smallChartInitialDimension}>
        <ComposedChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="seasonal-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.88} />
              <stop offset="100%" stopColor={chartColors.secondary} stopOpacity={0.72} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={chartColors.grid}
            strokeDasharray="3 5"
            strokeOpacity={0.9}
            vertical={false}
          />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis
            tickFormatter={(value: number) => formatNumber(value, locale, 0)}
            width={58}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "price"
                ? formatCurrency(Number(value), locale)
                : formatNumber(Number(value), locale, 0)
            }
            contentStyle={defaultTooltipStyle}
            labelStyle={defaultTooltipLabelStyle}
            cursor={{ fill: chartColors.surface }}
          />
          <Bar
            dataKey="price"
            fill="url(#seasonal-fill)"
            radius={[5, 5, 2, 2]}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComparisonChart({
  data,
  locale,
  label,
}: {
  data: Array<{ name: string; amount: number; low: number; high: number }>;
  locale: Locale;
  label: string;
}) {
  return (
    <div className="chart chart--comparison" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
        <ComposedChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 20, bottom: 8, left: 12 }}
        >
          <defs>
            <linearGradient id="comparison-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={chartColors.secondary} stopOpacity={0.88} />
              <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0.98} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={chartColors.grid}
            strokeDasharray="3 5"
            strokeOpacity={0.9}
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatNumber(value, locale, 0)}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tickMargin={8}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), locale)}
            contentStyle={defaultTooltipStyle}
            labelStyle={defaultTooltipLabelStyle}
            cursor={{ fill: chartColors.surface }}
          />
          <Bar
            dataKey="amount"
            fill="url(#comparison-fill)"
            background={{ fill: chartColors.surface, radius: 6 }}
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
