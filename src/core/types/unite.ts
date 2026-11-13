/**
 * Ce que compte une quantité.
 * Miroir exact de `public.unite_enum`.
 */
export enum Unite {
  kg = "kg",
  boule = "boule",
  bouteille = "bouteille",
  botte = "botte",
  morceau = "morceau",
  part = "part",
  litre = "litre",
  paquet = "paquet",
  plateau = "plateau",
  regime = "regime",
  sachet = "sachet",
}

export const UNITE_INFO: Record<
  Unite,
  { un: string; pluriel: string; article: string }
> = {
  [Unite.kg]: { un: "kilo", pluriel: "kilos", article: "per" },
  [Unite.boule]: { un: "ball", pluriel: "balls", article: "per" },
  [Unite.bouteille]: { un: "bottle", pluriel: "bottles", article: "per" },
  [Unite.botte]: { un: "bunch", pluriel: "bunches", article: "per" },
  [Unite.morceau]: { un: "piece", pluriel: "pieces", article: "per" },
  [Unite.part]: { un: "serving", pluriel: "servings", article: "per" },
  [Unite.litre]: { un: "liter", pluriel: "liters", article: "per" },
  [Unite.paquet]: { un: "pack", pluriel: "packs", article: "per" },
  [Unite.plateau]: { un: "tray", pluriel: "trays", article: "per" },
  [Unite.regime]: { un: "bunch", pluriel: "bunches", article: "per" },
  [Unite.sachet]: { un: "sachet", pluriel: "sachets", article: "per" },
};

export function uniteResolve(slug?: string | null): Unite {
  if (!slug) return Unite.kg;
  const found = (Object.values(Unite) as string[]).includes(slug);
  return found ? (slug as Unite) : Unite.kg;
}

export function unitePour(u: Unite, valeur: number): string {
  return valeur === 1 ? UNITE_INFO[u].un : UNITE_INFO[u].pluriel;
}

export function uniteAvecArticle(u: Unite): string {
  return `${UNITE_INFO[u].article} ${UNITE_INFO[u].un}`;
}

/** « 350 F per kilo ». */

function nombre(valeur: number): string {
  const arrondi = Math.round(valeur);
  return Math.abs(valeur - arrondi) < 0.01
    ? arrondi.toString()
    : valeur.toFixed(1).replace(".", ",");
}

export function uniteAvec(u: Unite, valeur: number): string {
  return `${nombre(valeur)} ${unitePour(u, valeur)}`;
}

export function uniteEstPoids(u: Unite): boolean {
  return u === Unite.kg;
}
