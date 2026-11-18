import { formatDate } from "@/domain/dates";
import type { Milestone } from "@/domain/forecast";
import { formatMoney } from "@/domain/money";
import { StatCard } from "../ui/stat-card";

export function MilestoneCards({ milestones, referenceBalance }: { milestones: Milestone[]; referenceBalance: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Solde réel de référence" value={formatMoney(referenceBalance)} hint="Point de départ de la projection" />
      {milestones.map((m) => (
        <StatCard
          key={m.days}
          label={`Solde prévu à J+${m.days}`}
          value={formatMoney(m.balance)}
          tone={m.balance < 0 ? "negative" : "neutral"}
          hint={`${formatDate(m.date)} · +${formatMoney(m.inflows)} / −${formatMoney(m.outflows)}`}
        />
      ))}
    </div>
  );
}
