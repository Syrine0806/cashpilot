import { formatDate } from "@/domain/dates";
import { FLOW_SOURCE_LABELS, type ForecastFlow } from "@/domain/forecast";
import { formatMoney } from "@/domain/money";
import { EmptyState } from "../ui/empty-state";
import { Money } from "../ui/money";
import { Table, Td, Th } from "../ui/table";

/** Explains every amount used by the projection, with the running balance. */
export function FlowsTable({
  flows,
  referenceBalance,
  referenceDate,
}: {
  flows: (ForecastFlow & { balanceAfter: number })[];
  referenceBalance: number;
  referenceDate: string;
}) {
  if (flows.length === 0) {
    return <EmptyState title="Aucun flux attendu" description="Aucune facture à encaisser, dépense approuvée ou flux planifié sur l'horizon." />;
  }
  return (
    <Table caption="Flux utilisés par la prévision">
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Origine</Th>
          <Th>Libellé & hypothèse</Th>
          <Th align="right">Montant</Th>
          <Th align="right">Solde après</Th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-surface-muted/50">
          <Td>{formatDate(referenceDate)}</Td>
          <Td colSpan={2} className="text-text-secondary">Solde réel de référence</Td>
          <Td align="right">—</Td>
          <Td align="right" className="font-medium">{formatMoney(referenceBalance)}</Td>
        </tr>
        {flows.map((f) => (
          <tr key={f.key}>
            <Td className="whitespace-nowrap">{formatDate(f.date)}</Td>
            <Td className="whitespace-nowrap text-text-secondary">{FLOW_SOURCE_LABELS[f.source]}</Td>
            <Td>
              <span className="block">{f.label}</span>
              {f.note && <span className="block text-xs text-text-muted">{f.note}</span>}
            </Td>
            <Td align="right">
              <Money value={f.amount} signed colored />
            </Td>
            <Td align="right" className={f.balanceAfter < 0 ? "font-medium text-negative" : "font-medium"}>
              {formatMoney(f.balanceAfter)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
