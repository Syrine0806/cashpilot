import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/actions/auth.actions";
import { ActionForm } from "@/components/forms/action-form";
import { Input } from "@/components/forms/fields";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">Accédez à l&apos;espace de votre entreprise.</p>
      <ActionForm action={loginAction} submitLabel="Se connecter" className="space-y-4 [&>button]:h-11 [&>button]:w-full">
        <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
        <Input name="email" type="email" label="E-mail" autoComplete="email" required />
        <Input name="password" type="password" label="Mot de passe" autoComplete="current-password" required />
      </ActionForm>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Créer un compte
        </Link>
      </p>
      <details className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary shadow-card">
        <summary className="cursor-pointer font-medium">Comptes de démonstration</summary>
        <ul className="mt-2 space-y-1">
          <li>Dirigeant : dirigeant@cashpilot.tn</li>
          <li>Gestionnaire : gestionnaire@cashpilot.tn</li>
          <li>Collaborateur : collaborateur@cashpilot.tn</li>
          <li>Mot de passe : Demo1234!</li>
        </ul>
      </details>
    </>
  );
}
