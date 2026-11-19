import clsx from "clsx";
import { AlertTriangle, BellRing, CircleDollarSign, Clock, FilePlus2, Hourglass, Inbox, ReceiptText, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FlightPathChart } from "@/components/charts/flight-path-chart";
import { RunwayGauge } from "@/components/dashboard/runway-gauge";
import { UpcomingFlows } from "@/components/dashboard/upcoming-flows";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ExpenseStatusBadge } from "@/components/ui/status-badges";
import { formatDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import { requireCompanyPage, type CompanyContext } from "@/server/auth/dal";
import { getDashboard, type AlertLevel } from "@/server/queries/dashboard.queries";
import { listExpenses } from "@/server/queries/expense.queries";

export const metadata: Metadata = { title: "Tableau de bord" };

const ALERT_STYLE: Record<AlertLevel, { tone: "negative" | "warning" | "info"; label: string; Icon: typeof AlertTriangle }> = {
  danger: { tone: "negative", label: "Critique", Icon: AlertTriangle },
  warning: { tone: "warning", label: "Retard", Icon: Clock },
  info: { tone: "info", label: "À traiter", Icon: Inbox },
};

export default async function DashboardPage({ params }: PageProps<"/c/[companyId]/dashboard">) {
  const { companyId } = await params;
  const ctx = await requireCompanyPage(companyId);
  if (!ctx.can("dashboard.view")) return <EmployeeDashboard ctx={ctx} />;

  const data = await getDashboard(companyId);
  const { forecast } = data;
  const base = `/c/${companyId}`;
  const TrendIcon = data.trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <>
      <PageHeader
        eyebrow={`Situation au ${formatDate(data.today)}`}
        title={`Bonjour ${ctx.user.name.split(" ")[0]}`}
        description={`Voici la trajectoire de trésorerie de ${ctx.company.name}.`}
        actions={
          <>
            {ctx.can("invoices.manage") && (
              <LinkButton href={`${base}/invoices/new`} variant="secondary">
                <FilePlus2 className="size-4" aria-hidden /> Nouvelle facture
              </LinkButton>
            )}
            <LinkButton href={`${base}/expenses/new`}>
              <ReceiptText className="size-4" aria-hidden /> Soumettre une dépense
            </LinkButton>
          </>
        }
      />

      {/* Hero: real balance + flight path, runway and milestones */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-5">
            <div>
              <p className="text-[13px] font-medium text-text-muted">Solde réel</p>
              <p className={clsx("mt-1 text-4xl font-semibold tracking-tight tabular", data.realBalance < 0 && "text-negative")}>{formatMoney(data.realBalance)}</p>
              {data.trendDays > 0 && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", data.trend >= 0 ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative")}>
                    <TrendIcon className="size-3" aria-hidden /> {formatMoney(data.trend, { signed: true })}
                  </span>
                  sur les {data.trendDays} derniers jours
                </p>
              )}
            </div>
            <LinkButton href={`${base}/forecast`} variant="ghost" size="sm">
              Voir la prévision détaillée →
            </LinkButton>
          </div>
          <CardBody className="pt-2">
            <FlightPathChart history={data.history} forecast={forecast.points} today={data.today} shortfalls={forecast.shortfalls} />
          </CardBody>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardBody className="py-5">
              <RunwayGauge runway={data.runway} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Solde prévisionnel" description="Solde réel + encaissements attendus − décaissements prévus" />
            <ul className="divide-y divide-border">
              {forecast.milestones.map((m) => (
                <li key={m.days} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm">
                    <span className="font-semibold">J+{m.days}</span> <span className="text-text-muted">· {formatDate(m.date)}</span>
                  </span>
                  <span className={clsx("text-sm font-semibold tabular", m.balance < 0 && "text-negative")}>{formatMoney(m.balance)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Reste à encaisser"
          icon={<CircleDollarSign className="size-4" aria-hidden />}
          value={formatMoney(data.receivables)}
          tone={data.overdueCount ? "warning" : "neutral"}
          hint={data.overdueCount ? `dont ${formatMoney(data.overdueAmount)} en retard (${data.overdueCount} facture(s))` : "Aucune facture en retard"}
        />
        <StatCard
          label="Dépenses à valider"
          icon={<Hourglass className="size-4" aria-hidden />}
          value={data.pendingExpenses.length}
          tone={data.pendingExpenses.length ? "warning" : "neutral"}
          hint={data.pendingExpenses.length ? `${formatMoney(data.pendingExpenses.reduce((s, e) => s + e.amount, 0))} en attente de décision` : "Aucune demande en attente"}
        />
        <StatCard
          label="Approuvées à payer"
          icon={<Wallet className="size-4" aria-hidden />}
          value={formatMoney(data.approvedToPay.amount)}
          hint={`${data.approvedToPay.count} dépense(s) intégrée(s) à la prévision`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Centre d'alertes" icon={<BellRing className="size-4" aria-hidden />} description={`${data.alerts.length} élément(s) à surveiller`} />
          {data.alerts.length === 0 ? (
            <EmptyState title="Tout est en ordre" description="Aucune facture en retard, aucune dépense à valider, aucun solde négatif prévu." />
          ) : (
            <ul className="divide-y divide-border">
              {data.alerts.map((alert) => {
                const style = ALERT_STYLE[alert.level];
                return (
                  <li key={alert.id}>
                    <Link href={alert.href} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-surface-muted">
                      <style.Icon className={clsx("mt-0.5 size-4 shrink-0", style.tone === "negative" ? "text-negative" : style.tone === "warning" ? "text-warning" : "text-info")} aria-hidden />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{alert.title}</span>
                          <Badge tone={style.tone}>{style.label}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-text-muted">{alert.detail}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Encaissements attendus" description="30 prochains jours" />
          <UpcomingFlows flows={data.upcomingIn} direction="in" />
        </Card>
        <Card>
          <CardHeader title="Décaissements prévus" description="30 prochains jours" />
          <UpcomingFlows flows={data.upcomingOut} direction="out" />
        </Card>
      </div>
    </>
  );
}

async function EmployeeDashboard({ ctx }: { ctx: CompanyContext }) {
  const expenses = await listExpenses(ctx, { mine: true });
  const count = (status: string) => expenses.filter((e) => e.status === status).length;
  const base = `/c/${ctx.company.id}`;
  return (
    <>
      <PageHeader
        eyebrow={ctx.company.name}
        title={`Bonjour ${ctx.user.name.split(" ")[0]}`}
        description="Suivez vos demandes de dépenses."
        actions={
          <LinkButton href={`${base}/expenses/new`}>
            <ReceiptText className="size-4" aria-hidden /> Soumettre une dépense
          </LinkButton>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="En attente" value={count("SUBMITTED")} tone={count("SUBMITTED") ? "warning" : "neutral"} />
        <StatCard label="Approuvées" value={count("APPROVED")} />
        <StatCard label="Payées" value={count("PAID")} tone="positive" />
        <StatCard label="Refusées" value={count("REJECTED")} />
      </div>
      <Card className="mt-5">
        <CardHeader title="Mes dernières demandes" actions={<LinkButton href={`${base}/expenses`} variant="ghost" size="sm">Tout voir →</LinkButton>} />
        {expenses.length === 0 ? (
          <EmptyState title="Aucune demande" description="Vos dépenses soumises apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-border">
            {expenses.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link href={`${base}/expenses/${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-muted">
                  <div>
                    <p className="text-sm font-medium">{e.description}</p>
                    <p className="text-xs text-text-muted">{formatDate(e.expenseDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular">{formatMoney(e.amount)}</span>
                    <ExpenseStatusBadge status={e.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
