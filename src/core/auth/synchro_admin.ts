"use client";

import { mboaReseau } from "../data/mboa_reseau";
import { cacheEcrire, cacheLire, cacheTout } from "../data/base_locale";
import {
  hacherMotDePasse,
  motDePasseSuperAdmin,
  EMAIL_ADMIN_INITIAL,
  EMAIL_ADMIN_INITIAL_ANTERIEUR,
  type CompteAuth,
} from "./auth_local";

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

/** Rôles « à privilèges » : déduplication anti-doublons bootstrap activée. */
function estCompteAdmin(c: CompteAuth): boolean {
  return c.role === "admin" || c.role === "superadmin";
}

/** Tous les comptes synchronisent entre appareils (créés par le super admin
 *  ou par l'utilisateur lui-même), pas seulement les admins. */
function estCompteSynchronise(_c: CompteAuth): boolean {
  return true;
}

/** Pousse un compte vers Supabase (fire-and-forget, jamais bloquant). */
export function publierCompteAdmin(compte: CompteAuth): void {
  if (!estCompteSynchronise(compte)) return;
  const client = mboaReseau();
  if (!client) return;
  void client
    .from(TABLE)
    .upsert({ id: compte.id, data: compte, maj_le: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.warn("[synchro] compte admin:", error.message);
    });
}

/** Supprime définitivement un compte de la table de synchro. */
export function supprimerCompteDistant(id: string): void {
  const client = mboaReseau();
  if (!client) return;
  void client
    .from(TABLE)
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.warn("[synchro] suppression compte:", error.message);
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
    if (!distant || !estCompteSynchronise(distant)) continue;
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
  const gagnants: CompteAuth[] = [];
  for (const groupe of parEmail.values()) {
    const meilleur = [...groupe].sort((a, b) => {
      const score = (c: CompteAuth) =>
        (c.actif ? 4 : 0) + (c.motDePasseParDefaut ? 0 : 2);
      const d = score(b) - score(a);
      return d !== 0 ? d : (b.createdLe ?? "").localeCompare(a.createdLe ?? "");
    })[0];
    gagnants.push(meilleur);
    if (groupe.length < 2) continue;
    for (const c of groupe) {
      if (c.id === meilleur.id || !c.actif) continue;
      const inactif = { ...c, actif: false };
      await cacheEcrire("compte", c.id, inactif);
      if (c.telephone) await cacheEcrire("compte", `tel:${c.telephone}`, inactif);
      if (c.email) await cacheEcrire("compte", `mail:${c.email}`, inactif);
      publierCompteAdmin(inactif);
    }
  }

  // --- Migrations des identifiants bootstrap ---
  // Idempotent : appliqué à chaque synchro, sur chaque appareil.
  // Garantit que admin@mboa237 et CADC/CADC1 restent à jour même si la
  // synchro aboutit APRÈS la création locale des comptes.
  const adminNouveau = tous.find((c) => c.email === EMAIL_ADMIN_INITIAL);
  const adminAncien = tous.find((c) => c.email === EMAIL_ADMIN_INITIAL_ANTERIEUR);
  if (!adminNouveau && adminAncien) {
    const migre: CompteAuth = { ...adminAncien, email: EMAIL_ADMIN_INITIAL };
    await cacheEcrire("compte", migre.id, migre);
    await cacheEcrire("compte", `mail:${EMAIL_ADMIN_INITIAL}`, migre);
    await cacheEcrire("compte", `mail:${EMAIL_ADMIN_INITIAL_ANTERIEUR}`, null);
    publierCompteAdmin(migre);
  } else if (adminNouveau && adminAncien && adminAncien.id !== adminNouveau.id && adminAncien.actif) {
    // Les deux identifiants existent (ids différents) : l'ancien est révoqué.
    const inactif: CompteAuth = { ...adminAncien, actif: false };
    await cacheEcrire("compte", inactif.id, inactif);
    await cacheEcrire("compte", `mail:${EMAIL_ADMIN_INITIAL_ANTERIEUR}`, inactif);
    publierCompteAdmin(inactif);
  }

  // Le super admin est un compte à identifiants fixes : on force le hash
  // du mot de passe actuel (CADC1) sur le gagnant de la déduplication,
  // quel que soit l'appareil qui a créé le doublon local.
  const superadmin = gagnants.find((c) => c.role === "superadmin");
  if (superadmin) {
    const hashCible = await hacherMotDePasse(motDePasseSuperAdmin(), `mboa-${superadmin.id}`);
    if (superadmin.motDePasse !== hashCible) {
      const maj: CompteAuth = { ...superadmin, motDePasse: hashCible, actif: true };
      await cacheEcrire("compte", maj.id, maj);
      if (maj.telephone) await cacheEcrire("compte", `tel:${maj.telephone}`, maj);
      if (maj.email) await cacheEcrire("compte", `mail:${maj.email}`, maj);
      publierCompteAdmin(maj);
    }
  }

  return fusionnes;
}
