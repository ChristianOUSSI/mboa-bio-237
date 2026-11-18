-- Vitrine de départ : 32 produits en stock sur les 8 catégories.
-- À exécuter seul dans Supabase SQL Editor (ne touche à rien d'autre).

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
