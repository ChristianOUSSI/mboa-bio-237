import { Unite, uniteResolve } from "./unite";

/** Un élément d'un plat préparé : « 3 bottes de ndolè ». */
export interface PackComposant {
  slug: string;
  nom?: string | null;
  quantite: number;
  unite: Unite;
}

export function packComposantLibelle(c: PackComposant): string {
  const gele = c.nom?.trim();
  return !gele || gele.length === 0
    ? c.slug.replaceAll("_", " ")
    : gele;
}

export function packComposantDepuisJson(brut: unknown): PackComposant[] {
  if (!brut) return [];
  let tableau: unknown[];
  if (Array.isArray(brut)) {
    tableau = brut;
  } else if (typeof brut === "string" && brut.trim().length > 0) {
    try {
      const decoded = JSON.parse(brut);
      tableau = Array.isArray(decoded) ? decoded : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  return tableau
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .map((j) => ({
      slug: (j.slug as string) ?? "",
      nom: (j.nom as string) ?? null,
      quantite: Number(j.quantite ?? 0),
      unite: uniteResolve(j.unite as string),
    }));
}
