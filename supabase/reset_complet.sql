-- ============================================================
-- MBOA BIO 237 - RESET COMPLET de la base Supabase
--
-- ⚠️  DESTRUCTION TOTALE DES DONNÉES : comptes, commandes, stock,
--     fournisseurs, livreurs, positions GPS — TOUT est effacé.
--
-- Usage : Supabase → SQL Editor → New query → coller TOUT ce
-- fichier → Run. Une seule exécution suffit.
--
-- Le script :
--   1. Supprime toutes les vues puis toutes les tables de l'app
--   2. Recrée le schéma complet (tables + vues + policies RLS)
--   3. Ajoute les colonnes de livraison, GPS, paramètres,
--      tombstones de comptes supprimés
--   4. Réinsère le catalogue de base
--
-- Après exécution : les comptes bootstrap (admin + superadmin)
-- sont recréés automatiquement à la prochaine synchro de l'app.
-- Les comptes créés à la main devront être refaits.
-- ============================================================

-- ---------- 1. VUES (dépendances d'abord) ----------
drop view if exists public.vitrine_livreurs;
drop view if exists public.commandes_clientes;
drop view if exists public.vitrine;

-- ---------- 2. TABLES ----------
drop table if exists public.comptes_supprimes;
drop table if exists public.positions;
drop table if exists public.parametres;
drop table if exists public.admin_activite;
drop table if exists public.admin_comptes;
drop table if exists public.categories_perso;
drop table if exists public.achats;
drop table if exists public.catalogue;
drop table if exists public.fournisseurs;
drop table if exists public.livreurs;
drop table if exists public.profiles;
drop table if exists public.commandes;
drop table if exists public.produits;

-- ============================================================
-- 3. SCHÉMA COMPLET (tables + vues + policies + seed catalogue)
-- ============================================================

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

-- (vitrine_livreurs est créée à la fin du script, après `profiles`.)

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
    'achats', 'catalogue', 'admin_comptes', 'admin_activite', 'categories_perso', 'annonces'
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

-- Vue « courses livreur » : commandes + identité client en colonnes.
-- Créée ici : `profiles` doit exister avant.
drop view if exists public.vitrine_livreurs;
create view public.vitrine_livreurs as
  select
    c.*,
    coalesce(c.client_nom, p.nom) as cliente_nom,
    coalesce(c.client_village, p.village) as cliente_village,
    coalesce(c.client_tel, p.telephone_237) as cliente_tel
  from public.commandes c
  left join public.profiles p on p.id::text = c.consommateur_id;

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


-- ============================================================
-- 4. COLONNES SUPPLÉMENTAIRES (livraison, GPS, params, tombstones)
-- ============================================================

-- ============================================================
-- Adresse de livraison client sur les commandes.
-- Quartier (obligatoire à la commande) + repère précis (facultatif).
-- À jouer dans le SQL Editor Supabase.
-- ============================================================

alter table public.commandes
  add column if not exists livraison_quartier text,
  add column if not exists livraison_detail text,
  add column if not exists livraison_lat double precision,
  add column if not exists livraison_lng double precision,
  add column if not exists frais_livraison integer;


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


-- ============================================================
-- Paramètres globaux de l'app (tarif de livraison, etc.).
-- cle = nom du paramètre, valeur = jsonb libre.
-- À jouer dans le SQL Editor Supabase.
-- ============================================================

create table if not exists public.parametres (
  cle text primary key,
  valeur jsonb not null,
  maj_le timestamptz not null default now()
);

alter table public.parametres enable row level security;

-- Même politique permissive que le reste de l'app pour l'instant ;
-- à durcir avec les policies par rôle lors de la migration Auth.
drop policy if exists parametres_anon on public.parametres;
create policy parametres_anon on public.parametres
  for all using (true) with check (true);


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

-- ============================================================
create unique index if not exists produits_slug_idx on public.produits (slug);

-- Vitrine de départ : produits en stock pour que le marché
-- consommateur ne soit pas vide au lancement.
-- L'admin ajuste quantités/prix depuis /admin/stock.
-- ============================================================
insert into public.produits (slug, nom, categorie, emoji, quantite, prix, unite, prix_achat, perissable)
values
  ('mangue',        'Mangue',            'fruit',     '🥭', 40,  350,  'kg',        250, true),
  ('banane',        'Banane douce',      'fruit',     '🍌', 60,  250,  'kg',        180, true),
  ('plantain',      'Plantain',          'fruit',     '🍌', 25, 2500,  'régime',    2000, true),
  ('ananas',        'Ananas',            'fruit',     '🍍', 15,  500,  'pièce',     400, true),
  ('pasteque',      'Pastèque',          'fruit',     '🍉', 12,  300,  'pièce',     220, true),
  ('papaye',        'Papaye',            'fruit',     '🍈', 10,  300,  'pièce',     200, true),
  ('corossol',      'Corossol',          'fruit',     '🍈', 20,  200,  'pièce',     140, true),
  ('manioc',        'Manioc',            'tubercule', '🍠', 80,  150,  'pièce',     100, false),
  ('macabo',        'Macabo',            'tubercule', '🍆', 30,  350,  'boule',     250, false),
  ('patate_douce',  'Patate douce',      'tubercule', '🍠', 45,  200,  'kg',        140, false),
  ('pomme_terre',   'Pomme de terre',    'tubercule', '🥔', 35,  400,  'kg',        300, false),
  ('tomate',        'Tomate',            'legume',    '🍅', 50,  500,  'litre',     350, true),
  ('oignon',        'Oignon',            'legume',    '🧅', 40,  750,  'litre',     550, false),
  ('gombo',         'Gombo',             'legume',    '🥬', 20,  600,  'kg',        420, true),
  ('ndole',         'Feuilles de ndomè', 'legume',    '🥬', 15,  300,  'botte',     200, true),
  ('haricot',       'Haricots',          'legume',    '🫘', 25,  700,  'kg',        520, false),
  ('riz',           'Riz',               'cereale',   '🍚', 100, 480,  'kg',        420, false),
  ('mais',          'Maïs',              'cereale',   '🌽', 60,  400,  'litre',     300, false),
  ('arachide',      'Arachides',         'cereale',   '🥜', 30,  800,  'litre',     650, false),
  ('fonio',         'Fonio',             'cereale',   '🌾', 20,  500,  'kg',        400, false),
  ('boeuf',         'Bœuf',              'viande',    '🥩', 15, 3500,  'kg',       3000, true),
  ('poulet',        'Poulet',            'viande',    '🍗', 12, 4000,  'pièce',    3400, true),
  ('poisson',       'Tilapia',           'poisson',   '🐟', 18, 2500,  'kg',       2000, true),
  ('crevette',      'Crevettes',         'poisson',   '🦐', 10, 3500,  'kg',       2900, true),
  ('huile',         'Huile de palme',    'huile',     '🫒', 25, 1500,  'bouteille',1200, false),
  ('huile_mais',    'Huile de maïs',     'huile',     '🫙', 20, 1200,  'bouteille',950,  false),
  ('sel',           'Sel',               'huile',     '🧂', 50,  200,  'kg',        140, false),
  ('poivre',        'Poivre',            'huile',     '🌶️', 15, 1500,  'kg',       1100, false),
  ('jus',           'Jus naturel',       'boisson',   '🧃', 24,  500,  'bouteille',380, true),
  ('lait',          'Lait',              'boisson',   '🥛', 20,  600,  'litre',     450, true),
  ('bissap',        'Bissap',            'boisson',   '🍹', 30,  250,  'bouteille',180, true)
on conflict (slug) do nothing;

-- Annonces du comptoir : promotions, infos, produits phares.
-- À exécuter dans Supabase : SQL Editor → New query → Run.

create table if not exists public.annonces (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info' check (type in ('promo', 'info', 'phare')),
  titre text not null,
  texte text not null default '',
  actif boolean not null default true,
  created_le timestamptz not null default now()
);

alter table public.annonces enable row level security;

drop policy if exists "annonces_anon" on public.annonces;
create policy "annonces_anon" on public.annonces
  for all to anon
  using (true)
  with check (true);

create index if not exists annonces_actif_idx on public.annonces (actif, created_le desc);
