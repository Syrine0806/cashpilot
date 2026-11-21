import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/actions/auth.actions";
import { ActionForm } from "@/components/forms/action-form";
import { Input } from "@/components/forms/fields";
import { getCurrentUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/companies");
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Créer un compte</h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">Vous pourrez ensuite créer votre espace entreprise.</p>
      <ActionForm action={registerAction} submitLabel="Créer mon compte" className="space-y-4 [&>button]:h-11 [&>button]:w-full">
        <Input name="name" label="Nom complet" autoComplete="name" required maxLength={80} />
        <Input name="email" type="email" label="E-mail" autoComplete="email" required />
        <Input
          name="password"
          type="password"
          label="Mot de passe"
          autoComplete="new-password"
          required
          minLength={8}
          hint="8 caractères minimum, dont une lettre et un chiffre."
        />
      </ActionForm>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
