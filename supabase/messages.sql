-- Messagerie intégré : client/fournisseur/livreur ↔ admins.
-- À exécuter dans Supabase SQL Editor.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  expediteur_id text not null,
  expediteur_role text not null,
  expediteur_nom text not null default '',
  destinataire_id text,
  destinataire_role text,
  texte text not null default '',
  audio text,
  lu boolean not null default false,
  created_le timestamptz not null default now()
);

create index if not exists messages_created_idx on public.messages (created_le desc);
create index if not exists messages_destinataire_idx on public.messages (destinataire_id);
create index if not exists messages_expediteur_idx on public.messages (expediteur_id);

alter table public.messages enable row level security;

-- Application 100 % client avec clé anon : lecture/écriture ouvertes,
-- comme les autres tables du projet.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'anon_all'
  ) then
    create policy "anon_all" on public.messages
      for all using (true) with check (true);
  end if;
end $$;
