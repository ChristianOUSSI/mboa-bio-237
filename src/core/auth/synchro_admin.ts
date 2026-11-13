"use client";

import { mboaReseau } from "../data/mboa_reseau";
import { cacheEcrire, cacheLire } from "../data/base_locale";
import type { CompteAuth } from "./auth_local";

/**
 * Synchro multi-appareils des comptes admin / super admin.
 *
 * Sans Supabase configuré, tout reste local (IndexedDB) - comportement inchangé.
 * Avec Supabase, les comptes admin sont répliqués dans la table `admin_comptes`
 * pour que chaque admin puisse se connecter depuis son propre PC ou téléphone.
 *
 * ⚠️ La table stocke le hash du mot de passe : l'anon key est publique, donc
 * quiconque peut lire ces hashes. C'est acceptable pour des mots de passe
 * forts ; la migration vers Supabase Auth reste recommandée à terme.
 */

const TABLE = "admin_comptes";

function estCompteAdmin(c: CompteAuth): boolean {
  return c.role === "admin" || c.role === "superadmin";
}

/** Pousse un compte admin vers Supabase (fire-and-forget, jamais bloquant). */
export function publierCompteAdmin(compte: CompteAuth): void {
  if (!estCompteAdmin(compte)) return;
  const client = mboaReseau();
  if (!client) return;
  void client
    .from(TABLE)
    .upsert({ id: compte.id, data: compte, maj_le: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.warn("[synchro] compte admin:", error.message);
    });
}

/**
 * Tire les comptes admin depuis Supabase et les fusionne dans le cache local.
 * Le distant gagne pour les champs de sécurité (motDePasse, actif, nom) ;
 * `maj_le` départage les versions concurrentes.
 */
export async function synchroniserComptesAdmin(): Promise<number> {
  const client = mboaReseau();
  if (!client) return 0;
  const { data, error } = await client
    .from(TABLE)
    .select("id, data")
    .order("maj_le", { ascending: false })
    .limit(200);
  if (error || !data) return 0;

  let fusionnes = 0;
  for (const ligne of data as { id: string; data: CompteAuth }[]) {
    const distant = ligne.data;
    if (!distant || !estCompteAdmin(distant)) continue;
    const local = await cacheLire<CompteAuth>("compte", distant.id);
    // Pas de timestamp fiable côté local : le distant gagne si le local
    // est absent, inactif, ou si le distant a un createdLe plus récent.
    const distantPlusRecent =
      !local ||
      !local.actif ||
      (distant.createdLe ?? "") > (local.createdLe ?? "") ||
      (distant.nom !== local.nom ||
        distant.email !== local.email ||
        distant.telephone !== local.telephone ||
        distant.motDePasse !== local.motDePasse ||
        distant.actif !== local.actif);
    if (!distantPlusRecent && local) continue;
    await cacheEcrire("compte", distant.id, distant);
    if (distant.telephone) await cacheEcrire("compte", `tel:${distant.telephone}`, distant);
    if (distant.email) await cacheEcrire("compte", `mail:${distant.email}`, distant);
    fusionnes++;
  }

  // Déduplication : le bootstrap peut avoir créé le même compte admin sur
  // plusieurs appareils → même email, ids différents → connexion instable
  // (mot de passe par défaut qui revient sans cesse). On ne garde actif que
  // le meilleur exemplaire par email ; les autres sont désactivés.
  const { cacheTout } = await import("../data/base_locale");
  const tous = (await cacheTout<CompteAuth | null>("compte")).filter(
    (c): c is CompteAuth => c != null && estCompteAdmin(c) && !!c.id,
  );
  const parEmail = new Map<string, CompteAuth[]>();
  for (const c of tous) {
    const cle = (c.email ?? c.telephone ?? c.id).toLowerCase();
    parEmail.set(cle, [...(parEmail.get(cle) ?? []), c]);
  }
  for (const groupe of parEmail.values()) {
    if (groupe.length < 2) continue;
    const meilleur = [...groupe].sort((a, b) => {
      const score = (c: CompteAuth) =>
        (c.actif ? 4 : 0) + (c.motDePasseParDefaut ? 0 : 2);
      const d = score(b) - score(a);
      return d !== 0 ? d : (b.createdLe ?? "").localeCompare(a.createdLe ?? "");
    })[0];
    for (const c of groupe) {
      if (c.id === meilleur.id || !c.actif) continue;
      const inactif = { ...c, actif: false };
      await cacheEcrire("compte", c.id, inactif);
      if (c.telephone) await cacheEcrire("compte", `tel:${c.telephone}`, inactif);
      if (c.email) await cacheEcrire("compte", `mail:${c.email}`, inactif);
      publierCompteAdmin(inactif);
    }
  }
  return fusionnes;
}
