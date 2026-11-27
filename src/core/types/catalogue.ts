import { Unite } from "./unite";

/** Une ligne de `public.catalogue` : une référence du marché camerounais. */
export interface EntreeCatalogue {
  slug: string;
  nom: string;
  categorie: string;
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


