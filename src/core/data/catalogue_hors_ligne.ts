import { EntreeCatalogue } from "../types/catalogue";
import { Categorie } from "../types/categorie";
import { Unite } from "../types/unite";

/**
 * The references the browser knows when the database does not answer.
 * Mirrors the seed of `0003_catalogue.sql`.
 */
export const CATALOGUE_HORS_LIGNE: EntreeCatalogue[] = [
  // Fruits
  { slug: "banane", nom: "Sweet banana", categorie: Categorie.fruit, prixTendance: 250, paliers: [2, 5, 10, 20, 50], perissable: true, ordre: 1, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "plantain", nom: "Plantain", categorie: Categorie.fruit, prixTendance: 2500, paliers: [1, 2, 4, 6, 10], perissable: true, ordre: 2, unite: Unite.regime, uniteLibelle: "bunches" },
  { slug: "papaye", nom: "Papaya", categorie: Categorie.fruit, prixTendance: 300, paliers: [1, 2, 5, 10, 20], perissable: true, ordre: 4, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "mangue", nom: "Mango", categorie: Categorie.fruit, prixTendance: 350, paliers: [2, 5, 10, 20], perissable: true, ordre: 10, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "ananas", nom: "Pineapple", categorie: Categorie.fruit, prixTendance: 500, paliers: [1, 2, 5], perissable: true, ordre: 11, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "pasteque", nom: "Watermelon", categorie: Categorie.fruit, prixTendance: 300, paliers: [1, 2, 5], perissable: true, ordre: 12, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "corossol", nom: "Soursop", categorie: Categorie.fruit, prixTendance: 200, paliers: [2, 5, 10], perissable: true, ordre: 13, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "ambarella", nom: "Ambarella", categorie: Categorie.fruit, prixTendance: 250, paliers: [2, 5, 10], perissable: true, ordre: 14, unite: Unite.kg, uniteLibelle: "kilos" },

  // Tubers
  { slug: "manioc", nom: "Cassava", categorie: Categorie.tubercule, prixTendance: 150, paliers: [5, 10, 25, 50, 100], perissable: false, ordre: 20, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "macabo", nom: "Macabo", categorie: Categorie.tubercule, prixTendance: 350, paliers: [1, 3, 5, 10, 20], perissable: false, ordre: 21, unite: Unite.boule, uniteLibelle: "balls" },
  { slug: "patate_douce", nom: "Sweet potato", categorie: Categorie.tubercule, prixTendance: 200, paliers: [5, 10, 25, 50, 100], perissable: false, ordre: 22, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "igname", nom: "White yam", categorie: Categorie.tubercule, prixTendance: 2500, paliers: [1, 2, 3, 5, 10], perissable: false, ordre: 23, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "pomme_de_terre", nom: "Potato", categorie: Categorie.tubercule, prixTendance: 400, paliers: [1, 2, 5, 10], perissable: false, ordre: 24, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "taro", nom: "Taro", categorie: Categorie.tubercule, prixTendance: 300, paliers: [2, 5, 10, 20], perissable: false, ordre: 25, unite: Unite.kg, uniteLibelle: "kilos" },

  // Vegetables and leaves
  { slug: "tomate", nom: "Tomato", categorie: Categorie.legume, prixTendance: 500, paliers: [1, 2, 5, 10], perissable: true, ordre: 30, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "oignon", nom: "Onion", categorie: Categorie.legume, prixTendance: 750, paliers: [1, 2, 5, 10], perissable: false, ordre: 31, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "gombo", nom: "Okra", categorie: Categorie.legume, prixTendance: 600, paliers: [1, 2, 5, 10], perissable: true, ordre: 32, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "haricot", nom: "Beans", categorie: Categorie.legume, prixTendance: 700, paliers: [1, 2, 5, 10], perissable: false, ordre: 33, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "ndole", nom: "Ndomè greens", categorie: Categorie.legume, prixTendance: 300, paliers: [1, 2, 3, 5, 10], perissable: true, ordre: 34, unite: Unite.botte, uniteLibelle: "bunches" },
  { slug: "feuille_manioc", nom: "Cassava leaves", categorie: Categorie.legume, prixTendance: 250, paliers: [1, 2, 5], perissable: true, ordre: 35, unite: Unite.botte, uniteLibelle: "bunches" },
  { slug: "ail", nom: "Garlic", categorie: Categorie.legume, prixTendance: 500, paliers: [1, 2, 5], perissable: false, ordre: 36, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "carotte", nom: "Carrot", categorie: Categorie.legume, prixTendance: 400, paliers: [1, 2, 5], perissable: false, ordre: 37, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "chou", nom: "Cabbage", categorie: Categorie.legume, prixTendance: 300, paliers: [1, 2, 5], perissable: true, ordre: 38, unite: Unite.kg, uniteLibelle: "kilos" },

  // Cereals and seeds
  { slug: "riz", nom: "Rice", categorie: Categorie.cereale, prixTendance: 480, paliers: [1, 2, 5, 25], perissable: false, ordre: 50, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "mais", nom: "Corn", categorie: Categorie.cereale, prixTendance: 400, paliers: [1, 2, 5, 10], perissable: false, ordre: 51, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "arachide", nom: "Peanuts", categorie: Categorie.cereale, prixTendance: 800, paliers: [1, 2, 5, 10], perissable: false, ordre: 52, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "miondo", nom: "Miondo", categorie: Categorie.cereale, prixTendance: 700, paliers: [1, 2, 5, 10], perissable: false, ordre: 61, unite: Unite.paquet, uniteLibelle: "packs" },
  { slug: "sorgho", nom: "Sorghum", categorie: Categorie.cereale, prixTendance: 350, paliers: [1, 2, 5, 10], perissable: false, ordre: 62, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "mil", nom: "Millet", categorie: Categorie.cereale, prixTendance: 300, paliers: [1, 2, 5, 10], perissable: false, ordre: 63, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "fonio", nom: "Fonio", categorie: Categorie.cereale, prixTendance: 500, paliers: [1, 2, 5], perissable: false, ordre: 64, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "mais_grain", nom: "Corn grain", categorie: Categorie.cereale, prixTendance: 400, paliers: [1, 2, 5, 10], perissable: false, ordre: 65, unite: Unite.kg, uniteLibelle: "kilos" },

  // Meats and eggs
  { slug: "boeuf", nom: "Beef", categorie: Categorie.viande, prixTendance: 3500, paliers: [1, 2, 3, 5, 10], perissable: true, ordre: 70, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "chevre", nom: "Goat", categorie: Categorie.viande, prixTendance: 3000, paliers: [1, 2, 3, 5], perissable: true, ordre: 71, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "porc", nom: "Pork", categorie: Categorie.viande, prixTendance: 3000, paliers: [1, 2, 3, 5], perissable: true, ordre: 72, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "cabri", nom: "Kid goat", categorie: Categorie.viande, prixTendance: 3500, paliers: [1, 2, 3], perissable: true, ordre: 73, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "poulet", nom: "Chicken", categorie: Categorie.viande, prixTendance: 4000, paliers: [1, 2, 3, 5], perissable: true, ordre: 74, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "mouton", nom: "Mutton", categorie: Categorie.viande, prixTendance: 3200, paliers: [1, 2, 3], perissable: true, ordre: 75, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "canard", nom: "Duck", categorie: Categorie.viande, prixTendance: 4500, paliers: [1, 2], perissable: true, ordre: 76, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "dinde", nom: "Turkey", categorie: Categorie.viande, prixTendance: 5000, paliers: [1, 2], perissable: true, ordre: 77, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "lapin", nom: "Rabbit", categorie: Categorie.viande, prixTendance: 4000, paliers: [1, 2], perissable: true, ordre: 78, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "sanglier", nom: "Wild boar", categorie: Categorie.viande, prixTendance: 2500, paliers: [1, 2, 5], perissable: true, ordre: 79, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "oeuf", nom: "Eggs", categorie: Categorie.viande, prixTendance: 1250, paliers: [1, 2, 4, 6], perissable: true, ordre: 83, unite: Unite.plateau, uniteLibelle: "trays" },

  // Fish and seafood
  { slug: "tilapie", nom: "Tilapia", categorie: Categorie.poisson, prixTendance: 2500, paliers: [1, 2, 3, 5, 10], perissable: true, ordre: 90, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "silure", nom: "Catfish", categorie: Categorie.poisson, prixTendance: 2800, paliers: [1, 2, 3, 5], perissable: true, ordre: 91, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "capitaine", nom: "Captain fish", categorie: Categorie.poisson, prixTendance: 3200, paliers: [1, 2, 3, 5], perissable: true, ordre: 92, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "carpe", nom: "Carp", categorie: Categorie.poisson, prixTendance: 2500, paliers: [1, 2, 3, 5], perissable: true, ordre: 93, unite: Unite.kg, uniteLibelle: "kilos" },
  { slug: "maquereau", nom: "Mackerel", categorie: Categorie.poisson, prixTendance: 500, paliers: [2, 5, 10, 20], perissable: true, ordre: 94, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "poisson_fume", nom: "Smoked fish", categorie: Categorie.poisson, prixTendance: 1500, paliers: [1, 2, 5, 10], perissable: false, ordre: 95, unite: Unite.morceau, uniteLibelle: "pieces" },
  { slug: "crevette", nom: "Shrimp", categorie: Categorie.poisson, prixTendance: 2500, paliers: [1, 2, 5], perissable: true, ordre: 99, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "crabe", nom: "Crab", categorie: Categorie.poisson, prixTendance: 3000, paliers: [1, 2, 5], perissable: true, ordre: 100, unite: Unite.morceau, uniteLibelle: "pieces" },

  // Oils and condiments
  { slug: "huile_rouge", nom: "Red palm oil", categorie: Categorie.huile, prixTendance: 1000, paliers: [1, 2, 5, 10], perissable: false, ordre: 110, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "sel", nom: "Salt", categorie: Categorie.huile, prixTendance: 100, paliers: [1, 2, 5, 10], perissable: false, ordre: 113, unite: Unite.sachet, uniteLibelle: "sachets" },
  { slug: "bouillon", nom: "Bouillon cubes", categorie: Categorie.huile, prixTendance: 500, paliers: [1, 2, 5], perissable: false, ordre: 115, unite: Unite.paquet, uniteLibelle: "packs" },
  { slug: "gingembre", nom: "Ginger", categorie: Categorie.huile, prixTendance: 2500, paliers: [1, 2, 5], perissable: false, ordre: 119, unite: Unite.kg, uniteLibelle: "kilos" },

  // Drinks and dairy
  { slug: "bissap", nom: "Bissap (hibiscus)", categorie: Categorie.boisson, prixTendance: 500, paliers: [1, 2, 5, 10], perissable: true, ordre: 130, unite: Unite.bouteille, uniteLibelle: "bottles" },
  { slug: "tchap", nom: "Tchap", categorie: Categorie.boisson, prixTendance: 400, paliers: [1, 2, 5], perissable: true, ordre: 135, unite: Unite.bouteille, uniteLibelle: "bottles" },
  { slug: "lait", nom: "Milk", categorie: Categorie.boisson, prixTendance: 1100, paliers: [1, 2, 5], perissable: true, ordre: 136, unite: Unite.litre, uniteLibelle: "liters" },
  { slug: "eau", nom: "Water", categorie: Categorie.boisson, prixTendance: 300, paliers: [1, 2, 5, 10], perissable: false, ordre: 138, unite: Unite.bouteille, uniteLibelle: "bottles" },
];
