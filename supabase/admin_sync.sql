-- MBOA BIO — tables de synchronisation multi-appareils (admins)
-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.
--
-- ⚠️ Ces tables sont accessibles avec la clé anon (publique dans le bundle).
--    Elles ne contiennent que des données d'administration ; les mots de
--    passe y figurent sous forme de hash salé SHA-256. Pour une sécurité
--    renforcée, migrer vers Supabase Auth + RPC sécurisées.

-- Comptes admin / super admin répliqués entre appareils.
create table if not exists public.admin_comptes (
  id text primary key,
  data jsonb not null,
  maj_le timestamptz not null default now()
);

alter table public.admin_comptes enable row level security;

-- Lecture/écriture anonymes : l'app utilise la clé anon sans session Supabase.
drop policy if exists "admin_comptes_anon" on public.admin_comptes;
create policy "admin_comptes_anon" on public.admin_comptes
  for all to anon
  using (true)
  with check (true);

-- Fil d'activité admin partagé entre appareils.
create table if not exists public.admin_activite (
  id text primary key,
  auteur text not null,
  action text not null,
  detail text,
  quand timestamptz not null default now()
);

alter table public.admin_activite enable row level security;

drop policy if exists "admin_activite_anon" on public.admin_activite;
create policy "admin_activite_anon" on public.admin_activite
  for all to anon
  using (true)
  with check (true);

-- Index pour les lectures récentes.
create index if not exists admin_activite_quand_idx on public.admin_activite (quand desc);
create index if not exists admin_comptes_maj_idx on public.admin_comptes (maj_le desc);
