/**
 * Annonce du comptoir : promotion, info ou produit phare.
 * Affichée en bannière sur le marché consommateur.
 */

export type TypeAnnonce = "promo" | "info" | "phare";

export interface Annonce {
  id: string;
  type: TypeAnnonce;
  titre: string;
  texte: string;
  produitSlug?: string | null;
  expireLe?: string | null;
  actif: boolean;
  createdLe: string;
}

export function annonceFromMap(map: Record<string, unknown>): Annonce {
  return {
    id: (map.id as string) ?? "",
    type: ((map.type as string) ?? "info") as TypeAnnonce,
    titre: (map.titre as string) ?? "",
    texte: (map.texte as string) ?? "",
    produitSlug: (map.produit_slug as string) ?? null,
    expireLe: (map.expire_le as string) ?? null,
    actif: (map.actif as boolean) ?? true,
    createdLe: (map.created_le as string) ?? "",
  };
}

export const TYPE_ANNONCE_INFO: Record<TypeAnnonce, { emoji: string; libelle: string }> = {
  promo: { emoji: "🏷️", libelle: "Promotion" },
  info: { emoji: "📣", libelle: "Info" },
  phare: { emoji: "⭐", libelle: "Produit phare" },
};
