"use client";

import { mboaReseau } from "../data/mboa_reseau";

/**
 * Couche Supabase Auth - migration progressive.
 *
 * Stratégie : quand Supabase est configuré ET en ligne, la vérification
 * du mot de passe des comptes à email passe par le serveur Supabase
 * (les hash locaux ne sont plus la référence). Hors-ligne ou compte
 * sans email, on retombe sur le hash local IndexedDB - rien ne casse.
 *
 * Retourne :
 *  - true  : identifiants confirmés par Supabase
 *  - false : identifiants refusés par Supabase
 *  - null  : Supabase injoignable → l'appelant utilise le repli local
 */

function auth() {
  return mboaReseau()?.auth ?? null;
}

export function authSupabaseDisponible(): boolean {
  return auth() != null && typeof navigator !== "undefined" && navigator.onLine;
}

/** Vérifie email + mot de passe auprès de Supabase Auth. */
export async function verifierMotDePasseSupabase(
  email: string,
  motDePasse: string
): Promise<boolean | null> {
  const a = auth();
  if (!a) return null;
  try {
    const { error } = await a.signInWithPassword({ email, password: motDePasse });
    if (error) {
      // Erreur d'identifiants (400/401/403) = vrai refus ; le reste = réseau.
      const status = (error as { status?: number }).status;
      return status === 400 || status === 401 || status === 403 ? false : null;
    }
    return true;
  } catch {
    return null;
  }
}

/** Crée le compte côté Supabase Auth (inscription email). */
export async function inscrireSupabase(email: string, motDePasse: string): Promise<boolean> {
  const a = auth();
  if (!a) return false;
  try {
    const { error } = await a.signUp({ email, password: motDePasse });
    return !error;
  } catch {
    return false;
  }
}

/** Change le mot de passe côté Supabase Auth (nécessite une session ouverte). */
export async function changerMotDePasseSupabase(nouveau: string): Promise<boolean> {
  const a = auth();
  if (!a) return false;
  try {
    const { error } = await a.updateUser({ password: nouveau });
    return !error;
  } catch {
    return false;
  }
}

/** Déconnecte la session Supabase (fire-and-forget). */
export function deconnecterSupabase(): void {
  const a = auth();
  if (!a) return;
  void a.signOut().catch(() => {});
}
