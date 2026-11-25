-- ============================================================
-- MBOA BIO 237 - Clé super admin vérifiée côté serveur
--
-- Le mot de passe maître était en dur dans le bundle JS : n'importe
-- qui pouvait le lire et ouvrir une session superadmin.
-- Désormais la vérification se fait en base : le secret ne quitte
-- jamais Supabase.
--
-- ⚠️ REMPLACE 'CADC' ci-dessous par TA clé secrète forte, puis
--    exécute ce script UNE SEULE FOIS dans le SQL Editor.
--    (Garde 'CADC' si tu veux conserver l'ancien mot de passe.)
-- ============================================================

create or replace function public.verifier_cle_superadmin(p_mdp text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_mdp = 'CADC';
$$;

-- Accessible à l'app (anon) mais pas listable : la fonction ne fait
-- que comparer, elle ne révèle rien.
revoke all on function public.verifier_cle_superadmin(text) from public;
grant execute on function public.verifier_cle_superadmin(text) to anon, authenticated;
