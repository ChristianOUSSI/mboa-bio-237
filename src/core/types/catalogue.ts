import { Categorie, categorieResolve } from "./categorie";
import { Unite, uniteResolve } from "./unite";

/** Une ligne de `public.catalogue` : une référence du marché camerounais. */
export interface EntreeCatalogue {
  slug: string;
  nom: string;
  categorie: Categorie;
  prixTendance: number;
  paliers: number[];
  perissable: boolean;
  ordre: number;
  unite?: Unite | null;
  uniteLibelle?: string | null;
}

export function catalogueUniteReelle(e: EntreeCatalogue): Unite {
  return e.unite ?? Unite.kg;
}

export function cataloguePremierPalier(e: EntreeCatalogue): number {
  return e.paliers.length === 0 ? 1 : e.paliers[0];
}

export function cataloguePasPaliers(e: EntreeCatalogue): number {
  return e.paliers.length > 1 ? e.paliers[1] - e.paliers[0] : 1;
}

export function catalogueFromMap(map: Record<string, unknown>): EntreeCatalogue {
  const brut = map.paliers;
  const brutUnite = map.unite_defaut as string | undefined;
  return {
    slug: (map.slug as string) ?? "",
    nom: (map.nom as string) ?? "",
    categorie: categorieResolve(map.categorie as string),
    prixTendance: Math.round(Number(map.prix_tendance ?? 0)),
    paliers: Array.isArray(brut) ? brut.map((p: unknown) => Math.round(Number(p))) : [],
    perissable: (map.perissable as boolean) ?? true,
    ordre: Math.round(Number(map.ordre ?? 0)),
    unite: brutUnite ? uniteResolve(brutUnite) : null,
    uniteLibelle: (map.unite_libelle as string) ?? null,
  };
}
