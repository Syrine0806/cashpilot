import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const FEATURES = [
  "Factures, encaissements partiels et reste à payer",
  "Prévision de trésorerie à 30, 60 et 90 jours",
  "Simulations « What if? » sans toucher aux données réelles",
];

/** Decorative flight path illustrating the product (pure SVG, no data). */
function FlightPathIllustration() {
  return (
    <svg viewBox="0 0 420 180" className="w-full" aria-hidden>
      <defs>
        <linearGradient id="auth-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a5cf5" stopOpacity="0.45" />
          <stop offset="1" stopColor="#3a5cf5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="auth-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7189ff" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <path d="M0 150 H420" stroke="#ffffff" strokeOpacity="0.15" strokeDasharray="4 6" />
      <path d="M0 120 L60 120 L60 96 L130 96 L130 132 L190 132 L190 84 L260 84 L260 104 L330 104 L330 52 L420 52 V180 H0 Z" fill="url(#auth-area)" />
      <path d="M0 120 L60 120 L60 96 L130 96 L130 132 L190 132 L190 84 L260 84 L260 104 L330 104 L330 52 L420 52" fill="none" stroke="url(#auth-line)" strokeWidth="3" strokeLinejoin="round" />
      <line x1="190" x2="190" y1="20" y2="160" stroke="#ffffff" strokeOpacity="0.35" strokeDasharray="3 4" />
      <text x="196" y="30" fill="#ffffff" fillOpacity="0.6" fontSize="11">Aujourd&apos;hui</text>
      <circle cx="330" cy="52" r="5" fill="#2dd4bf" />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="radar-grid relative hidden flex-col justify-between overflow-hidden bg-nav-bg p-12 text-nav-text lg:flex">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full bg-[#3a5cf5] opacity-25 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-10 size-[360px] rounded-full bg-[#10b3a3] opacity-15 blur-[120px]" />
        <Logo tone="light" />
        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9fb0ff]">Trésorerie des petites entreprises</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-white">Pilotez votre trésorerie avec 90 jours d&apos;avance.</h2>
          <div className="mt-8 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur">
            <FlightPathIllustration />
          </div>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-[#2dd4bf]" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-nav-muted">Montants exacts au millime · Données isolées par entreprise · Historique traçable</p>
      </section>

      <section className="flex flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Logo />
          </span>
          <ThemeToggle tone="surface" />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-rise">{children}</div>
        </div>
      </section>
    </main>
  );
}
