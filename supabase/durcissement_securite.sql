-- ============================================================
-- MBOA BIO 237 - Durcissement sécurité (à jouer APRÈS Supabase Auth)
--
-- ⚠️ NE PAS activer ces policies tant que l'app n'utilise pas
--    Supabase Auth : sans session authentifiée, `auth.uid()` est
--    NULL partout et TOUTES les requêtes seraient rejetées.
--
-- Ordre recommandé :
--   1. Activer Supabase Auth + migrer les comptes (cf. plan ci-dessous)
--   2. Ajouter une colonne `owner_id uuid` sur les tables métier
--   3. Jouer ce fichier pour remplacer les policies `using (true)`
--
-- En attendant, la table `admin_comptes` reste lisible en anon :
-- les mots de passe doivent rester forts côté utilisateurs.
-- ============================================================

-- ------------------------------------------------------------
-- ÉTAPE 1 : policies par rôle (exemple commandes)
-- À adapter selon le mapping profil ↔ auth.users.id.
-- ------------------------------------------------------------

-- drop policy if exists "commandes_anon_all" on public.commandes;
-- create policy "commandes_select_soi_meme" on public.commandes
--   for select using (consommateur_id = auth.uid()::text
--                      or public.est_admin());
-- create policy "commandes_insert_soi_meme" on public.commandes
--   for insert with check (consommateur_id = auth.uid()::text);
-- create policy "commandes_update_admin" on public.commandes
--   for update using (public.est_admin()) with check (public.est_admin());
-- create policy "commandes_delete_superadmin" on public.commandes
--   for delete using (public.est_superadmin());

-- ------------------------------------------------------------
-- ÉTAPE 2 : helpers de rôle (security definer pour éviter la récursion)
-- Nécessite une table `profils` avec role + auth_user_id.
-- ------------------------------------------------------------

-- create or replace function public.est_admin()
-- returns boolean language sql security definer stable as $$
--   select exists (
--     select 1 from public.profils
--     where auth_user_id = auth.uid() and role in ('admin','superadmin')
--   );
-- $$;

-- create or replace function public.est_superadmin()
-- returns boolean language sql security definer stable as $$
--   select exists (
--     select 1 from public.profils
--     where auth_user_id = auth.uid() and role = 'superadmin'
--   );
-- $$;

-- ------------------------------------------------------------
-- ÉTAPE 3 : verrouiller admin_comptes une fois Auth en place
-- (les hash locaux ne devraient plus y transiter)
-- ------------------------------------------------------------

-- drop policy if exists "admin_comptes_anon" on public.admin_comptes;
-- create policy "admin_comptes_admin" on public.admin_comptes
--   for all using (public.est_admin()) with check (public.est_admin());

-- ------------------------------------------------------------
-- PLAN DE MIGRATION AUTH (côté code, chantier séparé)
-- ------------------------------------------------------------
-- 1. Activer Supabase Auth (email + téléphone)
-- 2. creerCompte() → supabase.auth.signUp() + écriture profil
-- 3. seConnecter() → supabase.auth.signInWithPassword()
-- 4. Sessions gérées par Supabase (fini les hash côté client)
-- 5. Garder IndexedDB comme cache hors-ligne (déjà le cas)
-- 6. Migration douce : comptes existants réinitialisés une fois
-- ============================================================
