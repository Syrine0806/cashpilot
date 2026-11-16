export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse space-y-6">
      <span className="sr-only">Chargement…</span>
      <div className="h-8 w-64 rounded-lg bg-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-border/70" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-border/60" />
    </div>
  );
}
