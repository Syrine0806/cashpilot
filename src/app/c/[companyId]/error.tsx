"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CompanyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg rounded-xl border border-negative/30 bg-negative-soft p-6 text-center">
      <h2 className="text-lg font-semibold text-negative">Une erreur est survenue</h2>
      <p className="mt-2 text-sm text-text-secondary">
        La page n&apos;a pas pu être chargée. Vos données n&apos;ont pas été modifiées.
        {error.digest && <span className="mt-1 block text-xs">Référence : {error.digest}</span>}
      </p>
      <Button className="mt-4" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
