"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/domain/dates";
import { axisDate, axisMoney, toDinars, tooltipMoney } from "./chart-utils";

interface Point {
  date: string;
  balance: number;
}

/** Projected balance over the horizon. Negative periods are shaded. */
export function ForecastChart({
  points,
  shortfalls,
  milestones = [],
  height = 300,
}: {
  points: Point[];
  shortfalls: { start: string; end: string }[];
  milestones?: { days: number; date: string }[];
  height?: number;
}) {
  const data = points.map((p) => ({ date: p.date, balance: toDinars(p.balance) }));
  return (
    <figure aria-label="Évolution du solde prévisionnel" className="w-full">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={axisDate} minTickGap={32} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={axisMoney} width={56} tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
            {shortfalls.map((s) => (
              <ReferenceArea key={s.start} x1={s.start} x2={s.end} fill="var(--negative)" fillOpacity={0.08} ifOverflow="extendDomain" />
            ))}
            {milestones.map((m) => (
              <ReferenceLine key={m.days} x={m.date} stroke="var(--border)" strokeDasharray="4 4" label={{ value: `J+${m.days}`, position: "insideTopRight", fontSize: 11, fill: "var(--text-muted)" }} />
            ))}
            <ReferenceLine y={0} stroke="var(--negative)" strokeWidth={1} />
            <Tooltip
              formatter={(value) => [tooltipMoney(Number(value)), "Solde prévisionnel"]}
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13 }}
              labelStyle={{ color: "var(--text-muted)" }}
            />
            <Area type="stepAfter" dataKey="balance" stroke="var(--series-1)" strokeWidth={2} fill="url(#balanceFill)" activeDot={{ r: 4 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
