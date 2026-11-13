/** Configuration de l'environnement MBOA BIO. */

export type AppRole = "fournisseur" | "admin" | "consommateur" | "livreur" | "superadmin";

export const APP_ROLE_INFO: Record<AppRole, { appName: string; description: string }> = {
  fournisseur: { appName: "MBOA FOURNISSEUR", description: "Les paysans au champ" },
  admin: { appName: "MBOA ADMIN", description: "Contrôle qualité" },
  consommateur: { appName: "MBOA BIO 237", description: "Le client du marché" },
  livreur: { appName: "MBOA LIVREUR", description: "La moto qui porte le panier" },
  superadmin: { appName: "MBOA SUPER", description: "Accès racine" },
};

export function roleResolve(slug?: string | null): AppRole {
  if (!slug) return "consommateur";
  const found = (Object.keys(APP_ROLE_INFO) as string[]).includes(slug);
  return found ? (slug as AppRole) : "consommateur";
}

/** URL et clé publique Supabase. La sécurité vient de la RLS, pas du secret. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Vrai seulement si l'URL commence par http et la clé fait plus de 20 caractères. */
export const supabaseConfigure: boolean =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

/** Durée maximale d'un message vocal, en secondes. */
export const DUREE_MESSAGE_VOCAL = 5;

/** Nombre de chiffres du code OTP. */
export const OTP_CHIFFRES = 4;

/** Délai de relance (en heures) avant clôture sur silence. */
export const DELAI_RELANCE_HEURES = 12;

/** Message d'avertissement quand Supabase n'est pas configuré. */
export const problemeConfig = supabaseConfigure
  ? null
  : "Mode démo : aucune base Supabase configurée. Les données restent locales au navigateur.";
