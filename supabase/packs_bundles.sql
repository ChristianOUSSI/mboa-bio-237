-- Extension packs : bundles de produits + packs thematiques
-- Un bundle = tas de produits existants (ex. 10 macabos) a prix reduit
-- Un pack thematique = collection (ex. pack fruits rouges, Noel)

-- Type de pack : plat (ingredients), bundle (produits du stock), theme (collection)
ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS type_pack text DEFAULT 'plat';
-- JSON pour bundles : [{slug: "macabo", quantite: 10}, ...]
ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS bundle_produits jsonb;
-- Theme pour packs thematiques (ex. "fruits_rouges", "saint_valentin", "noel")
ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS theme text;

-- Index pour filtrer par type
CREATE INDEX IF NOT EXISTS idx_produits_type_pack ON public.produits(type_pack);
CREATE INDEX IF NOT EXISTS idx_produits_theme ON public.produits(theme);
