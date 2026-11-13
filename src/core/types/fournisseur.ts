import { Categorie, CATEGORIE_INFO } from "./categorie";

/** Une fiche de producteur au fichier du comptoir. Table `public.fournisseurs`. */
export interface Fournisseur {
  id: string;
  profilId?: string | null;
  nom: string;
  telephone: string;
  village: string;
  photo?: string | null;
  productionCategorie?: Categorie | null;
  productionLibre: string;
  unite: string;
  actif: boolean;
}

export function fournisseurLie(f: Fournisseur): boolean {
  return f.profilId != null && f.profilId.length > 0;
}

export function fournisseurProduction(f: Fournisseur): string {
  const libre = f.productionLibre.trim();
  if (libre.length > 0) return libre;
  return f.productionCategorie ? CATEGORIE_INFO[f.productionCategorie].libelle : "Production to be specified";
}

export function fournisseurFromMap(map: Record<string, unknown>): Fournisseur {
  const catSlug = map.production_categorie as string | undefined;
  return {
    id: map.id as string,
    profilId: (map.profil_id as string) ?? null,
    nom: (map.nom as string) ?? "Supplier",
    telephone: (map.telephone_237 as string) ?? "",
    village: (map.village as string) ?? "Unknown",
    photo: (map.photo as string) ?? null,
    productionCategorie: catSlug && catSlug.length > 0 ? (catSlug as Categorie) : null,
    productionLibre: (map.production_libre as string) ?? "",
    unite: (map.unite as string) ?? "kg",
    actif: (map.actif as boolean) ?? true,
  };
}
