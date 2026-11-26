<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commandes projet

- Build : `npm run build` (Next.js 16 + Turbopack)
- Tests unitaires : `npm test` (scripts/test_*.mjs — promos, unites, suivi)
- Lint : `npx eslint src` (0 erreur tolérée ; warnings `<img>` volontaires pour les data URLs)
- Typecheck : `npx tsc --noEmit`

## Conventions

- `setState` synchrone dans un `useEffect` est refusé par le lint
  (`react-hooks/set-state-in-effect`) : différer avec `setTimeout(..., 0)`.
- `react-hooks/purity` interdit `Date.now()`/`new Date()` au render :
  calculer la fraîcheur dans les fonctions de chargement/intervalles.
- Persistance : `src/core/data/base_locale.ts` (cache + file hors-ligne),
  `src/core/data/depots.ts` (toutes les lectures/écritures métier +
  `notifierActiviteAdmin` pour le fil d'activité admin multi-appareils).
- i18n : toute chaîne visible passe par `useTr()` + clés dans
  `src/core/i18n/index.ts` (sections FR puis EN — ajouter les deux).
- SQL Supabase : fichiers dans `supabase/*.sql`, à exécuter à la main
  dans le SQL Editor. `supabase/functions/` = Edge Functions Deno
  (exclues du tsconfig front).
- Ne pas toucher à la couche auth (`src/core/auth/`) sans demande
  explicite — chantier Supabase Auth gelé pour l'instant.
