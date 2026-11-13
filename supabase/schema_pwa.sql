-- ============================================================
-- MBOA BIO PWA — schéma Supabase complet (mode anon, sans Auth)
-- À exécuter UNE SEULE FOIS dans Supabase : SQL Editor → New query → Run.
--
-- Ce schéma remplace les migrations du projet Flutter : il crée toutes
-- les tables/vues que la PWA utilise, avec des policies anon permissives
-- (l'app n'a pas de session Supabase Auth — la sécurité repose sur le
-- fait que ces tables ne contiennent que des données métier).
--
-- Idempotent : peut être relancé sans erreur (if not exists / or replace).
-- ============================================================

-- ---------- Produits (stock réel du comptoir) ----------
create table if not exists public.produits (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  nom text not null,
  categorie text not null default 'fruit',
  photo_reelle text,
  photo_filigranee text,
  emoji text,
  quantite numeric not null default 0,
  prix integer not null default 0,
  unite text,
  prix_achat integer,
  audio_description_url text,
  perissable boolean not null default true,
  actif boolean not null default true,
  pack_composants jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Vitrine client = vue sur les produits ----------
-- Vue auto-updatable : les UPDATE/DELETE de la PWA sur `vitrine`
-- se propagent à `produits`. La cliente ne voit que ce que l'admin
-- laisse actif (filtre complémentaire côté app : quantite > 0).
drop view if exists public.vitrine;
create view public.vitrine as select * from public.produits;

-- ---------- Commandes (devis → livraison → paiement) ----------
create table if not exists public.commandes (
  id uuid primary key default gen_random_uuid(),
  consommateur_id text,
  produits jsonb not null default '[]'::jsonb,
  statut_enum text not null default 'nouvelle',
  montant_total integer not null default 0,
  cout_achat integer not null default 0,
  montant_livre integer,
  paiement text,
  paiement_ref text,
  livraison_moto boolean not null default true,
  stock_sorti boolean not null default false,
  photo_livraison_url text,
  signature_url text,
  appel_vocal_fait boolean not null default false,
  appel_vocal_le timestamptz,
  created_at timestamptz not null default now(),
  livree_le timestamptz,
  recue_le timestamptz,
  satisfaction text,
  satisfaction_motif text,
  satisfaction_audio text,
  clos boolean not null default false,
  clos_par text,
  annule_le timestamptz,
  motif_annulation text,
  livreur_id text,
  livreur jsonb,
  nom_livreur text,
  photo_livreur text,
  moto text,
  plaque text,
  telephone_livreur text,
  tarif_livreur integer,
  tarif_course integer,
  paye_le timestamptz,
  -- Contact client pour la livraison (« se faire appeler »)
  appel_souhaite boolean not null default false,
  numero_contact text,
  -- Instantané client (affiché au livreur)
  client_nom text,
  client_village text,
  client_tel text
);

-- Vue « mes commandes » côté cliente : même table, filtrage fait par
-- la PWA via consommateur_id (pas de session Auth → pas de RLS fine).
drop view if exists public.commandes_clientes;
create view public.commandes_clientes as select * from public.commandes;

-- Vue « courses livreur » : commandes + identité client en colonnes.
drop view if exists public.vitrine_livreurs;
create view public.vitrine_livreurs as
  select
    c.*,
    coalesce(c.client_nom, p.nom) as cliente_nom,
    coalesce(c.client_village, p.village) as cliente_village,
    coalesce(c.client_tel, p.telephone_237) as cliente_tel
  from public.commandes c
  left join public.profiles p on p.id::text = c.consommateur_id;

-- ---------- Profils utilisateurs ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'consommateur',
  nom text,
  village text,
  telephone_237 text,
  langue text,
  photo_visage text,
  latitude numeric,
  longitude numeric,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Livreurs ----------
create table if not exists public.livreurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone_237 text,
  zone text,
  profil_id text,
  photo text,
  moto text,
  plaque text,
  tarif_course integer not null default 0,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Fournisseurs ----------
create table if not exists public.fournisseurs (
  id uuid primary key default gen_random_uuid(),
  profil_id text,
  nom text not null,
  telephone_237 text,
  village text,
  photo text,
  production_categorie text,
  production_libre text,
  unite text not null default 'kg',
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Achats (propositions fournisseurs → comptoir) ----------
create table if not exists public.achats (
  id uuid primary key default gen_random_uuid(),
  fournisseur_id text,
  slug text,
  nom text not null,
  categorie text,
  unite text,
  quantite numeric not null default 0,
  prix_demande integer not null default 0,
  prix_achat integer,
  photo_url text,
  emoji text,
  audio_url text,
  produit_id text,
  statut text not null default 'propose',
  motif text,
  motif_audio_url text,
  propose_le timestamptz not null default now(),
  valide_le timestamptz,
  paye_le timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Catalogue (prix de tendance pour les propositions) ----------
create table if not exists public.catalogue (
  slug text primary key,
  nom text not null,
  categorie text not null default 'fruit',
  prix_tendance integer not null default 0,
  paliers jsonb not null default '[]'::jsonb,
  perissable boolean not null default true,
  ordre integer not null default 0,
  unite_defaut text,
  unite_libelle text
);

-- ============================================================
-- Synchronisation multi-appareils (comptes + activité + catégories)
-- ============================================================

create table if not exists public.admin_comptes (
  id text primary key,
  data jsonb not null,
  maj_le timestamptz not null default now()
);

create table if not exists public.admin_activite (
  id text primary key,
  auteur text not null,
  action text not null,
  detail text,
  quand timestamptz not null default now()
);

-- Catégories personnalisées (renommée : `categories` existe déjà dans le
-- schéma d'origine avec un autre rôle — la PWA utilise `categories_perso`).
create table if not exists public.categories_perso (
  id text primary key,
  slug text not null unique,
  nom text not null,
  emoji text not null default '🏷️',
  created_le timestamptz not null default now()
);

create index if not exists admin_activite_quand_idx on public.admin_activite (quand desc);
create index if not exists admin_comptes_maj_idx on public.admin_comptes (maj_le desc);
create index if not exists produits_categorie_idx on public.produits (categorie);
create index if not exists commandes_consommateur_idx on public.commandes (consommateur_id);
create index if not exists commandes_statut_idx on public.commandes (statut_enum);

-- ============================================================
-- RLS : policies anon permissives sur TOUTES les tables.
-- La PWA n'utilise pas Supabase Auth : sans ces policies, PostgREST
-- refuse toute lecture/écriture à la clé anon.
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'produits', 'commandes', 'profiles', 'livreurs', 'fournisseurs',
    'achats', 'catalogue', 'admin_comptes', 'admin_activite', 'categories_perso'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists anon_all on public.%I', t);
    execute format(
      'create policy anon_all on public.%I for all to anon using (true) with check (true)', t);
    execute format('drop policy if exists authenticated_all on public.%I', t);
    execute format(
      'create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================
-- Seed minimal du catalogue (prix de tendance) — optionnel.
-- La PWA a un catalogue hors-ligne de secours si la table est vide.
-- ============================================================
insert into public.catalogue (slug, nom, categorie, prix_tendance, paliers, perissable, ordre, unite_defaut, unite_libelle)
values
  ('manioc', 'Manioc', 'tubercule', 500, '[500,450,400]', true, 1, 'kg', 'kg'),
  ('mais', 'Maïs', 'cereale', 400, '[400,350,300]', true, 2, 'kg', 'kg'),
  ('tomate', 'Tomate', 'legume', 300, '[300,250]', true, 3, 'kg', 'kg'),
  ('plantain', 'Plantain', 'fruit', 600, '[600,550]', true, 4, 'régime', 'régime'),
  ('mangue', 'Mangue', 'fruit', 800, '[800,700]', true, 5, 'kg', 'kg')
on conflict (slug) do nothing;
