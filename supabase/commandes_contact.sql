-- ⚠️ REMPLACÉ par schema_pwa.sql — n exécute plus ce fichier.
-- MBOA BIO — contact client pour la livraison (« se faire appeler »)
-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.
--
-- Sans ces colonnes, l'app reste fonctionnelle : la préférence est
-- enregistrée dans le cache local et synchronisée via le file d'attente.

alter table public.commandes
  add column if not exists appel_souhaite boolean not null default false;

alter table public.commandes
  add column if not exists numero_contact text;
