-- Positions GPS livreur/client pour le suivi de colis cross-device.
-- À exécuter dans Supabase : SQL Editor → New query → Run.

create table if not exists public.positions (
  cle text primary key,              -- "livreur:<commandeId>" ou "client:<commandeId>"
  type text not null check (type in ('livreur', 'client')),
  commande_id text not null,
  latitude double precision not null,
  longitude double precision not null,
  horodatage timestamptz not null,
  maj_le timestamptz not null default now()
);

alter table public.positions enable row level security;

drop policy if exists "positions_anon" on public.positions;
create policy "positions_anon" on public.positions
  for all to anon
  using (true)
  with check (true);

create index if not exists positions_commande_idx on public.positions (commande_id);
