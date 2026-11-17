-- ============================================================
-- Paramètres globaux de l'app (tarif de livraison, etc.).
-- cle = nom du paramètre, valeur = jsonb libre.
-- À jouer dans le SQL Editor Supabase.
-- ============================================================

create table if not exists public.parametres (
  cle text primary key,
  valeur jsonb not null,
  maj_le timestamptz not null default now()
);

alter table public.parametres enable row level security;

-- Même politique permissive que le reste de l'app pour l'instant ;
-- à durcir avec les policies par rôle lors de la migration Auth.
drop policy if exists parametres_anon on public.parametres;
create policy parametres_anon on public.parametres
  for all using (true) with check (true);
