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
  [Categorie.tubercule]: { libelle: "Tubercules", libelleVoice: "Tubercules", ordre: 2, picto: "tubercule", perissable: false },
  [Categorie.legume]: { libelle: "Légumes & feuilles", libelleVoice: "Légumes et feuilles", ordre: 3, picto: "legume", perissable: true },
  [Categorie.cereale]: { libelle: "Céréales & graines", libelleVoice: "Céréales et graines", ordre: 4, picto: "cereale", perissable: false },
  [Categorie.viande]: { libelle: "Viandes & œufs", libelleVoice: "Viandes et œufs", ordre: 5, picto: "viande", perissable: true },
  [Categorie.poisson]: { libelle: "Poissons & mer", libelleVoice: "Poissons et mer", ordre: 6, picto: "poisson", perissable: true },
  [Categorie.huile]: { libelle: "Huiles & condiments", libelleVoice: "Huiles et condiments", ordre: 7, picto: "huile", perissable: false },
  [Categorie.boisson]: { libelle: "Boissons & laitages", libelleVoice: "Boissons et laitages", ordre: 8, picto: "boisson", perissable: false },
};

export const CATEGORIES_ORDREES: Categorie[] = Object.values(Categorie).sort(
  (a, b) => CATEGORIE_INFO[a].ordre - CATEGORIE_INFO[b].ordre,
);

export function categorieResolve(slug?: string | null): string {
  // Les catégories personnalisées admin ont des slugs arbitraires : on les
  // conserve tels quels au lieu de les rabattre sur une catégorie intégrée.
  return slug?.trim() || Categorie.fruit;
}
