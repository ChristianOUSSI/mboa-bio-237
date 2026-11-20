-- Ajout de la colonne archive pour permettre de masquer/vider le fil d'activité admin
-- Sans cela, le journal grossit indéfiniment

ALTER TABLE public.admin_activite ADD COLUMN IF NOT EXISTS archive BOOLEAN NOT NULL DEFAULT false;
