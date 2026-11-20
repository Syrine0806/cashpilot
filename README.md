# CashPilot — Gestion et prévision de trésorerie

Application **React / Next.js** permettant à une petite entreprise de suivre ses flux financiers (factures, encaissements, dépenses), de connaître sa **trésorerie réelle**, de **prévoir** son évolution à 30, 60 et 90 jours et de **simuler** des décisions (« What if? ») sans jamais modifier les données réelles.

Secteur choisi : **agence digitale**. Fonctionnalité adaptée : **contrats récurrents** (maintenance, hébergement…) dont les mensualités alimentent automatiquement les prévisions jusqu'à leur facturation.

---

## Sommaire

1. [Choix du sujet](#1-choix-du-sujet)
2. [Installation](#2-installation)
3. [Comptes de démonstration](#3-comptes-de-démonstration)
4. [Scénario de soutenance](#4-scénario-de-soutenance)
5. [Fonctionnalités par module](#5-fonctionnalités-par-module)
6. [Règles de calcul](#6-règles-de-calcul)
7. [Rôles et permissions](#7-rôles-et-permissions)
8. [Critères de validation → implémentation](#8-critères-de-validation--implémentation)
9. [Architecture](#9-architecture)
10. [Modèle de données](#10-modèle-de-données)
11. [Tests](#11-tests)
12. [Déploiement](#12-déploiement)
13. [Choix techniques](#13-choix-techniques)
14. [Limites connues](#14-limites-connues)
15. [Déclaration d'utilisation de l'IA](#15-déclaration-dutilisation-de-lia)

---

## 1. Choix du sujet

Trois sujets ont été comparés : **CashPilot**, **CampusConnect** et **LocalImpact**.

| Critère | CashPilot | CampusConnect | LocalImpact |
|---|---|---|---|
| Règles métier vérifiables | Nombreuses et chiffrées (reste à payer, solde, prévision) | Workflow simple | Workflow simple |
| Logique « au-delà du CRUD » | Moteur de prévision + simulation | Peu | Statistiques |
| Exigences précises de validation | 9 critères testables | 6 | 7 |
| Valeur démontrable | Scénario de soutenance chiffré | Moyenne | Moyenne |

CashPilot a été retenu : c'est le sujet le plus riche en **règles métier testables** (calculs monétaires, idempotence des opérations, traçabilité) et sa fonctionnalité centrale (simulation « What if? ») met en valeur la séparation entre données réelles et hypothèses.

## 2. Installation

Prérequis : **Node.js ≥ 20.9** et npm.

```bash
cd cashpilot
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env        # puis remplacer SESSION_SECRET (openssl rand -base64 32)
npm run setup               # crée la base SQLite (migrations) et charge les données de démo
npm run dev                 # http://localhost:3000
```

### Configuration (`.env`)

| Variable | Rôle | Valeur par défaut |
|---|---|---|
| `DATABASE_URL` | Base de données | `file:./dev.db` (SQLite) |
| `SESSION_SECRET` | Signature des cookies de session (≥ 32 caractères) | — obligatoire |
| `APP_TIMEZONE` | Fuseau qui définit « aujourd'hui » (échéances, prévisions) | `Africa/Tunis` |
| `UPLOAD_DIR` | Dossier des justificatifs (hors `public/`) | `./storage/receipts` |

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` / `build` / `start` | Développement / build de production / serveur de production |
| `npm run setup` | Migrations + données de démo |
| `npm run db:seed` | **Réinitialise** les données de démo (efface la base) |
| `npm run db:migrate` | Crée une nouvelle migration après modification du schéma |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright, base dédiée `e2e.db`) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |

## 3. Comptes de démonstration

Mot de passe commun : **`Demo1234!`** — entreprise **Studio Pixel** (agence digitale).

| Rôle | E-mail |
|---|---|
| Dirigeant | `dirigeant@cashpilot.tn` |
| Gestionnaire financier | `gestionnaire@cashpilot.tn` |
| Collaborateur | `collaborateur@cashpilot.tn` |

Les données de démo reproduisent **l'exemple du sujet** (dates relatives au jour du chargement) :

- solde réel **5 000 DT** = solde initial 4 000 + encaissements 2 380 + 1 760 − dépense payée 3 140 ;
- facture `FAC-…-0002` de 4 760 DT TTC, payée partiellement (1 760 DT) → **3 000 DT attendus** à J+10 ;
- **6 000 DT de dépenses approuvées** : salaires 4 000 DT à J+15, sous-traitance 2 000 DT à J+25 ;
- scénario enregistré **« Retard client de 20 jours »** → manque de liquidités de **−1 000 DT** du J+25 au J+29 ;
- également : un brouillon, une dépense en attente, une dépense refusée, un contrat récurrent et un loyer planifié (au-delà de J+30).

## 4. Scénario de soutenance

Le scénario complet est automatisé dans [`e2e/soutenance.spec.ts`](e2e/soutenance.spec.ts). Pour le dérouler à la main :

1. **Créer une entreprise** : « Créer un compte » → « Nouvelle entreprise » avec un solde initial de 5 000 DT.
2. **Émettre une facture** : *Clients & fournisseurs* → nouveau client ; *Factures* → nouvelle facture (brouillon) → **Valider la facture** (un numéro définitif est attribué).
3. **Paiement partiel** : sur la facture, « Enregistrer un encaissement » d'un montant partiel → le **reste à payer** diminue. Un montant supérieur au reste est refusé.
4. **Soumettre et approuver une dépense** : *Dépenses* → « Soumettre une dépense » (avec justificatif) → en tant que dirigeant, **Approuver**.
5. **Consulter la prévision** : *Prévisions* → soldes à J+30/60/90, courbe, hypothèses et détail de chaque flux.
6. **Simuler un retard** : *Simulations* → nouveau scénario → « Retard de paiement client » de 20 jours.
7. **Comparer** : courbes superposées, tableau J+30/60/90 avec écarts, point bas, périodes de manque de liquidités et flux expliqués.

## 5. Fonctionnalités par module

| Module | Réalisation |
|---|---|
| Entreprise et accès | Inscription/connexion, plusieurs entreprises par utilisateur, membres (ajout, rôle, retrait), matrice de permissions |
| Clients et fournisseurs | Coordonnées, archivage (sans perte d'historique), historique des factures, paiements et dépenses |
| Facturation | Brouillon (lignes, quantités décimales, TVA), validation avec numérotation séquentielle, échéance, **export PDF**, annulation motivée |
| Encaissements | Paiement total ou partiel, reste à payer, contre-passation motivée |
| Dépenses | Catégorie, montant, dates, fournisseur, **justificatif** (PDF/PNG/JPG vérifié par signature binaire), statut |
| Validation des dépenses | Soumission → approbation ou refus (motif obligatoire) → paiement ; retrait par l'auteur tant que non traitée |
| Trésorerie | Solde initial, mouvements réalisés avec solde cumulé, mouvements manuels et contre-passations |
| Prévisions | Projection journalière à 30/60/90 jours, vue prudente (dépenses en attente), flux planifiés (loyer, salaires…) |
| Simulation | Scénarios enregistrés : retard client, nouvelle dépense, rentrée prévue ; comparaison graphique et chiffrée |
| Alertes et dashboard | Factures en retard, dépenses à valider, solde prévisionnel négatif ; badge dans la navigation |
| **Contrats récurrents** (secteur) | Mensualités projetées tant qu'elles ne sont pas facturées ; génération du brouillon du mois (une seule fois par mois) |
| Journal d'audit | Toute opération est tracée (auteur, date, détail) |

### Expérience utilisateur

- **Trajectoire de vol** : le tableau de bord enchaîne le solde réel des 30 derniers jours (trait plein) et la prévision à 90 jours (pointillés), avec le jour J et les périodes de manque de liquidités.
- **Autonomie de trésorerie** : nombre de jours avant le premier solde prévisionnel négatif (jauge « Cap stable / Turbulences / Alerte »).
- **Palette de commandes ⌘K / Ctrl+K** : aller à n'importe quelle page ou lancer une action au clavier.
- **Thème clair / sombre / système**, sans flash au chargement.
- **Notifications (toasts)** après chaque action réussie ; erreurs affichées dans le formulaire, champ par champ.
- Navigation groupée (Pilotage / Opérations / Administration), menu mobile coulissant, interface responsive et accessible (rôles ARIA, focus visible, lien d'évitement, mouvements réduits respectés).

## 6. Règles de calcul

- **Montants** : entiers en **millimes** (1 DT = 1 000 millimes). La saisie (« 1 234,500 ») est analysée comme une chaîne, sans `float` : aucune erreur d'arrondi visible.
- **Ligne** = quantité × prix unitaire, arrondi au millime ; **TVA** calculée une seule fois sur le total HT (arrondi au plus proche).
- **Reste à payer** = total TTC − Σ encaissements (les contre-passations sont des encaissements négatifs).
- **Solde réel** = solde initial + Σ mouvements réalisés.
- **Solde prévisionnel à une date D** = solde réel de référence + encaissements restant attendus jusqu'à D − décaissements restant prévus jusqu'à D, avec :
  - factures validées : **reste à payer** à l'échéance (factures échues : aujourd'hui) ; brouillons et factures annulées exclus ;
  - dépenses approuvées non payées : à la date de paiement prévue ; dépenses en attente : uniquement en vue prudente ; dépenses refusées : jamais ;
  - flux planifiés actifs (ponctuels ou mensuels) et mensualités de contrats récurrents **non encore facturées**.
- **Simulation** : les hypothèses sont appliquées à une **copie en mémoire** des flux ; un retard décale l'encaissement de `échéance + n jours`.

Le moteur est dans [`src/domain/forecast.ts`](src/domain/forecast.ts) et [`src/domain/simulation.ts`](src/domain/simulation.ts) (fonctions pures, testées).

## 7. Rôles et permissions

| Permission | Dirigeant | Gestionnaire financier | Collaborateur |
|---|:-:|:-:|:-:|
| Paramètres entreprise, membres | ✅ | — | — |
| Tableau de bord et indicateurs | ✅ | ✅ | ses demandes |
| Clients, factures, encaissements | ✅ | ✅ | — |
| Soumettre une dépense | ✅ | ✅ | ✅ |
| Voir toutes les dépenses | ✅ | ✅ | ses demandes |
| **Approuver / refuser** une dépense | ✅ | — | — |
| Payer une dépense approuvée | ✅ | ✅ | — |
| Trésorerie, prévisions, simulations, audit | ✅ | ✅ | — |

La matrice est définie une seule fois dans [`src/domain/permissions.ts`](src/domain/permissions.ts) et vérifiée **côté serveur** dans chaque page, Server Action et Route Handler ([`src/server/auth/dal.ts`](src/server/auth/dal.ts)). Le menu ne fait que refléter ces droits.

## 8. Critères de validation → implémentation

| Critère du sujet | Où / comment |
|---|---|
| Un paiement partiel diminue le reste à payer | `remainingAmount` (domaine) + test unitaire + e2e |
| Pas de paiement au-delà du reste | `assertPaymentAllowed`, vérifié **dans la transaction** d'enregistrement |
| Une dépense refusée ne peut pas être payée | Machine à états `nextExpenseStatus` + mise à jour conditionnelle `status = APPROVED` |
| Une opération affecte le solde une seule fois | Contraintes `@unique` sur `Movement.paymentId` / `expenseId` / `reversalOfId` + verrou optimiste |
| Les impayés alimentent la prévision sans recompter les paiements | Seul le **reste à payer** est projeté ; les paiements sont déjà dans le solde réel |
| Une simulation ne modifie jamais les données réelles | Hypothèses dans `Scenario`/`ScenarioAdjustment`, calcul pur en mémoire (test « never mutates ») |
| Données accessibles aux seuls membres | Toute requête filtrée par `companyId` + appartenance vérifiée ; un non-membre reçoit une 404 |
| Historique conservé, corrections traçables | Aucune suppression d'opération validée : contre-passations, annulation motivée, archivage, journal d'audit |
| Précision monétaire adaptée | Entiers en millimes, arithmétique `BigInt` pour les produits |

## 9. Architecture

```
src/
├── domain/            Règles métier PURES (aucune dépendance framework) — testées unitairement
│   ├── money.ts, dates.ts, invoice.ts, expense.ts, permissions.ts
│   ├── forecast.ts    Moteur de prévision
│   └── simulation.ts  Scénarios « What if? »
├── server/            Code serveur uniquement (`server-only`)
│   ├── auth/          Session JWT signée (jose), mots de passe (bcrypt), Data Access Layer
│   ├── services/      Cas d'usage : autorisation + règles + transaction + audit
│   ├── queries/       Lectures (read models) toujours filtrées par entreprise
│   ├── pdf/           Génération du PDF de facture
│   └── files.ts       Stockage sécurisé des justificatifs
├── actions/           Server Actions fines : validation Zod → service → revalidation
├── lib/validation/    Schémas Zod partagés
├── components/        Composants réutilisables (ui/, forms/, charts/, forecast/, layout/)
├── app/               Routes App Router (pages, loading, error, not-found, route handlers)
└── proxy.ts           Redirection optimiste des visiteurs non connectés
```

Principes appliqués : séparation domaine / infrastructure / présentation, **Data Access Layer** unique pour l'authentification et l'autorisation, validation des entrées côté client (attributs HTML) **et** côté serveur (Zod), erreurs métier typées (`BusinessRuleError`, `ForbiddenError`…) converties en messages de formulaire, transactions pour toute écriture financière, états de **chargement**, **erreur** et **liste vide** sur chaque écran, interface responsive et navigable au clavier.

## 10. Modèle de données

Voir [`prisma/schema.prisma`](prisma/schema.prisma) (commenté).

```
User ─< Membership >─ Company
Company ─< Contact ─< Invoice ─< InvoiceLine
                      Invoice ─< Payment ─── Movement (1–1)
Company ─< Expense ─── Movement (1–1, une fois payée)
Company ─< Movement (grand livre des opérations réalisées)
Company ─< PlannedFlow, Retainer ─< Invoice (une par mois)
Company ─< Scenario ─< ScenarioAdjustment     (hypothèses, jamais appliquées aux données)
Company ─< AuditLog
```

## 11. Tests

- **Unitaires** (`tests/`, Vitest) : 37 tests sur la monnaie, les factures, le workflow des dépenses, le moteur de prévision, l'autonomie de trésorerie et la simulation — dont l'exemple chiffré du sujet.
- **End-to-end** (`e2e/`, Playwright) en **Page Object Model** : chaque écran est représenté par une classe (`e2e/pages/*.page.ts`) injectée par des fixtures (`e2e/fixtures.ts`). Les specs décrivent le parcours métier sans sélecteurs bruts :
  - `soutenance.spec.ts` : le scénario de soutenance complet ;
  - `permissions.spec.ts` : droits par rôle, dépense refusée non payable, paiement comptabilisé une seule fois, isolation entre entreprises ;
  - `demo-data.spec.ts` : l'exemple du sujet sur les données de démo.

```bash
npm test
npx playwright install chromium   # une seule fois
npm run test:e2e
```

## 12. Déploiement

SQLite convient au développement et à la démonstration. Pour un hébergement (Vercel, Render…), utiliser PostgreSQL :

1. Dans `prisma/schema.prisma`, remplacer `provider = "sqlite"` par `provider = "postgresql"`.
2. Supprimer `prisma/migrations`, puis `npx prisma migrate dev --name init` sur une base PostgreSQL (Neon, Supabase…).
3. Définir `DATABASE_URL`, `SESSION_SECRET`, `APP_TIMEZONE` chez l'hébergeur ; commande de build : `prisma migrate deploy && next build`.
4. Les justificatifs étant stockés sur disque, utiliser un hébergeur avec disque persistant (Render, Railway) ou adapter `src/server/files.ts` à un stockage objet (S3).

## 13. Choix techniques

| Choix | Justification |
|---|---|
| Next.js 16 (App Router), React 19, TypeScript strict | Exigence du sujet ; Server Components pour les lectures, Server Actions pour les écritures |
| `cacheComponents` désactivé | Toutes les pages affichent des données financières propres à l'utilisateur, qui doivent être fraîches : rendu à la demande, sans cache |
| Prisma + SQLite | Base persistante sans installation ; migration vers PostgreSQL triviale |
| Montants en millimes (`Int`) | Précision exacte, aucune erreur de virgule flottante |
| Zod | Mêmes schémas pour valider toutes les entrées serveur |
| Sessions JWT signées (jose) en cookie `httpOnly` | Simple, sans service externe ; autorisation revérifiée à chaque requête |
| Recharts | Graphiques de projection et de comparaison (2 séries, une seule échelle, zones de manque de liquidités) |
| pdf-lib | Génération du PDF côté serveur, sans navigateur |
| Tailwind CSS 4 | Jetons de design centralisés dans `globals.css` |

## 14. Limites connues

- Pas d'intégration bancaire (conforme au périmètre) : les opérations sont saisies.
- Le paiement d'une dépense ne se contre-passe pas depuis la dépense : la correction passe par un mouvement manuel de trésorerie (tracé).
- Une seule devise (DT) ; plafond de 2 000 000 DT par montant (entiers 32 bits).
- Pas d'envoi d'e-mails (invitations, relances) : un membre est ajouté directement avec un mot de passe provisoire.
- Les flux planifiés ponctuels dont la date est passée ne sont plus projetés.
- Justificatifs stockés sur le disque local.

## 15. Déclaration d'utilisation de l'IA

Conformément au sujet, l'utilisation d'outils d'IA est déclarée : ce projet a été réalisé avec l'assistance de **Claude (Anthropic)** via Claude Code, pour l'analyse des sujets, la conception de l'architecture, la génération du code, des tests et de cette documentation. Chaque membre de l'équipe doit relire, comprendre et savoir expliquer et modifier le code présenté lors de la soutenance.
