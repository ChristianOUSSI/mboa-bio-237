-- Colonnes WhatsApp et refus pour les candidatures fournisseurs.
-- À jouer dans le SQL Editor Supabase.

alter table public.fournisseurs
  add column if not exists whatsapp text,
  add column if not exists refuse_le timestamptz;
