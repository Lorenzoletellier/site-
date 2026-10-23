# Pétille — sodas artisanaux en canette

Site e-commerce de sodas artisanaux. Next.js 16 (App Router, Server Actions) + Supabase (Postgres, Auth, RLS), déployé sur Vercel.

## Lancer en local

```bash
pnpm install
pnpm dev
```

Puis ouvrir http://localhost:3000. Créer `.env.local` (non commité) :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Fonctionnalités

**Client**
- Inscription, connexion, profil modifiable
- Gamme filtrable par famille (Fraîches, Fruitées, Gourmandes), barre de sucre comparée à un soda classique
- Fiche produit en modale : ingrédients, valeurs nutritionnelles, accord, avis (réservés aux acheteurs)
- Panier en tiroir, **enregistré en base** sur le compte, quantités plafonnées au stock
- Commande : adresse, code promo vérifié en base, livraison offerte dès 25 €, paiement simulé
- Historique et détail des commandes
- Mur des bulles (messages publics), formulaire de contact et newsletter enregistrés en base

**Administrateur** (`/admin`, rôle `admin` uniquement)
- Tableau de bord KPI : CA total et 30 jours, commandes, panier moyen, canettes vendues, clients, CA quotidien, top saveurs, CA par famille, saveurs les plus consultées et conversion, commandes à expédier, stocks faibles, messages non traités, inscrits newsletter
- Gestion des commandes (statuts)
- Gestion de la gamme : stock, retrait de la vente, création d'une saveur avec aperçu de la canette en direct
- Modération du mur des bulles et traitement des messages de contact

Les canettes sont des illustrations SVG générées à partir des couleurs et du motif stockés en base (`components/Can.tsx`) : aucune image à héberger.

## Base de données

Migrations versionnées dans `supabase/migrations/`.

| Table | Rôle |
|---|---|
| `profiles` | profil lié à `auth.users`, `role` = `client` ou `admin` (créé par trigger) |
| `categories` | familles de saveurs |
| `products` | saveur : prix en centimes, stock, sucre, kcal, ingrédients, couleurs et motif de la canette |
| `cart_items` | panier persistant |
| `orders` / `order_items` | commandes, nom et prix figés au moment de l'achat |
| `coupons` | codes promo (`BIENVENUE10`, `PSCHITT20`) |
| `reviews` | avis 1–5, uniquement après achat |
| `product_views` | ouvertures de fiche (KPI conversion) |
| `wall_messages` | mur des bulles, modérable |
| `contact_messages` | formulaire de contact |
| `newsletter_subscribers` | inscrits newsletter |

- **RLS** sur toutes les tables : un client ne voit que ses données, l'admin voit tout, un client ne peut pas modifier son `role`.
- **`place_order()`** : transaction qui verrouille les stocks (`for update`), recalcule les prix côté serveur, applique code promo et port, décrémente les stocks et vide le panier.
- **Vues KPI** (`kpi_*`) en `security_invoker` : la RLS s'applique, seul un admin voit les chiffres globaux.
- Contraintes `check` (couleurs hex, sucre, code postal, e-mail…), clés étrangères indexées, `enum` pour statuts, rôles et motifs.

## Skills utilisés

Skills d'agent installés dans `.agent/skills/` (Antigravity / Claude Code) :

| Skill | Utilisation concrète |
|---|---|
| `postgres-patterns` / `database-migrations` | schéma normalisé, index sur les FK, RLS avec `(select auth.uid())`, migrations versionnées |
| `security-review` | validation des entrées dans chaque Server Action, redirections internes uniquement, RLS + contrôle admin côté serveur |
| `dashboard-builder` | dashboard admin organisé par questions : *Ça pétille ? / Qu'est-ce qui se boit ? / À traiter* |
| `frontend-design-direction` | identité Pétille (jaune soleil, encre, Bricolage Grotesque), états vides, erreurs et succès sur chaque page |
| `react-patterns` / `frontend-patterns` / `nextjs-turbopack` | Server Components par défaut, `useActionState`, Server Actions, `router.refresh()` après mutation |

## Créer le compte admin

S'inscrire sur le site, puis dans Supabase → SQL Editor :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ton-email@exemple.com');
```
