import { Categorie, categorieResolve } from "./categorie";
import { Unite, uniteResolve, uniteAvec, uniteAvecArticle } from "./unite";
import { PackComposant, packComposantDepuisJson } from "./pack_composant";

/** Une fiche du stock du comptoir. Table `public.produits`. */
export interface Produit {
  id: string;
  slug: string;
  nom: string;
  categorie: Categorie;
  photoReelle: string;
  photoFiligranee?: string | null;
  quantite: number;
  prix: number;
  prixAchat?: number | null;
  unite?: Unite | null;
  audioDescription?: string | null;
  perissable: boolean;
  actif: boolean;
  composants: PackComposant[];
  createdLe?: string | null;
}

export function produitEstPack(p: Produit): boolean {
  return p.composants.length > 0;
}

export function produitUniteReelle(p: Produit): Unite {
  if (produitEstPack(p)) return Unite.part;
  return p.unite ?? Unite.kg;
}

export function produitPhoto(p: Produit): string {
  return p.photoFiligranee ?? p.photoReelle;
}

export function produitEstVitrine(p: Produit): boolean {
  return p.actif && p.quantite > 0;
}

export function produitEstRupture(p: Produit): boolean {
  return p.quantite <= 0;
}

export function produitJauge(p: Produit): number {
  const u = produitUniteReelle(p);
  let plafond = 60;
  if (u === Unite.part) plafond = 20;
  else if (u === Unite.kg) plafond = p.perissable ? 20 : 120;
  return Math.min(p.quantite / plafond, 1);
}

export function produitAnnonceVocale(p: Produit): string {
  const u = produitUniteReelle(p);
  return `${p.nom}, ${uniteAvec(u, p.quantite)} available, ${p.prix} francs ${uniteAvecArticle(u)}`;
}

export function produitDisponibilite(p: Produit): string {
  if (produitEstRupture(p)) return "nothing left at the counter";
  const u = produitUniteReelle(p);
  return `${uniteAvec(u, p.quantite)} available`;
}

export function produitPrixLabel(p: Produit): string {
  const u = produitUniteReelle(p);
  return `${p.prix} F ${uniteAvecArticle(u)}`;
}

export function produitMargeUnitaire(p: Produit): number | null {
  return p.prixAchat == null ? null : p.prix - p.prixAchat;
}

export function produitMargePct(p: Produit): number | null {
  const achat = p.prixAchat;
  if (achat == null || achat <= 0) return null;
  return Math.round(((p.prix - achat) / achat) * 100);
}

export function produitEstAPerte(p: Produit): boolean {
  const marge = produitMargeUnitaire(p);
  return marge != null && marge < 0;
}

export function produitFromMap(map: Record<string, unknown>): Produit {
  const brutUnite = map.unite as string | undefined;
  return {
    id: map.id as string,
    slug: (map.slug as string) ?? "",
    nom: (map.nom as string) ?? "",
    categorie: categorieResolve(map.categorie as string),
    photoReelle: (map.photo_reelle as string) ?? (map.photo as string) ?? "",
    photoFiligranee: (map.photo_filigranee as string) ?? null,
    quantite: Number(map.quantite ?? 0),
    prix: Math.round(Number(map.prix ?? 0)),
    unite: brutUnite ? uniteResolve(brutUnite) : null,
    prixAchat: map.prix_achat != null ? Math.round(Number(map.prix_achat)) : null,
    audioDescription: (map.audio_description_url as string) ?? null,
    perissable: (map.perissable as boolean) ?? true,
    actif: (map.actif as boolean) ?? true,
    composants: packComposantDepuisJson(map.pack_composants),
    createdLe: (map.created_at as string) ?? null,
  };
}
