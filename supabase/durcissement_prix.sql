-- ============================================================
-- Durcissement prix : le serveur recalcule le montant et borne
-- les prix client. À exécuter dans Supabase : SQL Editor → Run.
--
-- Règle : le prix envoyé par le client ne peut jamais DÉPASSER le
-- prix catalogue (produits.prix). Il peut être inférieur — c'est
-- ce qui permet les promos et codes promo calculés côté client.
-- Plancher : une remise ne descend jamais sous 50 % du catalogue
-- (les promos plus profondes se font en baissant produits.prix).
-- Les lignes sans produit correspondant gardent leur prix (articles
-- libres), plancher 1 F, quantité bornée à 10 000.
-- ============================================================

create or replace function public.creer_devis(
  p_lignes jsonb,
  p_montant integer default null,
  p_consommateur_id text default null
)
returns public.commandes
language plpgsql
as $$
declare
  v_ligne jsonb;
  v_lignes jsonb := '[]'::jsonb;
  v_slug text;
  v_prix_client integer;
  v_prix_catalogue integer;
  v_prix_final integer;
  v_quantite numeric;
  v_montant integer := 0;
  v_cmd public.commandes;
begin
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'devis vide';
  end if;

  for v_ligne in select * from jsonb_array_elements(p_lignes) loop
    v_slug := nullif(v_ligne ->> 'slug', '');
    v_prix_client := case
      when (v_ligne ->> 'prix') ~ '^-?[0-9]+$' then greatest(0, (v_ligne ->> 'prix')::integer)
      else 0
    end;
    v_quantite := case
      when (v_ligne ->> 'quantite') ~ '^[0-9]+(\.[0-9]+)?$'
        then least(10000, greatest(1, (v_ligne ->> 'quantite')::numeric))
      else 1
    end;

    -- Prix catalogue si le produit existe
    v_prix_catalogue := null;
    if v_slug is not null then
      select prix into v_prix_catalogue from public.produits where slug = v_slug limit 1;
    end if;

    if v_prix_catalogue is not null and v_prix_catalogue > 0 then
      -- Le client ne peut que baisser le prix (promo/code), jamais l'augmenter.
      v_prix_final := least(v_prix_client, v_prix_catalogue);
      v_prix_final := greatest(v_prix_final, ceil(v_prix_catalogue * 0.5));
    else
      v_prix_final := greatest(1, v_prix_client);
    end if;

    v_montant := v_montant + round(v_quantite * v_prix_final);

    -- Reconstruit la ligne avec le prix validé par le serveur
    v_lignes := v_lignes || jsonb_build_object(
      'produit_id', coalesce(v_ligne ->> 'produit_id', ''),
      'slug', coalesce(v_slug, ''),
      'nom', coalesce(v_ligne ->> 'nom', 'Article'),
      'categorie', coalesce(v_ligne ->> 'categorie', 'fruit'),
      'quantite', v_quantite,
      'prix', v_prix_final,
      'cout_achat', case
        when (v_ligne ->> 'cout_achat') ~ '^-?[0-9]+$' then (v_ligne ->> 'cout_achat')::integer
        else 0
      end,
      'photo', coalesce(v_ligne ->> 'photo', ''),
      'unite', coalesce(v_ligne ->> 'unite', 'kg')
    ) || case
      when v_ligne ? 'composants' and jsonb_array_length(coalesce(v_ligne -> 'composants', '[]'::jsonb)) > 0
      then jsonb_build_object('composants', v_ligne -> 'composants')
      else '{}'::jsonb
    end;
  end loop;

  insert into public.commandes (
    consommateur_id, produits, statut_enum, montant_total,
    cout_achat, livraison_moto
  ) values (
    p_consommateur_id, v_lignes, 'nouvelle', v_montant,
    0, true
  )
  returning * into v_cmd;

  return v_cmd;
end;
$$;

grant execute on function public.creer_devis(jsonb, integer, text) to anon;
grant execute on function public.creer_devis(jsonb, integer, text) to authenticated;
