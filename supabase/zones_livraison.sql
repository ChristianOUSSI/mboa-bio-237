-- Table des zones de livraison paramétrables par l'admin
-- Chaque zone a un nom (quartier) et un prix de livraison
-- Le panier utilise cette table pour calculer les frais selon le quartier choisi

CREATE TABLE IF NOT EXISTS public.zones_livraison (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  prix INTEGER NOT NULL DEFAULT 1000,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insérer les zones par défaut si la table est vide
INSERT INTO public.zones_livraison (id, nom, prix, actif)
SELECT
  'akwa' AS id,
  'Akwa' AS nom,
  1000 AS prix,
  true AS actif
WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'akwa')

UNION ALL SELECT 'bali', 'Bali', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'bali')
UNION ALL SELECT 'bepanda', 'Bépanda', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'bepanda')
UNION ALL SELECT 'bonaberi', 'Bonabéri', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'bonaberi')
UNION ALL SELECT 'bonamoussadi', 'Bonamoussadi', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'bonamoussadi')
UNION ALL SELECT 'bonanjo', 'Bonanjo', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'bonanjo')
UNION ALL SELECT 'bonapriso', 'Bonapriso', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'bonapriso')
UNION ALL SELECT 'deido', 'Deïdo', 1000, true WHERE NOT EXISTS (SELECT 1 FROM public.zones_livraison WHERE id = 'deido');

-- Activer RLS (Row Level Security)
ALTER TABLE public.zones_livraison ENABLE ROW LEVEL SECURITY;

-- Stratégie : seul le super admin peut modifier, tout le monde peut lire
CREATE POLICY "Zones lecture publique" ON public.zones_livraison
  FOR SELECT USING (true);

CREATE POLICY "Zones modification super admin" ON public.zones_livraison
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'superadmin'
    )
  );
