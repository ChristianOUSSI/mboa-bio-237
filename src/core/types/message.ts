/**
 * Message de la messagerie intégré : client/fournisseur/livreur ↔ admins.
 * `destinataireId` null = message adressé à « tous les admins ».
 * `audio` contient un data URL (webm/mp4) pour les messages vocaux.
 */

export type RoleMessage = "consommateur" | "fournisseur" | "livreur" | "admin" | "superadmin";

export interface MessageChat {
  id: string;
  expediteurId: string;
  expediteurRole: RoleMessage;
  expediteurNom: string;
  destinataireId: string | null;
  destinataireRole: RoleMessage | null;
  texte: string;
  audio: string | null;
  lu: boolean;
  createdLe: string;
}

export function messageFromMap(map: Record<string, unknown>): MessageChat {
  return {
    id: (map.id as string) ?? "",
    expediteurId: (map.expediteur_id as string) ?? "",
    expediteurRole: ((map.expediteur_role as string) ?? "consommateur") as RoleMessage,
    expediteurNom: (map.expediteur_nom as string) ?? "",
    destinataireId: (map.destinataire_id as string) ?? null,
    destinataireRole: (map.destinataire_role as RoleMessage | null) ?? null,
    texte: (map.texte as string) ?? "",
    audio: (map.audio as string) ?? null,
    lu: (map.lu as boolean) ?? false,
    createdLe: (map.created_le as string) ?? new Date().toISOString(),
  };
}
