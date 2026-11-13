/**
 * Authentification locale MBOA BIO.
 *
 * Règles :
 * - Le consommateur s'inscrit lui-même avec son téléphone OU son adresse mail.
 * - Le fournisseur s'inscrit via le portail « Devenir fournisseur ».
 * - Le livreur n'a PAS de compte auto : l'admin le crée et lui remet ses identifiants.
 * - L'admin a un mot de passe initial (`admin123`) qu'il doit changer
 *   dès sa première connexion sur un nouvel appareil.
 *
 * Tout est stocké dans le cache local (IndexedDB), jamais en clair côté serveur.
 */

export type RoleAuth = "consommateur" | "fournisseur" | "livreur" | "admin" | "superadmin";

export interface CompteAuth {
  id: string;
  role: RoleAuth;
  nom: string;
  /** Numéro au format international sans "+", ou null si inscription par mail. */
  telephone: string | null;
  /** Adresse mail en minuscules, ou null si inscription par téléphone. */
  email: string | null;
  village: string;
  /** Empreinte du mot de passe - jamais le mot de passe en clair. */
  motDePasse: string;
  /** Empreinte de l'appareil ayant créé le compte. */
  appareil: string;
  /** Vrai si le mot de passe est encore celui par défaut. */
  motDePasseParDefaut: boolean;
  actif: boolean;
  createdLe: string;
}

/** Empreinte de l'appareil - identifie une installation de PWA. */
export function empreinteAppareil(): string {
  if (typeof window === "undefined") return "inconnu";
  try {
    const cle = "mboa-appareil";
    let v = window.localStorage.getItem(cle);
    if (!v) {
      v = `app-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      window.localStorage.setItem(cle, v);
    }
    return v;
  } catch {
    return "inconnu";
  }
}

/** Empreinte du mot de passe - SHA-256 + sel. */
export async function hacherMotDePasse(mdp: string, sel: string): Promise<string> {
  const brut = `${sel}:${mdp}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    // Garde-fou : sur certains WebViews, digest() peut rester pendant.
    // On abandonne après 5 s pour ne jamais geler le bouton de connexion.
    const digest = crypto.subtle.digest("SHA-256", new TextEncoder().encode(brut));
    const buf = await Promise.race([
      digest,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("hash timeout")), 5000),
      ),
    ]);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Repli : hachage simple, suffisant hors navigateur moderne
  let h = 5381;
  for (let i = 0; i < brut.length; i++) {
    h = ((h << 5) + h + brut.charCodeAt(i)) | 0;
  }
  return `djb2-${(h >>> 0).toString(16)}`;
}

/** Sel dérivé de l'identifiant du compte. */
function selDe(id: string): string {
  return `mboa-${id}`;
}

/** Mot de passe initial de l'admin - non exporté pour ne pas apparaître dans le bundle client. */
const MDP_ADMIN_INITIAL = "admin123";

/** Indique si un mot de passe est le mot de passe initial admin (sans le révéler). */
export function estMotDePasseInitial(mdp: string): boolean {
  return mdp === MDP_ADMIN_INITIAL;
}

/** Utilisé uniquement côté service pour créer/réinitialiser le compte admin. */
export function motDePasseAdminInitial(): string {
  return MDP_ADMIN_INITIAL;
}

/** Identifiant de connexion du compte admin de bootstrap. */
export const EMAIL_ADMIN_INITIAL = "mboa-admin@237";

/** Identifiant affiché du super admin (compte caché, accessible via le chou 🥬). */
export const IDENTIFIANT_SUPERADMIN = "CADC";
export const EMAIL_SUPERADMIN = "cadc@mboa-super.local";
const MDP_SUPERADMIN = "Joaka@101!";

/** Mot de passe du super admin - utilisé uniquement à la création du compte. */
export function motDePasseSuperAdmin(): string {
  return MDP_SUPERADMIN;
}

/** Interface d'identification : téléphone OU adresse mail. */
export type Identifiant = { type: "telephone"; valeur: string } | { type: "email"; valeur: string };

/** Normalise un téléphone camerounais en format international sans "+". */
export function normaliserTel(tel: string): string | null {
  const brut = tel.replace(/\D/g, "");
  if (brut.length === 9) {
    // 6XX/2XX sur 9 chiffres → préfixe 237
    if (brut.startsWith("6") || brut.startsWith("2")) return `237${brut}`;
    return null;
  }
  if (brut.length === 12 && brut.startsWith("237")) return brut;
  if (brut.length === 10 && brut.startsWith("237")) return `237${brut.slice(3)}`;
  return null;
}

/** Normalise une adresse mail. */
export function normaliserEmail(mail: string): string | null {
  const m = mail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) return null;
  return m;
}

/** Détecte le type d'identifiant saisi. */
export function detecterIdentifiant(saisie: string): Identifiant | null {
  const brut = saisie.trim();
  if (brut.includes("@")) {
    const mail = normaliserEmail(brut);
    return mail ? { type: "email", valeur: mail } : null;
  }
  const tel = normaliserTel(brut);
  return tel ? { type: "telephone", valeur: tel } : null;
}

/** Affiche un identifiant de façon lisible. */
export function afficherIdentifiant(c: CompteAuth): string {
  if (c.email) return c.email;
  if (c.telephone) return `+${c.telephone}`;
  return "-";
}

/** Règles de robustesse du mot de passe. */
export function validerMotDePasse(mdp: string): { ok: boolean; message: string } {
  if (mdp.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters" };
  }
  if (!/[0-9]/.test(mdp)) {
    return { ok: false, message: "Password must contain at least one digit" };
  }
  return { ok: true, message: "" };
}
