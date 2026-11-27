import { LigneCommande } from "./commande";

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

