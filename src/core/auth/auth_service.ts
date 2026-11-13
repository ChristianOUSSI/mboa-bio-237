import { CompteAuth, RoleAuth, empreinteAppareil, hacherMotDePasse, normaliserTel, normaliserEmail, motDePasseAdminInitial } from "./auth_local";
import { cacheTout, cacheEcrire, cacheLire } from "../data/base_locale";
import { uuidV4 } from "../utils/identifiants";

export type { CompteAuth, RoleAuth };

/** Entité de cache qui porte les comptes. */
const ENTITE = "compte";

/** Tous les comptes enregistrés. */
export async function tousComptes(): Promise<CompteAuth[]> {
  return cacheTout<CompteAuth>(ENTITE);
}

/** Lit un compte par son identifiant. */
export async function compteParId(id: string): Promise<CompteAuth | null> {
  return cacheLire<CompteAuth>(ENTITE, id);
}

/** Clé de recherche par téléphone. */
function cleTel(tel: string): string {
  return `tel:${tel}`;
}

/** Clé de recherche par mail. */
function cleMail(mail: string): string {
  return `mail:${mail}`;
}

/** Cherche un compte par téléphone ou par adresse mail. */
export async function compteParIdentifiant(identifiant: string): Promise<CompteAuth | null> {
  const comptes = await tousComptes();
  const cible = identifiant.trim().toLowerCase();
  const tel = normaliserTel(cible);
  const mail = normaliserEmail(cible);
  return (
    comptes.find((c) => (tel && c.telephone === tel) || (mail && c.email === mail)) ?? null
  );
}

/** Vérifie qu'un identifiant est déjà pris. */
export async function identifiantPris(identifiant: string, saufId?: string): Promise<boolean> {
  const c = await compteParIdentifiant(identifiant);
  return c != null && c.id !== saufId;
}

/** Crée un compte et l'écrit dans le cache. */
export async function creerCompte(params: {
  role: RoleAuth;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  village?: string;
  motDePasse: string;
  /** Mot de passe par défaut à changer à la première connexion. */
  motDePasseParDefaut?: boolean;
}): Promise<CompteAuth> {
  const id = uuidV4();
  const tel = params.telephone ? normaliserTel(params.telephone) : null;
  const mail = params.email ? normaliserEmail(params.email) : null;
  const motDePasse = await hacherMotDePasse(params.motDePasse, `mboa-${id}`);

  const compte: CompteAuth = {
    id,
    role: params.role,
    nom: params.nom.trim(),
    telephone: tel,
    email: mail,
    village: params.village?.trim() ?? "",
    motDePasse,
    appareil: empreinteAppareil(),
    motDePasseParDefaut: params.motDePasseParDefaut ?? false,
    actif: true,
    createdLe: new Date().toISOString(),
  };

  await cacheEcrire(ENTITE, id, compte);
  if (tel) await cacheEcrire(ENTITE, cleTel(tel), compte);
  if (mail) await cacheEcrire(ENTITE, cleMail(mail), compte);
  return compte;
}

/** Vérifie le mot de passe d'un compte. */
export async function verifierMotDePasse(compte: CompteAuth, mdp: string): Promise<boolean> {
  const h = await hacherMotDePasse(mdp, `mboa-${compte.id}`);
  return h === compte.motDePasse;
}

/**
 * Change le mot de passe d'un compte.
 * Met à jour les index téléphone et mail.
 */
export async function changerMotDePasse(compte: CompteAuth, nouveau: string): Promise<CompteAuth> {
  const motDePasse = await hacherMotDePasse(nouveau, `mboa-${compte.id}`);
  const maj: CompteAuth = {
    ...compte,
    motDePasse,
    motDePasseParDefaut: false,
    appareil: empreinteAppareil(),
  };
  await cacheEcrire(ENTITE, maj.id, maj);
  if (maj.telephone) await cacheEcrire(ENTITE, cleTel(maj.telephone), maj);
  if (maj.email) await cacheEcrire(ENTITE, cleMail(maj.email), maj);
  return maj;
}

/** Met à jour un compte (profil, village, etc.). */
export async function majCompte(compte: CompteAuth, maj: Partial<CompteAuth>): Promise<CompteAuth> {
  const nouveau: CompteAuth = { ...compte, ...maj };
  await cacheEcrire(ENTITE, nouveau.id, nouveau);
  if (nouveau.telephone) await cacheEcrire(ENTITE, cleTel(nouveau.telephone), nouveau);
  if (nouveau.email) await cacheEcrire(ENTITE, cleMail(nouveau.email), nouveau);
  return nouveau;
}

/** Supprime un compte (désactivation). */
export async function desactiverCompte(compte: CompteAuth): Promise<void> {
  await majCompte(compte, { actif: false });
}

/**
 * Vérifie si le compte a été connecté sur un autre appareil
 * et si son mot de passe est encore celui par défaut.
 */
export function doitChangerMotDePasse(compte: CompteAuth): boolean {
  return compte.motDePasseParDefaut && compte.appareil !== empreinteAppareil();
}

/** Vérifie si le compte vient d'un autre appareil (session existante). */
export function estNouvelAppareil(compte: CompteAuth): boolean {
  return compte.appareil !== empreinteAppareil();
}

/**
 * Crée le compte admin s'il n'existe pas encore.
 * Mot de passe initial : `admin123`, à changer à la première connexion.
 * L'identifiant de connexion est l'email local `admin@mboa237.local`.
 */
export async function assurerCompteAdmin(): Promise<CompteAuth | null> {
  const comptes = await tousComptes();
  const existant = comptes.find((c) => c.role === "admin");
  if (existant) return existant;
  return creerCompte({
    role: "admin",
    nom: "MBOA Counter",
    telephone: null,
    email: "admin@mboa237.local",
    village: "Bafoussam",
    motDePasse: motDePasseAdminInitial(),
    motDePasseParDefaut: true,
  });
}

/**
 * Bootstrap premier lancement : crée le compte admin uniquement si la base
 * locale est totalement vide (première installation sur l'appareil du comptoir).
 * Sur une base déjà peuplée, ne fait rien — personne ne peut déclencher la
 * création du compte admin après coup.
 */
export async function amorcerSiAucunCompte(): Promise<CompteAuth | null> {
  const comptes = await tousComptes();
  if (comptes.length > 0) return null;
  return assurerCompteAdmin();
}

/** Supprime tous les comptes (utilisé par l'admin pour repartir de zéro). */
export async function effacerTousComptes(): Promise<number> {
  const comptes = await tousComptes();
  // On écrit des comptes inactifs plutôt que de supprimer : le cache IndexedDB
  // ne permet pas de parcourir et effacer par clé composite sans scan complet.
  for (const c of comptes) {
    await cacheEcrire(ENTITE, c.id, { ...c, actif: false });
    if (c.telephone) await cacheEcrire(ENTITE, cleTel(c.telephone), { ...c, actif: false });
    if (c.email) await cacheEcrire(ENTITE, cleMail(c.email), { ...c, actif: false });
  }
  return comptes.length;
}

/** Réinitialise le compte admin : nouveau mot de passe par défaut, nouvel appareil. */
export async function reinitialiserAdmin(): Promise<CompteAuth> {
  const comptes = await tousComptes();
  const admin = comptes.find((c) => c.role === "admin");
  if (!admin) {
    const neuf = await assurerCompteAdmin();
    if (!neuf) throw new Error("Unable to create the admin account");
    return neuf;
  }
  const motDePasse = await hacherMotDePasse(motDePasseAdminInitial(), `mboa-${admin.id}`);
  const maj: CompteAuth = {
    ...admin,
    motDePasse,
    motDePasseParDefaut: true,
    actif: true,
    appareil: empreinteAppareil(),
  };
  await cacheEcrire(ENTITE, maj.id, maj);
  return maj;
}

export { ENTITE as ENTITE_COMPTE };
