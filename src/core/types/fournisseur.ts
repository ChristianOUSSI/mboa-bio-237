import { CATEGORIE_INFO } from "./categorie";

/** Une fiche de producteur au fichier du comptoir. Table `public.fournisseurs`. */
export interface Fournisseur {
  id: string;
  profilId?: string | null;
  nom: string;
  telephone: string;
  /** Numéro WhatsApp dédié à la notification de candidature (peut différer du téléphone). */
  whatsapp?: string | null;
  village: string;
  photo?: string | null;
  productionCategorie?: string | null;
  productionLibre: string;
  unite: string;
  actif: boolean;
  /** Date de refus de la candidature (null = jamais refusé). */
  refuseLe?: string | null;
}

export function fournisseurLie(f: Fournisseur): boolean {
  return f.profilId != null && f.profilId.length > 0;
}

export function fournisseurProduction(f: Fournisseur): string {
  const libre = f.productionLibre.trim();
  if (libre.length > 0) return libre;
  if (!f.productionCategorie) return "Production à préciser";
  const info = (CATEGORIE_INFO as Record<string, { libelle: string }>)[f.productionCategorie];
  return info?.libelle ?? f.productionCategorie;
}

export function fournisseurFromMap(map: Record<string, unknown>): Fournisseur {
  const catSlug = map.production_categorie as string | undefined;
  return {
    id: map.id as string,
    profilId: (map.profil_id as string) ?? null,
    nom: (map.nom as string) ?? "Fournisseur",
    telephone: (map.telephone_237 as string) ?? "",
    whatsapp: (map.whatsapp as string) ?? null,
    village: (map.village as string) ?? "Inconnu",
    photo: (map.photo as string) ?? null,
    productionCategorie: catSlug && catSlug.length > 0 ? catSlug : null,
    productionLibre: (map.production_libre as string) ?? "",
    unite: (map.unite as string) ?? "kg",
    actif: (map.actif as boolean) ?? true,
    refuseLe: (map.refuse_le as string) ?? null,
  };
}
