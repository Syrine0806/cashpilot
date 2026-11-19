"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/domain/dates";
import { axisDate, axisMoney, toDinars, tooltipMoney } from "./chart-utils";

/** Real projection vs simulated projection on a single axis. */
export function CompareChart({
  series,
  shortfalls,
  height = 340,
}: {
  series: { date: string; base: number; simulated: number }[];
  shortfalls: { start: string; end: string }[];
  height?: number;
}) {
  const data = series.map((p) => ({ date: p.date, base: toDinars(p.base), simulated: toDinars(p.simulated) }));
  return (
    <figure aria-label="Comparaison de la projection initiale et de la projection simulée" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={axisDate} minTickGap={32} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={axisMoney} width={56} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
          {shortfalls.map((s) => (
            <ReferenceArea key={s.start} x1={s.start} x2={s.end} fill="var(--negative)" fillOpacity={0.08} ifOverflow="extendDomain" />
          ))}
          <ReferenceLine y={0} stroke="var(--negative)" strokeWidth={1} />
          <Tooltip
            formatter={(value, name) => [tooltipMoney(Number(value)), name]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
              labelStyle={{ color: "var(--text-muted)" }}
          />
          <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 13, paddingBottom: 8, color: "var(--text-secondary)" }} />
          <Line type="stepAfter" dataKey="base" name="Projection initiale" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="simulated" name="Projection simulée" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
