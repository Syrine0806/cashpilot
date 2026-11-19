"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/domain/dates";
import { axisDate, axisMoney, toDinars, tooltipMoney } from "./chart-utils";

/**
 * "Flight path": the real balance over the last days (solid) continued by the
 * forecast (dashed area), with today marked and shortfall periods shaded.
 * One measure, one axis: real vs projected is encoded by line style + legend.
 */
export function FlightPathChart({
  history,
  forecast,
  today,
  shortfalls,
  height = 280,
}: {
  history: { date: string; balance: number }[];
  forecast: { date: string; balance: number }[];
  today: string;
  shortfalls: { start: string; end: string }[];
  height?: number;
}) {
  const byDate = new Map<string, { date: string; real?: number; projected?: number }>();
  for (const p of history) byDate.set(p.date, { date: p.date, real: toDinars(p.balance) });
  for (const p of forecast) {
    const entry = byDate.get(p.date) ?? { date: p.date };
    entry.projected = toDinars(p.balance);
    byDate.set(p.date, entry);
  }
  const data = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <figure aria-label="Solde réel des derniers jours et solde prévisionnel" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="projectedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={axisDate} minTickGap={36} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={axisMoney} width={48} tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
          {shortfalls.map((s) => (
            <ReferenceArea key={s.start} x1={s.start} x2={s.end} fill="var(--negative)" fillOpacity={0.1} ifOverflow="extendDomain" />
          ))}
          <ReferenceLine y={0} stroke="var(--negative)" strokeOpacity={0.6} />
          <ReferenceLine
            x={today}
            stroke="var(--text-muted)"
            strokeDasharray="3 3"
            label={{ value: "Aujourd'hui", position: "top", fontSize: 11, fill: "var(--text-muted)" }}
          />
          <Tooltip
            formatter={(value, name) => [tooltipMoney(Number(value)), name]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
            labelStyle={{ color: "var(--text-muted)" }}
          />
          <Legend verticalAlign="top" align="right" iconType="plainline" height={28} wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
          <Area type="stepAfter" dataKey="projected" name="Prévision" stroke="var(--series-1)" strokeWidth={2} strokeDasharray="5 4" fill="url(#projectedFill)" isAnimationActive={false} connectNulls />
          <Line type="stepAfter" dataKey="real" name="Réel" stroke="var(--series-1)" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}
