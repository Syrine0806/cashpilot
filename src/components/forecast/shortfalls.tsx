import { formatDate } from "@/domain/dates";
import type { Shortfall } from "@/domain/forecast";
import { formatMoney } from "@/domain/money";
import { shortfallLength } from "@/domain/simulation";
import { Alert } from "../ui/alert";

export function ShortfallSummary({ shortfalls, horizonDays }: { shortfalls: Shortfall[]; horizonDays: number }) {
  if (shortfalls.length === 0) {
    return <Alert tone="success" title="Aucun manque de liquidités prévu">Le solde reste positif sur les {horizonDays} prochains jours.</Alert>;
  }
  return (
    <Alert tone="danger" title={`${shortfalls.length} période(s) de manque de liquidités`}>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {shortfalls.map((s) => (
          <li key={s.start}>
            Du {formatDate(s.start)} au {formatDate(s.end)}
            {s.openEnded ? " (et au-delà)" : ""} — {shortfallLength(s)} jour(s), point bas {formatMoney(s.lowestBalance)} le{" "}
            {formatDate(s.lowestDate)}
          </li>
        ))}
      </ul>
    </Alert>
  );
}
