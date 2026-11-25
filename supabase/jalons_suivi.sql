-- Jalons de suivi de colis : le vrai journal d'avancement côté client.
-- Chaque transition réelle (validation admin, départ moto, approche/arrivée
-- déduites du GPS, livraison, réception confirmée) y laisse une trace
-- horodatée, lisible par tous les appareils via le RPC suivi_commande.
-- À exécuter dans Supabase : SQL Editor → New query → Run.

create table if not exists public.jalons_suivi (
  commande_id text not null,
  jalon text not null check (jalon in ('panier_prepare','moto_partie','en_approche','arrive','remis')),
  horodatage timestamptz not null default now(),
  auteur text not null default 'auto',
  position jsonb,
  primary key (commande_id, jalon)
);

alter table public.jalons_suivi enable row level security;

drop policy if exists "jalons_anon" on public.jalons_suivi;
create policy "jalons_anon" on public.jalons_suivi
  for all to anon
  using (true)
  with check (true);

-- Lecture : même contrat que l'ancien suivi_commande (consommé par
-- suiviFromMaps côté app). Si l'ancienne fonction existe avec une
-- signature différente, supprime-la d'abord :
--   drop function if exists public.suivi_commande(text);
drop function if exists public.suivi_commande(text);

create function public.suivi_commande(p_commande text)
returns setof public.jalons_suivi
language sql
stable
security invoker
as $$
  select * from public.jalons_suivi
  where commande_id = p_commande
  order by horodatage;
$$;

grant execute on function public.suivi_commande(text) to anon, authenticated;

-- Écriture idempotente : un jalon par commande, réécrit si reposé
-- (ex. « arrivé » d'abord déduit du GPS puis confirmé par le livreur).
create or replace function public.ajouter_jalon(
  p_commande text,
  p_jalon text,
  p_auteur text default 'auto',
  p_position jsonb default null
)
returns void
language sql
security invoker
as $$
  insert into public.jalons_suivi (commande_id, jalon, auteur, position)
  values (p_commande, p_jalon, p_auteur, p_position)
  on conflict (commande_id, jalon) do update
    set horodatage = excluded.horodatage,
        auteur = excluded.auteur,
        position = excluded.position;
$$;

grant execute on function public.ajouter_jalon(text, text, text, jsonb) to anon, authenticated;
