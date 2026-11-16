import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { CommandPalette } from "@/components/layout/command-palette";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { buildCommands, buildNavigation } from "@/components/layout/navigation";
import { UserMenu } from "@/components/layout/user-menu";
import { Avatar } from "@/components/ui/avatar";
import { SECTOR_LABELS, type Sector } from "@/domain/company";
import { ROLE_LABELS } from "@/domain/permissions";
import { requireCompanyPage, type CompanyContext } from "@/server/auth/dal";
import { countAlerts } from "@/server/queries/dashboard.queries";

function CompanySwitcher({ ctx }: { ctx: CompanyContext }) {
  return (
    <Link
      href="/companies"
      className="flex items-center gap-3 rounded-xl bg-nav-raised p-2.5 ring-1 ring-nav-border transition-colors hover:bg-nav-active"
      title="Changer d'entreprise"
    >
      <Avatar name={ctx.company.name} square />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{ctx.company.name}</span>
        <span className="block truncate text-xs text-nav-muted">
          {ROLE_LABELS[ctx.role]} · {SECTOR_LABELS[ctx.company.sector as Sector] ?? ctx.company.sector}
        </span>
      </span>
      <ChevronsUpDown className="size-4 text-nav-muted" aria-hidden />
    </Link>
  );
}

export default async function CompanyLayout({ children, params }: LayoutProps<"/c/[companyId]">) {
  const { companyId } = await params;
  const ctx = await requireCompanyPage(companyId);
  const alerts = ctx.can("dashboard.view") ? await countAlerts(companyId) : 0;
  const groups = buildNavigation(ctx, alerts);
  const commands = buildCommands(ctx, groups);
  const userMenu = <UserMenu name={ctx.user.name} email={ctx.user.email} />;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Aller au contenu
      </a>

      {/* Desktop navigation rail (the column keeps the dark background on long pages) */}
      <div className="hidden bg-nav-bg lg:block">
      <aside className="radar-grid sticky top-0 flex h-screen flex-col text-nav-text">
        <div className="flex h-16 items-center px-5">
          <Link href={`/c/${companyId}/dashboard`} aria-label="CashPilot — tableau de bord">
            <Logo tone="light" />
          </Link>
        </div>
        <div className="px-3 pb-4">
          <CompanySwitcher ctx={ctx} />
        </div>
        <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pb-4">
          <NavLinks groups={groups} />
        </nav>
        <div className="border-t border-nav-border p-4">{userMenu}</div>
      </aside>
      </div>

      <div className="min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Link href={`/c/${companyId}/dashboard`} className="lg:hidden" aria-label="CashPilot — tableau de bord">
            <Logo compact />
          </Link>
          <div className="flex flex-1 items-center justify-end gap-2 lg:justify-start">
            <CommandPalette items={commands} />
            <MobileNav
              groups={groups}
              header={<Logo tone="light" />}
              footer={
                <div className="space-y-4">
                  <CompanySwitcher ctx={ctx} />
                  {userMenu}
                </div>
              }
            />
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
