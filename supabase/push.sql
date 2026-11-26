-- Notifications push Web Push : abonnements des appareils.
-- À exécuter dans Supabase SQL Editor.
--
-- MISE EN SERVICE (une fois) :
--   1) Générer les clés VAPID :  npx web-push generate-vapid-keys
--   2) Déployer la fonction :   supabase functions deploy notifier-push
--   3) Secrets :                supabase secrets set \
--        VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
--        VAPID_SUBJECT=mailto:contact@exemple.cm \
--        SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
--   4) Ajouter NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clé publique> dans
--      .env.local / Vercel pour que les appareils s'abonnent.
--   5) Créer les webhooks (Dashboard → Database → Webhooks) :
--        table messages  INSERT → POST <url-fonction>
--        table commandes UPDATE (statut) → POST <url-fonction>
--      avec header Authorization: Bearer <anon key>.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  profil_id text not null,
  role text not null default '',
  p256dh text not null,
  auth text not null,
  created_le timestamptz not null default now()
);

create index if not exists push_subs_profil_idx on public.push_subscriptions (profil_id);
create index if not exists push_subs_role_idx on public.push_subscriptions (role);

alter table public.push_subscriptions enable row level security;

-- Application 100 % client avec clé anon : chacun gère ses abonnements.
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'anon_all'
  ) then
    create policy "anon_all" on public.push_subscriptions
      for all using (true) with check (true);
  end if;
end $$;
