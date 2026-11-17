"use client";

import { mboaReseau } from "./mboa_reseau";
import { etatLire, etatEcrire } from "./base_locale";

/**
 * Paramètres globaux de l'app (tarif de livraison, etc.).
 * Source de vérité : table Supabase `parametres` (cle / valeur jsonb).
 * Repli local : store IndexedDB `etat`, pour le hors-ligne et les
 * appareils pas encore synchronisés. La lecture cloud rafraîchit le
 * cache local à chaque appel.
 */

export async function lireParametre<T>(cle: string, defaut: T): Promise<T> {
  const client = mboaReseau();
  if (client) {
    try {
      const { data, error } = await client
        .from("parametres")
        .select("valeur")
        .eq("cle", cle)
        .maybeSingle();
      if (!error && data && data.valeur !== null && data.valeur !== undefined) {
        void etatEcrire(cle, data.valeur);
        return data.valeur as T;
      }
    } catch {
      // Réseau coupé : on retombe sur le cache local.
    }
  }
  const local = await etatLire<T>(cle);
  return local ?? defaut;
}

export async function ecrireParametre(cle: string, valeur: unknown): Promise<void> {
  await etatEcrire(cle, valeur);
  const client = mboaReseau();
  if (!client) return;
  try {
    const { error } = await client.from("parametres").upsert({
      cle,
      valeur,
      maj_le: new Date().toISOString(),
    });
    if (error) console.warn("parametres upsert:", error.message);
  } catch (e) {
    console.warn("parametres upsert failed:", e);
  }
}
