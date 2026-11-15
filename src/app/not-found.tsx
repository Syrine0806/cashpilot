import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <p className="text-5xl font-semibold text-brand">404</p>
        <h1 className="mt-2 text-lg font-semibold">Page introuvable</h1>
        <Link href="/companies" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
