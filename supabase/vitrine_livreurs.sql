-- ============================================================
-- DÉPRÉCIÉ : la vue vitrine_livreurs n'est plus utilisée par le code.
-- Le code lit `commandes` directement (instantanés client_*).
-- Ce script la supprime pour lever le lint SECURITY DEFINER.
-- ============================================================

drop view if exists public.vitrine_livreurs;
