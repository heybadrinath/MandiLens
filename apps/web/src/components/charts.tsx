"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDate } from "@/lib/format";
import type { PriceChartPoint } from "@/lib/analytics";

function priceTooltip(value: unknown, name: unknown) {
  if (Array.isArray(value)) {
    return [
      `${formatCurrency(Number(value[0]))} – ${formatCurrency(Number(value[1]))}`,
      "80% interval",
    ];
  }
  const names: Record<string, string> = {
    observed: "Observed modal",
    forecast: "Forecast",
  };
  return [formatCurrency(Number(value ?? 0)), names[String(name)] ?? String(name)];
}

export function PriceForecastChart({
  points,
  forecastStart,
}: {
  points: PriceChartPoint[];
  forecastStart?: string;
}) {
  return (
    <div className="chart-frame" role="img" aria-label="Observed and forecast modal price chart">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 320, height: 300 }}
      >
        <ComposedChart data={points} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#d9e0ea" strokeDasharray="2 6" vertical={false} />
          <XAxis
            dataKey="date"
            minTickGap={45}
            tickFormatter={(value) => formatDate(String(value), { day: "numeric", month: "short" })}
            tick={{ fill: "#607087", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={62}
            tickFormatter={(value) => `₹${Math.round(Number(value) / 100) / 10}k`}
            tick={{ fill: "#607087", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={priceTooltip}
            labelFormatter={(value) => formatDate(String(value))}
            contentStyle={{
              border: "1px solid #ccd6e3",
              borderRadius: "10px",
              boxShadow: "0 12px 30px rgba(17, 42, 78, 0.12)",
              fontSize: "12px",
            }}
          />
          <Area
            dataKey="forecastRange"
            name="interval"
            type="monotone"
            stroke="#f0a42b"
            strokeOpacity={0.38}
            fill="#f7bd4a"
            fillOpacity={0.22}
            connectNulls
          />
          <Line
            dataKey="observed"
            name="observed"
            type="monotone"
            stroke="#163b72"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#163b72" }}
            connectNulls
          />
          <Line
            dataKey="forecast"
            name="forecast"
            type="monotone"
            stroke="#e85d3f"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={{ r: 2.5, fill: "#e85d3f" }}
            connectNulls
          />
          {forecastStart ? (
            <ReferenceLine x={forecastStart} stroke="#e85d3f" strokeDasharray="3 5" />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeasonalChart({
  points,
}: {
  points: Array<{ month: string; price: number; observations: number }>;
}) {
  return (
    <div className="seasonal-chart" role="img" aria-label="Monthly median price chart">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 320, height: 250 }}
      >
        <BarChart data={points} margin={{ top: 12, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#d9e0ea" strokeDasharray="2 6" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#607087", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={48}
            tickFormatter={(value) => `₹${Math.round(Number(value) / 100) / 10}k`}
            tick={{ fill: "#607087", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Monthly median"]}
            contentStyle={{ border: "1px solid #ccd6e3", borderRadius: "10px", fontSize: "12px" }}
          />
          <Bar dataKey="price" fill="#2f70b7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
