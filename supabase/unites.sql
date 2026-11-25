-- Unités de vente multiples par produit.
-- Exemple : la tomate se vend au kg (500 F) ET à la pièce (200 F).
-- Le client choisit son unité sur la carte produit et voit le prix
-- correspondant. Format jsonb : [{ "unite": "kg", "prix": 500 }, ...]
-- Quand la colonne est NULL ou vide, le produit garde son
-- comportement actuel (unite + prix uniques).

alter table public.produits
  add column if not exists unites jsonb;

comment on column public.produits.unites is
  'Unites de vente alternatives [{unite, prix}] - le client choisit';
