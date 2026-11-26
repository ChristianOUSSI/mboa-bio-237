import { MessageChat, RoleMessage } from "../types/message";

/**
 * Regroupement des messages en conversations pour /messages.
 * - Admin : un fil par correspondant (expéditeur non-admin, ou
 *   destinataire quand c'est un admin qui écrit).
 * - Livreur/autre non-admin : ses fils par correspondant + « équipe »
 *   pour les messages adressés aux admins.
 */

export type Conversation = {
  cle: string;
  nom: string;
  role: RoleMessage | null;
  messages: MessageChat[];
};

export const CLE_EQUIPE = "__equipe__";

export const estRoleAdmin = (r: string | null | undefined) => r === "admin" || r === "superadmin";

/** Clé de conversation d'un message pour un utilisateur donné :
 *  « __equipe__ » pour les admins, sinon l'id du correspondant. */
export function cleConversation(m: MessageChat, monId: string): string {
  if (m.expediteurId === monId) {
    return m.destinataireId == null || estRoleAdmin(m.destinataireRole) ? CLE_EQUIPE : m.destinataireId;
  }
  return estRoleAdmin(m.expediteurRole) ? CLE_EQUIPE : m.expediteurId;
}

function finaliser(map: Map<string, Conversation>): Conversation[] {
  for (const conv of map.values()) {
    conv.messages.sort((a, b) => a.createdLe.localeCompare(b.createdLe));
    if (!conv.nom) {
      conv.nom = conv.cle === CLE_EQUIPE ? "équipe" : conv.cle.slice(0, 8);
    }
  }
  // Conversations avec le dernier message le plus récent en premier.
  return [...map.values()].sort((a, b) => {
    const da = a.messages[a.messages.length - 1]?.createdLe ?? "";
    const db = b.messages[b.messages.length - 1]?.createdLe ?? "";
    return db.localeCompare(da);
  });
}

/** Regroupe les messages d'un non-admin (livreur) par correspondant. */
export function grouperPourUtilisateur(messages: MessageChat[], monId: string): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const cle = cleConversation(m, monId);
    let conv = map.get(cle);
    if (!conv) {
      conv = { cle, nom: "", role: null, messages: [] };
      map.set(cle, conv);
    }
    conv.messages.push(m);
    if (m.expediteurId === monId) {
      if (!conv.role && m.destinataireRole) conv.role = m.destinataireRole;
    } else {
      conv.nom = m.expediteurNom || conv.nom;
      conv.role = m.expediteurRole;
    }
  }
  return finaliser(map);
}

/** Regroupe les messages en conversations (vue admin). */
export function grouperConversations(messages: MessageChat[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const deAdmin = estRoleAdmin(m.expediteurRole);
    const cle = deAdmin ? (m.destinataireId ?? CLE_EQUIPE) : m.expediteurId;
    let conv = map.get(cle);
    if (!conv) {
      conv = { cle, nom: "", role: null, messages: [] };
      map.set(cle, conv);
    }
    conv.messages.push(m);
    // Le nom/rôle du correspondant vient de ses propres messages.
    if (!deAdmin) {
      conv.nom = m.expediteurNom || conv.nom;
      conv.role = m.expediteurRole;
    } else if (!conv.role && m.destinataireRole) {
      conv.role = m.destinataireRole;
    }
  }
  return finaliser(map);
}
