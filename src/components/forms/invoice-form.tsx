"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { computeInvoiceTotals } from "@/domain/invoice";
import { formatMoney, parseMoney } from "@/domain/money";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, useFormState } from "./action-form";
import { Input, Select, Textarea } from "./fields";

interface LineDraft {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceFormValues {
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  lines: Omit<LineDraft, "key">[];
}

function parseQuantity(value: string): number | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,3}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}

export function InvoiceForm({
  action,
  clients,
  initial,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: { id: string; name: string }[];
  initial: InvoiceFormValues;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          name="clientId"
          label="Client"
          required
          defaultValue={initial.clientId}
          placeholder="Choisir un client…"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          wrapperClassName="sm:col-span-2"
        />
        <Input name="issueDate" type="date" label="Date d'émission" defaultValue={initial.issueDate} required />
        <Input name="dueDate" type="date" label="Échéance" defaultValue={initial.dueDate} required />
      </div>
      <LinesEditor initialLines={initial.lines} initialTaxRate={initial.taxRate} />
      <Textarea name="notes" label="Notes (conditions, références…)" defaultValue={initial.notes} maxLength={500} />
    </ActionForm>
  );
}

function LinesEditor({ initialLines, initialTaxRate }: { initialLines: InvoiceFormValues["lines"]; initialTaxRate: string }) {
  const state = useFormState();
  const [lines, setLines] = useState<LineDraft[]>(() =>
    (initialLines.length ? initialLines : [{ description: "", quantity: "1", unitPrice: "" }]).map((l, key) => ({ ...l, key })),
  );
  const [taxRate, setTaxRate] = useState(initialTaxRate);
  const [nextKey, setNextKey] = useState(lines.length);

  const update = (key: number, field: keyof Omit<LineDraft, "key">, value: string) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  const parsed = lines.map((l) => ({ q: parseQuantity(l.quantity), p: parseMoney(l.unitPrice) }));
  const rateBp = /^\d{1,2}([.,]\d{1,2})?$/.test(taxRate) ? Math.round(Number(taxRate.replace(",", ".")) * 100) : 0;
  const totals = computeInvoiceTotals(
    parsed.filter((x) => x.q !== null && x.p !== null).map((x) => ({ description: "", quantityMilli: x.q!, unitPrice: x.p! })),
    rateBp,
  );
  const linesError = state.fieldErrors?.lines?.[0];

  return (
    <fieldset className="rounded-lg border border-border">
      <legend className="ml-3 px-1 text-sm font-medium">Lignes de facture</legend>
      <div className="space-y-3 p-3">
        <div className="hidden grid-cols-[1fr_110px_150px_130px_40px] gap-2 px-1 text-xs font-medium uppercase text-text-muted md:grid">
          <span>Description</span>
          <span>Quantité</span>
          <span>Prix unitaire HT</span>
          <span className="text-right">Montant HT</span>
          <span />
        </div>
        {lines.map((line, index) => {
          const err = (f: string) => state.fieldErrors?.[`lines.${index}.${f}`]?.[0];
          const amount = parsed[index].q !== null && parsed[index].p !== null ? Math.round((parsed[index].q! * parsed[index].p!) / 1000) : null;
          return (
            <div key={line.key} className="grid grid-cols-2 gap-2 rounded-lg bg-surface-muted/60 p-2 md:grid-cols-[1fr_110px_150px_130px_40px] md:bg-transparent md:p-0">
              <div className="col-span-2 md:col-span-1">
                <label className="sr-only" htmlFor={`line-desc-${line.key}`}>Description ligne {index + 1}</label>
                <input
                  id={`line-desc-${line.key}`}
                  name="lineDescription"
                  value={line.description}
                  onChange={(e) => update(line.key, "description", e.target.value)}
                  placeholder="Prestation, produit…"
                  maxLength={200}
                  required
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                />
                {err("description") && <p className="mt-1 text-xs text-negative">{err("description")}</p>}
              </div>
              <div>
                <label className="sr-only" htmlFor={`line-qty-${line.key}`}>Quantité ligne {index + 1}</label>
                <input
                  id={`line-qty-${line.key}`}
                  name="lineQuantity"
                  value={line.quantity}
                  onChange={(e) => update(line.key, "quantity", e.target.value)}
                  inputMode="decimal"
                  required
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-right text-sm tabular"
                />
                {err("quantity") && <p className="mt-1 text-xs text-negative">{err("quantity")}</p>}
              </div>
              <div>
                <label className="sr-only" htmlFor={`line-price-${line.key}`}>Prix unitaire ligne {index + 1}</label>
                <input
                  id={`line-price-${line.key}`}
                  name="lineUnitPrice"
                  value={line.unitPrice}
                  onChange={(e) => update(line.key, "unitPrice", e.target.value)}
                  inputMode="decimal"
                  placeholder="0,000"
                  required
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-right text-sm tabular"
                />
                {err("unitPrice") && <p className="mt-1 text-xs text-negative">{err("unitPrice")}</p>}
              </div>
              <p className="flex h-10 items-center justify-end text-sm tabular text-text-secondary">{amount === null ? "—" : formatMoney(amount)}</p>
              <button
                type="button"
                onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                disabled={lines.length === 1}
                className="grid size-10 place-items-center rounded-lg text-text-muted hover:bg-negative-soft hover:text-negative disabled:opacity-30"
                aria-label={`Supprimer la ligne ${index + 1}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
        {linesError && <p className="text-sm text-negative">{linesError}</p>}
        <button
          type="button"
          onClick={() => {
            setLines((ls) => [...ls, { key: nextKey, description: "", quantity: "1", unitPrice: "" }]);
            setNextKey((k) => k + 1);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft"
        >
          <Plus className="size-4" aria-hidden /> Ajouter une ligne
        </button>
      </div>
      <div className="flex flex-col items-end gap-1 border-t border-border px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="taxRate" className="text-text-secondary">TVA (%)</label>
          <input
            id="taxRate"
            name="taxRate"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            inputMode="decimal"
            required
            className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-right tabular"
          />
        </div>
        {state.fieldErrors?.taxRate?.[0] && <p className="text-xs text-negative">{state.fieldErrors.taxRate[0]}</p>}
        <p className="text-text-secondary">Total HT : <span className="tabular">{formatMoney(totals.subtotal)}</span></p>
        <p className="text-text-secondary">TVA : <span className="tabular">{formatMoney(totals.taxAmount)}</span></p>
        <p className="text-base font-semibold">Total TTC : <span className="tabular">{formatMoney(totals.total)}</span></p>
      </div>
    </fieldset>
  );
}
