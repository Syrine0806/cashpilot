export const SECTORS = ["DIGITAL_AGENCY", "TRAINING_CENTER", "RETAIL", "SERVICES"] as const;
export type Sector = (typeof SECTORS)[number];

export const SECTOR_LABELS: Record<Sector, string> = {
  DIGITAL_AGENCY: "Agence digitale",
  TRAINING_CENTER: "Centre de formation",
  RETAIL: "Commerce",
  SERVICES: "Entreprise de services",
};

export const CONTACT_KINDS = ["CLIENT", "SUPPLIER"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export const CONTACT_KIND_LABELS: Record<ContactKind, string> = { CLIENT: "Client", SUPPLIER: "Fournisseur" };

export const MOVEMENT_KIND_LABELS: Record<string, string> = {
  CUSTOMER_PAYMENT: "Encaissement client",
  PAYMENT_REVERSAL: "Contre-passation d'encaissement",
  EXPENSE_PAYMENT: "Paiement de dépense",
  MANUAL_IN: "Entrée manuelle",
  MANUAL_OUT: "Sortie manuelle",
  MANUAL_REVERSAL: "Contre-passation",
};

export const MANUAL_MOVEMENT_KINDS = ["MANUAL_IN", "MANUAL_OUT"] as const;
