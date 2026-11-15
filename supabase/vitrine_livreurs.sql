-- ============================================================
-- Vue « courses livreur » : commandes enrichies de l'identité client.
-- À jouer dans le SQL Editor Supabase si la vue manque (erreur 400
-- sur /rest/v1/vitrine_livreurs).
-- ============================================================

-- La vue joint `profiles` si elle existe ; sinon on tolère son absence.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'profiles') then
    execute $v$
      create or replace view public.vitrine_livreurs as
        select
          c.*,
          coalesce(c.client_nom, p.nom) as cliente_nom,
          coalesce(c.client_village, p.village) as cliente_village,
          coalesce(c.client_tel, p.telephone_237) as cliente_tel
        from public.commandes c
        left join public.profiles p on p.id::text = c.consommateur_id
    $v$;
  else
    execute $v$
      create or replace view public.vitrine_livreurs as
        select
          c.*,
          c.client_nom as cliente_nom,
          c.client_village as cliente_village,
          c.client_tel as cliente_tel
        from public.commandes c
    $v$;
  end if;
end $$;

-- Accès anon comme les autres tables de l'app (à durcir après Supabase Auth).
grant select on public.vitrine_livreurs to anon;
