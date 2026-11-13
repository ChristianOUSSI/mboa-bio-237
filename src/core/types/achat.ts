import { Categorie, CATEGORIE_INFO } from "./categorie";

/**
 * Les cinq états d'une marchandise proposée au comptoir.
 * Miroir exact de `public.statut_achat_enum`.
 */
export enum StatutAchat {
  propose = "propose",
  valide = "valide",
  paye = "paye",
  litige = "litige",
  annule = "annule",
}

export const STATUT_ACHAT_INFO: Record<
  StatutAchat,
  { libelle: string; annonce: string }
> = {
  [StatutAchat.propose]: { libelle: "Waiting for the counter", annonce: "The counter is still reviewing" },
  [StatutAchat.valide]: { libelle: "Purchased", annonce: "The counter bought it, the goods are in stock" },
  [StatutAchat.paye]: { libelle: "Paid", annonce: "The counter has paid" },
  [StatutAchat.litige]: { libelle: "Refused", annonce: "A problem was reported at reception" },
  [StatutAchat.annule]: { libelle: "Not retained", annonce: "The counter did not keep the goods" },
};

export function statutAchatResolve(slug?: string | null): StatutAchat {
  if (!slug) return StatutAchat.propose;
  const found = (Object.values(StatutAchat) as string[]).includes(slug);
  return found ? (slug as StatutAchat) : StatutAchat.propose;
}

export function achatEstAttente(s: StatutAchat): boolean {
  return s === StatutAchat.propose;
}
export function achatEstPrise(s: StatutAchat): boolean {
  return s === StatutAchat.valide || s === StatutAchat.paye;
}
export function achatEstPayee(s: StatutAchat): boolean {
  return s === StatutAchat.paye;
}
export function achatEstDu(s: StatutAchat): boolean {
  return s === StatutAchat.valide;
}

/** Une proposition d'achat, puis un achat du comptoir. Table `public.achats`. */
export interface Achat {
  id: string;
  fournisseurId: string;
  slug: string;
  nom: string;
  categorie: Categorie;
  unite: string;
  quantite: number;
  prixDemande: number;
  prixMarchand?: number | null;
  photoUrl: string;
  audioUrl?: string | null;
  produitId?: string | null;
  statut: StatutAchat;
  motif?: string | null;
  motifAudioUrl?: string | null;
  proposeLe?: string | null;
  valideLe?: string | null;
  payeLe?: string | null;
}

export function achatMontant(a: Achat): number {
  return Math.round(a.quantite * (a.prixMarchand ?? a.prixDemande));
}

export function achatAnnonce(a: Achat): string {
  const u = a.unite;
  const prix = a.prixMarchand ?? a.prixDemande;
  return `${a.quantite} ${u} of ${a.nom}, at ${prix} francs`;
}

export function achatResume(a: Achat): string {
  return `${a.nom} · ${a.unite} · ${a.prixDemande} F`;
}

export function achatFromMap(map: Record<string, unknown>): Achat {
  return {
    id: map.id as string,
    fournisseurId: (map.fournisseur_id as string) ?? "",
    slug: (map.slug as string) ?? "",
    nom: (map.nom as string) ?? "",
    categorie: categorieResolve(map.categorie as string),
    unite: (map.unite as string) ?? "kg",
    quantite: Number(map.quantite ?? 0),
    prixDemande: Math.round(Number(map.prix_demande ?? 0)),
    prixMarchand: map.prix_achat != null ? Math.round(Number(map.prix_achat)) : null,
    photoUrl: (map.photo_url as string) ?? "",
    audioUrl: (map.audio_url as string) ?? null,
    produitId: (map.produit_id as string) ?? null,
    statut: statutAchatResolve(map.statut as string),
    motif: (map.motif as string) ?? null,
    motifAudioUrl: (map.motif_audio_url as string) ?? null,
    proposeLe: (map.propose_le as string) ?? null,
    valideLe: (map.valide_le as string) ?? null,
    payeLe: (map.paye_le as string) ?? null,
  };
}

// Import resolve functions at bottom to avoid circular deps
import { categorieResolve } from "./categorie";
