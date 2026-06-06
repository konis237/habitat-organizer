# Plan — App de gestion locative

Application complète d'après tes specs (.mdx), adaptée à la stack Lovable (TanStack Start + Supabase via Lovable Cloud, pas Next.js). Design inspiré Binance : fond noir/charbon, accent jaune `#F0B90B`, typographie nette (IBM Plex Sans), tableaux denses, badges colorés discrets.

## Acte 1 — Setup

1. **Activer Lovable Cloud** (Supabase managé)
2. **Schéma DB** — migration créant les 6 tables : `proprietes`, `locataires`, `contrats`, `loyers`, `factures_eau`, `paiements` + contraintes UNIQUE, FK, RLS (authenticated only), GRANTs
3. **Auth** — page `/auth` email/password (pas d'inscription publique — admin créé manuellement)
4. **Layout `_authenticated`** avec sidebar 8 entrées

## Acte 2 — Pages

| Route | Contenu |
|---|---|
| `/` Dashboard | 6 cartes stats + prochaines échéances 7j + 5 derniers paiements |
| `/proprietes` | CRUD biens (Sheet) |
| `/locataires` | CRUD + détail `/locataires/[id]` |
| `/contrats` | Création (déclenche calcul `prochaine_echeance`, marque propriété occupée, génère 1ère échéance) + clôture |
| `/loyers` | Liste mensuelle + saisie paiement (logique partiel/payé) |
| `/eau` | Identique loyers sur `factures_eau` |
| `/paiements` | Registre lecture + filtres |
| `/echeances` | Retards / 7j / futurs |
| `/revenus` | 4 métriques + 2 graphiques Recharts + tableau mensuel |

## Acte 3 — Logique métier

- Calcul `prochaine_echeance` côté serverFn à la création de contrat
- Algorithme paiement partiel → màj `montant_paye`, `reste`, `statut`
- Génération mensuelle : bouton manuel "Générer échéances du mois" dans le dashboard (pas de cron auto en v1 — peut être ajouté ensuite)
- Tous les écrits via `createServerFn` + `requireSupabaseAuth`

## Design system (Binance-like)

- Fond : `oklch(0.16 0 0)` charbon, surfaces `oklch(0.20 0 0)`
- Accent primaire : jaune Binance `#F0B90B` → `oklch(0.78 0.16 85)`
- Vert succès / rouge danger discrets
- Police : Inter (corps), IBM Plex Mono pour chiffres FCFA
- Tableaux denses, bordures subtiles, hover row jaune léger

## Notes d'adaptation

- Stack = **TanStack Start**, pas Next.js → routes en `src/routes/`, pas de middleware Next, garde de session via layout `_authenticated` (déjà conventionnel sur Lovable)
- Pas d'Edge Functions Supabase → toute la logique en `createServerFn`
- Génération mensuelle des échéances = action manuelle (cron pg_cron pourra être ajouté en v2 si tu veux)

Vu l'ampleur, je livre v1 d'un coup. Confirme et je lance.
