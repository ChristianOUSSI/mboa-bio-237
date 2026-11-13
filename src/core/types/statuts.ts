import { Categorie } from "./categorie";

/**
 * États partagés entre les apps et la base.
 * Miroir exact de `public.commandes.statut_enum`.
 */
export enum StatutCommande {
  nouvelle = "nouvelle",
  valideeAdmin = "validee_admin",
  enLivraison = "en_livraison",
  livree = "livree",
  recue = "recue",
  annulee = "annulee",
}

export const STATUT_COMMANDE_INFO: Record<
  StatutCommande,
  { libelle: string; actionRestante: string; annonce: string }
> = {
  [StatutCommande.nouvelle]: {
    libelle: "New",
    actionRestante: "Mboa must validate",
    annonce: "Quote registered",
  },
  [StatutCommande.valideeAdmin]: {
    libelle: "Validated",
    actionRestante: "The bike must leave",
    annonce: "Mboa validated your quote, the goods are reserved",
  },
  [StatutCommande.enLivraison]: {
    libelle: "On the way",
    actionRestante: "The bike is on the way",
    annonce: "The bike is on the way",
  },
  [StatutCommande.livree]: {
    libelle: "Delivered",
    actionRestante: "Say if everything is fine",
    annonce: "Your order has arrived. Is everything fine?",
  },
  [StatutCommande.recue]: {
    libelle: "Received",
    actionRestante: "It's over",
    annonce: "Thank you, it's noted",
  },
  [StatutCommande.annulee]: {
    libelle: "Cancelled",
    actionRestante: "The goods are back",
    annonce: "Your quote was cancelled",
  },
};

export const STATUT_COMMANDE_ORDRE: StatutCommande[] = [
  StatutCommande.nouvelle,
  StatutCommande.valideeAdmin,
  StatutCommande.enLivraison,
  StatutCommande.livree,
  StatutCommande.recue,
  StatutCommande.annulee,
];

export function statutCommandeResolve(slug?: string | null): StatutCommande {
  if (!slug) return StatutCommande.nouvelle;
  const found = (Object.values(StatutCommande) as string[]).includes(slug);
  return found ? (slug as StatutCommande) : StatutCommande.nouvelle;
}

export function statutRang(s: StatutCommande): number {
  return STATUT_COMMANDE_ORDRE.indexOf(s);
}

/** Position sur la timeline à quatre icônes. `recue` allume la même case que `livree`. */
export function statutJalon(s: StatutCommande): number {
  return Math.min(statutRang(s), 3);
}

export function statutAttendConfirmation(s: StatutCommande): boolean {
  return s === StatutCommande.livree;
}

export function statutEstTerminee(s: StatutCommande): boolean {
  return s === StatutCommande.recue;
}

export function statutEstFermee(s: StatutCommande): boolean {
  return s === StatutCommande.recue || s === StatutCommande.annulee;
}

/** Colonne `public.commandes.paiement`. */
export enum ModePaiement {
  especes = "especes",
  momo = "mtn_momo",
  orangeMoney = "orange_money",
}

export const MODE_PAIEMENT_INFO: Record<
  ModePaiement,
  { libelle: string; marque: string | null }
> = {
  [ModePaiement.especes]: { libelle: "Cash on delivery", marque: null },
  [ModePaiement.momo]: { libelle: "MTN MoMo", marque: null },
  [ModePaiement.orangeMoney]: { libelle: "Orange Money", marque: null },
};

export function modePaiementResolve(slug?: string | null): ModePaiement {
  if (!slug) return ModePaiement.especes;
  const found = (Object.values(ModePaiement) as string[]).includes(slug);
  return found ? (slug as ModePaiement) : ModePaiement.especes;
}

/** Réponse unique de la cliente après la livraison. Binaire par décision. */
export enum Satisfaction {
  bon = "bon",
  probleme = "probleme",
}

export const SATISFACTION_INFO: Record<
  Satisfaction,
  { libelle: string; annonceAuComptoir: string }
> = {
  [Satisfaction.bon]: { libelle: "All good", annonceAuComptoir: "The customer accepted the goods" },
  [Satisfaction.probleme]: { libelle: "There's a problem", annonceAuComptoir: "The customer reported a problem" },
};

export function satisfactionParse(slug?: string | null): Satisfaction | null {
  if (!slug) return null;
  if ((Object.values(Satisfaction) as string[]).includes(slug)) {
    return slug as Satisfaction;
  }
  return null;
}

/** Les trois motifs de refus proposés à la cliente. */
export enum MotifReception {
  rienRecu = "rien_recu",
  quantite = "quantite",
  abime = "abime",
}

export const MOTIF_RECEPTION_INFO: Record<MotifReception, string> = {
  [MotifReception.rienRecu]: "Nothing arrived",
  [MotifReception.quantite]: "Wrong quantity",
  [MotifReception.abime]: "The product is damaged",
};
