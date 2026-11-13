/**
 * Les huit cases du catalogue ouvert.
 * Miroir exact de `public.categorie_enum`.
 */
export enum Categorie {
  fruit = "fruit",
  tubercule = "tubercule",
  legume = "legume",
  cereale = "cereale",
  viande = "viande",
  poisson = "poisson",
  huile = "huile",
  boisson = "boisson",
}

export const CATEGORIE_INFO: Record<
  Categorie,
  { libelle: string; libelleVoice: string; ordre: number; picto: string; perissable: boolean }
> = {
  [Categorie.fruit]: { libelle: "Fruits", libelleVoice: "Fruits", ordre: 1, picto: "fruit", perissable: true },
  [Categorie.tubercule]: { libelle: "Tubers", libelleVoice: "Tubers", ordre: 2, picto: "tubercule", perissable: false },
  [Categorie.legume]: { libelle: "Vegetables & greens", libelleVoice: "Vegetables and greens", ordre: 3, picto: "legume", perissable: true },
  [Categorie.cereale]: { libelle: "Grains & seeds", libelleVoice: "Grains and seeds", ordre: 4, picto: "cereale", perissable: false },
  [Categorie.viande]: { libelle: "Meat & eggs", libelleVoice: "Meat and eggs", ordre: 5, picto: "viande", perissable: true },
  [Categorie.poisson]: { libelle: "Fish & seafood", libelleVoice: "Fish and seafood", ordre: 6, picto: "poisson", perissable: true },
  [Categorie.huile]: { libelle: "Oils & condiments", libelleVoice: "Oils and condiments", ordre: 7, picto: "huile", perissable: false },
  [Categorie.boisson]: { libelle: "Drinks & dairy", libelleVoice: "Drinks and dairy", ordre: 8, picto: "boisson", perissable: false },
};

export const CATEGORIES_ORDREES: Categorie[] = Object.values(Categorie).sort(
  (a, b) => CATEGORIE_INFO[a].ordre - CATEGORIE_INFO[b].ordre,
);

export function categorieResolve(slug?: string | null): Categorie {
  if (!slug) return Categorie.fruit;
  const found = (Object.values(Categorie) as string[]).includes(slug);
  return found ? (slug as Categorie) : Categorie.fruit;
}
