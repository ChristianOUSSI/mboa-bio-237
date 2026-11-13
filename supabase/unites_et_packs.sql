-- MBOA BIO — unités « boite »/« verre » et composition des plats (packs)
-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.
--
-- Sans ces migrations, l'app reste fonctionnelle en local (IndexedDB) :
-- les inserts distants de produits avec ces unités échoueront silencieusement
-- et la vitrine ne renverra pas la composition des plats.

-- 1) Nouvelles unités de mesure pour les produits.
alter type public.unite_enum add value if not exists 'boite';
alter type public.unite_enum add value if not exists 'verre';

-- 2) La vitrine doit exposer la composition des plats (pack_composants jsonb)
--    pour que la page « contenu du plat » fonctionne pour les clientes en ligne.
--    Si `vitrine` est une vue sur `produits`, la colonne est déjà héritée ;
--    sinon on l'ajoute explicitement.
alter table public.vitrine add column if not exists pack_composants jsonb;

-- 3) Catégories de plats créées automatiquement par l'admin (table `categories`).
--    Si elle n'existe pas encore :
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nom text not null,
  emoji text default '🏷️',
  created_le timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_anon" on public.categories;
create policy "categories_anon" on public.categories
  for all to anon
  using (true)
  with check (true);
