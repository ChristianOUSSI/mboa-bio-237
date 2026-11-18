-- Annonces du comptoir : promotions, infos, produits phares.
-- À exécuter dans Supabase : SQL Editor → New query → Run.

create table if not exists public.annonces (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info' check (type in ('promo', 'info', 'phare')),
  titre text not null,
  texte text not null default '',
  actif boolean not null default true,
  created_le timestamptz not null default now()
);

alter table public.annonces enable row level security;

drop policy if exists "annonces_anon" on public.annonces;
create policy "annonces_anon" on public.annonces
  for all to anon
  using (true)
  with check (true);

create index if not exists annonces_actif_idx on public.annonces (actif, created_le desc);

-- Lien optionnel annonce → produit (rend la promo déterministe).
alter table public.annonces add column if not exists produit_slug text;

-- Date d'expiration optionnelle (promos flash).
alter table public.annonces add column if not exists expire_le timestamptz;

-- Code promo saisissable par le client au checkout (optionnel).
alter table public.annonces add column if not exists code text;
