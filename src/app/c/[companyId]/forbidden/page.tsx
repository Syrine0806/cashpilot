import Link from "next/link";

export default async function ForbiddenPage({ params }: PageProps<"/c/[companyId]/forbidden">) {
  const { companyId } = await params;
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-warning/30 bg-warning-soft p-6 text-center">
      <h1 className="text-lg font-semibold text-warning">Accès refusé</h1>
      <p className="mt-2 text-sm text-text-secondary">Votre rôle ne permet pas d&apos;accéder à cette page.</p>
      <Link href={`/c/${companyId}/dashboard`} className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
