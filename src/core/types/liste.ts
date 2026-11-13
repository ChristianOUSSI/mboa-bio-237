import { LigneCommande, resumerQuantites } from "./commande";

/** Un brouillon de devis préparé par une cliente. Table `public.listes`. */
export interface ListeMarche {
  id: string;
  consommateurId: string;
  lignes: LigneCommande[];
  code: string;
  titre: string;
  createdLe: string;
  imageUrl?: string | null;
  transformeeEn?: string | null;
  transformeeLe?: string | null;
  envoyeeLe?: string | null;
  consommateurNom?: string | null;
  consommateurTelephone?: string | null;
  livreurNom?: string | null;
  livreurPlaque?: string | null;
  livreurTelephone?: string | null;
  livreurTarif?: number | null;
}

export function listeAUnLivreur(l: ListeMarche): boolean {
  return l.livreurNom != null && l.livreurNom.length > 0;
}

export function listeEstVide(l: ListeMarche): boolean {
  return l.lignes.length === 0;
}

export function listeEstTransformee(l: ListeMarche): boolean {
  return l.transformeeEn != null;
}

export function listeMontantEstime(l: ListeMarche): number {
  return l.lignes.reduce((somme, ligne) => somme + Math.round(ligne.quantite * ligne.prix), 0);
}

export function listeMontantAPayer(l: ListeMarche): number {
  return listeMontantEstime(l) + (l.livreurTarif ?? 0);
}

export function listeCodeDicte(l: ListeMarche): string {
  return l.code.split("").join(", ");
}

/** Alphabet dictable : 16 signes, aucun ne se confond au téléphone. */
export const CODE_ALPHABET = "hjkmpqrtwx234678";
export const CODE_LONGUEUR = 7;

export function genererCodeListe(): string {
  const chars = new Uint8Array(CODE_LONGUEUR);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(chars);
  } else {
    for (let i = 0; i < CODE_LONGUEUR; i++) {
      chars[i] = Math.floor(Math.random() * 256);
    }
  }
  let code = "";
  for (let i = 0; i < CODE_LONGUEUR; i++) {
    code += CODE_ALPHABET[chars[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function codeEstValide(code: string): boolean {
  if (code.length !== CODE_LONGUEUR) return false;
  return code.split("").every((c) => CODE_ALPHABET.includes(c));
}
