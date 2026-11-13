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
  [Unite.kg]: { un: "kilo", pluriel: "kilos", article: "par" },
  [Unite.boule]: { un: "boule", pluriel: "boules", article: "par" },
  [Unite.bouteille]: { un: "bouteille", pluriel: "bouteilles", article: "par" },
  [Unite.botte]: { un: "botte", pluriel: "bottes", article: "par" },
  [Unite.morceau]: { un: "pièce", pluriel: "pièces", article: "par" },
  [Unite.part]: { un: "part", pluriel: "parts", article: "par" },
  [Unite.litre]: { un: "litre", pluriel: "litres", article: "par" },
  [Unite.paquet]: { un: "paquet", pluriel: "paquets", article: "par" },
  [Unite.plateau]: { un: "plateau", pluriel: "plateaux", article: "par" },
  [Unite.regime]: { un: "régime", pluriel: "régimes", article: "par" },
  [Unite.sachet]: { un: "sachet", pluriel: "sachets", article: "par" },
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
