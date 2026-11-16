import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface p-6 text-center">
      <h2 className="text-lg font-semibold">Introuvable</h2>
      <p className="mt-2 text-sm text-text-secondary">Cet élément n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
      <Link href="/companies" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
        Retour à mes entreprises
      </Link>
    </div>
  );
}
