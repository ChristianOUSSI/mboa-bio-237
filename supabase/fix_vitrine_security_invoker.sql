-- Fix lint SECURITY DEFINER : la vue vitrine doit respecter les RLS de l'utilisateur
-- au lieu d'utiliser les permissions du propriétaire

-- Supprimer et recréer la vue avec security_invoker = true
drop view if exists public.vitrine;
create view public.vitrine with (security_invoker = true) as select * from public.produits;

-- Vérifier que les policies RLS sur produits sont correctes
-- (lecture publique pour la vitrine, écriture réservée aux admins)
-- Ces policies sont déjà en place dans schema_pwa.sql
