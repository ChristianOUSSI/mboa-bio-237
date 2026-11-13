import { LigneCommande } from "./commande";
import {
  StatutCommande,
  statutCommandeResolve,
  ModePaiement,
  modePaiementResolve,
  Satisfaction,
  satisfactionParse,
} from "./statuts";

/** Un devis de la cliente. Table `public.commandes`. */
export interface Commande {
  id: string;
  consommateurId: string;
  lignes: LigneCommande[];
  statut: StatutCommande;
  montantTotal: number;
  coutAchat: number;
  montantLivre?: number | null;
  paiement?: ModePaiement | null;
  paiementRef?: string | null;
  livraisonMoto: boolean;
  stockSorti: boolean;
  photoLivraison?: string | null;
  signature?: string | null;
  appelVocalFait: boolean;
  /** La cliente veut être appelée par le livreur à l'arrivée. */
  appelSouhaite: boolean;
  /** Numéro à joindre pour cet appel (sinon le téléphone du profil). */
  numeroContact?: string | null;
  createdLe: string;
  livreeLe?: string | null;
  recueLe?: string | null;
  satisfaction?: Satisfaction | null;
  satisfactionMotif?: string | null;
  satisfactionAudio?: string | null;
  clos: boolean;
  closPar?: string | null;
  annuleLe?: string | null;
  motifAnnulation?: string | null;
  livreurId?: string | null;
  livreurNom?: string | null;
  livreurPhoto?: string | null;
  livreurMoto?: string | null;
  livreurPlaque?: string | null;
  livreurTelephone?: string | null;
  livreurTarif?: number | null;
}

export function commandeAUnLivreur(c: Commande): boolean {
  return c.livreurId != null;
}

export function commandeMontantDue(c: Commande): number {
  return c.clos ? (c.montantLivre ?? 0) : 0;
}

export function commandeEcart(c: Commande): number {
  return c.montantLivre == null ? 0 : c.montantTotal - c.montantLivre;
}

export function commandeEcartSignificatif(c: Commande): boolean {
  return commandeEcart(c) > 0;
}

export function commandeMarge(c: Commande): number {
  if (!c.clos) return 0;
  const encaisse = c.montantLivre ?? 0;
  if (c.montantTotal <= 0) return encaisse;
  const coutGarde = Math.round((c.coutAchat * encaisse) / c.montantTotal);
  return encaisse - coutGarde;
}

export function commandeCoutGarde(c: Commande): number {
  const encaisse = c.montantLivre ?? 0;
  if (c.montantTotal <= 0) return 0;
  return Math.round((c.coutAchat * encaisse) / c.montantTotal);
}

export function commandeMontantAPayer(c: Commande): number {
  return c.montantTotal + (c.livreurTarif ?? 0);
}

export function commandeAttendConfirmation(c: Commande): boolean {
  return c.statut === StatutCommande.livree;
}

export function commandeEstAnnule(c: Commande): boolean {
  return c.statut === StatutCommande.annulee;
}

export function commandePreteARelance(c: Commande): boolean {
  if (!commandeAttendConfirmation(c)) return false;
  if (!c.livreeLe) return false;
  const heures = (Date.now() - new Date(c.livreeLe).getTime()) / (1000 * 60 * 60);
  return heures >= 12;
}

export function commandeEtapeAllumee(c: Commande): number {
  return statutJalon(c.statut);
}

function statutJalon(s: StatutCommande): number {
  const ordre = [
    StatutCommande.nouvelle,
    StatutCommande.valideeAdmin,
    StatutCommande.enLivraison,
    StatutCommande.livree,
    StatutCommande.recue,
    StatutCommande.annulee,
  ];
  return Math.min(ordre.indexOf(s), 3);
}

export function commandeFromMap(map: Record<string, unknown>): Commande {
  const brut = map.produits;
  let tableau: unknown[];
  if (Array.isArray(brut)) {
    tableau = brut;
  } else if (typeof brut === "string" && brut.trim().length > 0) {
    tableau = JSON.parse(brut);
  } else {
    tableau = [];
  }

  const livreurBrut = (map.livreur ?? map.livreurs) as Record<string, unknown> | undefined;
  const livreur = livreurBrut && typeof livreurBrut === "object" ? livreurBrut : {};

  return {
    id: map.id as string,
    consommateurId: (map.consommateur_id as string) ?? "",
    lignes: tableau
      .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
      .map((j) => ligneFromJson(j)),
    statut: statutCommandeResolve(map.statut_enum as string),
    montantTotal: Math.round(Number(map.montant_total ?? 0)),
    coutAchat: Math.round(Number(map.cout_achat ?? 0)),
    montantLivre: map.montant_livre != null ? Math.round(Number(map.montant_livre)) : null,
    paiement: map.paiement ? modePaiementResolve(map.paiement as string) : null,
    paiementRef: (map.paiement_ref as string) ?? null,
    livraisonMoto: (map.livraison_moto as boolean) ?? true,
    stockSorti: (map.stock_sorti as boolean) ?? false,
    photoLivraison: (map.photo_livraison_url as string) ?? null,
    signature: (map.signature_url as string) ?? null,
    appelVocalFait: (map.appel_vocal_fait as boolean) ?? false,
    appelSouhaite: (map.appel_souhaite as boolean) ?? false,
    numeroContact: (map.numero_contact as string) ?? null,
    createdLe: (map.created_at as string) ?? new Date().toISOString(),
    livreeLe: (map.livree_le as string) ?? null,
    recueLe: (map.recue_le as string) ?? null,
    satisfaction: satisfactionParse(map.satisfaction as string),
    satisfactionMotif: (map.satisfaction_motif as string) ?? null,
    satisfactionAudio: (map.satisfaction_audio as string) ?? null,
    clos: (map.clos as boolean) ?? false,
    closPar: (map.clos_par as string) ?? null,
    annuleLe: (map.annule_le as string) ?? null,
    motifAnnulation: (map.motif_annulation as string) ?? null,
    livreurId: (map.livreur_id as string) ?? null,
    livreurNom: (livreur.nom as string) ?? (map.nom_livreur as string) ?? null,
    livreurPhoto: (livreur.photo as string) ?? (map.photo_livreur as string) ?? null,
    livreurMoto: (livreur.moto as string) ?? (map.moto as string) ?? null,
    livreurPlaque: (livreur.plaque as string) ?? (map.plaque as string) ?? null,
    livreurTelephone: (map.telephone_livreur as string) ?? null,
    livreurTarif:
      livreur.tarif_course != null
        ? Math.round(Number(livreur.tarif_course))
        : map.tarif_livreur != null
          ? Math.round(Number(map.tarif_livreur))
          : null,
  };
}

// Import at bottom to avoid circular dependency
import { ligneFromJson } from "./commande";
