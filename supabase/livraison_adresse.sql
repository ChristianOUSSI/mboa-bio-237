-- ============================================================
-- Adresse de livraison client sur les commandes.
-- Quartier (obligatoire à la commande) + repère précis (facultatif).
-- À jouer dans le SQL Editor Supabase.
-- ============================================================

alter table public.commandes
  add column if not exists livraison_quartier text,
  add column if not exists livraison_detail text;
