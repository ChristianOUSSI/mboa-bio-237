"use client";

import { cacheEcrire, cacheLire, cacheTout } from "./base_locale";
import { mboaReseau } from "./mboa_reseau";
import { uuidV4, slugDe } from "../utils/identifiants";
import { CATEGORIE_INFO, Categorie } from "../types/categorie";

/**
 * Catégories de produits créées par l'admin, en plus des 8 catégories
 * intégrées. Répliquées via Supabase (table `categories`) pour que tous
 * les appareils voient les mêmes.
 */

export interface CategoriePerso {
  id: string;
  /** Slug unique — stocké dans `produit.categorie` / `achat.categorie`. */
  slug: string;
  nom: string;
  emoji: string;
  createdLe: string;
}

const ENTITE = "categorie";
const TABLE = "categories_perso";

const SLUGS_INTEGRES = new Set<string>(Object.values(Categorie));

/** Toutes les catégories personnalisées (local + fusion Supabase). */
export async function categoriesPerso(): Promise<CategoriePerso[]> {
  const locales = (await cacheTout<CategoriePerso | null>(ENTITE)).filter(
    (c): c is CategoriePerso => c != null && typeof c.slug === "string",
  );
  const client = mboaReseau();
  if (!client) return locales;
  const { data } = await client.from(TABLE).select("id, slug, nom, emoji, created_le").limit(200);
  if (!data || data.length === 0) return locales;
  const distantes: CategoriePerso[] = (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    nom: String(r.nom),
    emoji: String(r.emoji ?? "🏷️"),
    createdLe: String(r.created_le ?? ""),
  }));
  const parSlug = new Map<string, CategoriePerso>();
  for (const c of [...locales, ...distantes]) parSlug.set(c.slug, c);
  return [...parSlug.values()].sort((a, b) => a.nom.localeCompare(b.nom));
}

/** Crée une catégorie personnalisée. Retourne null si invalide ou existante. */
export async function creerCategoriePerso(nom: string, emoji: string): Promise<CategoriePerso | null> {
  const nomPropre = nom.trim();
  if (nomPropre.length < 2) return null;
  const slug = slugDe(nomPropre);
  if (!slug || SLUGS_INTEGRES.has(slug)) return null;
  const existante = (await categoriesPerso()).find((c) => c.slug === slug);
  if (existante) return existante;
  const cat: CategoriePerso = {
    id: uuidV4(),
    slug,
    nom: nomPropre,
    emoji: emoji || "🏷️",
    createdLe: new Date().toISOString(),
  };
  await cacheEcrire(ENTITE, cat.slug, cat);
  const client = mboaReseau();
  if (client) {
    void client
      .from(TABLE)
      .upsert({ id: cat.id, slug: cat.slug, nom: cat.nom, emoji: cat.emoji, created_le: cat.createdLe })
      .then(({ error }) => {
        if (error) console.warn("[synchro] catégorie:", error.message);
      });
  }
  return cat;
}

/** Supprime une catégorie personnalisée (les produits gardent leur slug). */
export async function supprimerCategoriePerso(slug: string): Promise<void> {
  await cacheEcrire(ENTITE, slug, null);
  const client = mboaReseau();
  if (client) {
    void client.from(TABLE).delete().eq("slug", slug).then(({ error }) => {
      if (error) console.warn("[synchro] catégorie:", error.message);
    });
  }
}

/** Libellé d'affichage d'un slug de catégorie (intégré ou personnalisé). */
export function libelleCategorie(slug: string, persos: CategoriePerso[]): string {
  const perso = persos.find((c) => c.slug === slug);
  if (perso) return perso.nom;
  const info = (CATEGORIE_INFO as Record<string, { libelle: string }>)[slug];
  return info?.libelle ?? slug;
}

/** Émoji d'une catégorie personnalisée, sinon null. */
export function emojiCategorie(slug: string, persos: CategoriePerso[]): string | null {
  return persos.find((c) => c.slug === slug)?.emoji ?? null;
}
