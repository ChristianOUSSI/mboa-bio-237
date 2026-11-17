-- Tombstones de comptes supprimés : sans cette table, un appareil qui
-- possède encore le compte en cache local le republierait après sa
-- suppression par le super admin.
-- À exécuter dans Supabase : SQL Editor → New query → Run.

create table if not exists public.comptes_supprimes (
  id text primary key,
  supprime_le timestamptz not null default now()
);

alter table public.comptes_supprimes enable row level security;

drop policy if exists "comptes_supprimes_anon" on public.comptes_supprimes;
create policy "comptes_supprimes_anon" on public.comptes_supprimes
  for all to anon
  using (true)
  with check (true);
