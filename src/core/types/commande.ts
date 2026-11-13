import { Categorie, categorieResolve } from "./categorie";
import { Unite, uniteResolve, uniteAvec, unitePour, uniteAvecArticle } from "./unite";
import { PackComposant, packComposantDepuisJson } from "./pack_composant";

/** Une ligne du devis, telle qu'elle est gelée dans `commandes.produits`. */
export interface LigneCommande {
  produitId: string;
  slug?: string | null;
  nom: string;
  categorie: Categorie;
  quantite: number;
  prix: number;
  coutAchat: number;
  photo: string;
  unite?: Unite | null;
  composants: PackComposant[];
}

export function ligneEstPack(l: LigneCommande): boolean {
  return l.composants.length > 0;
}

export function ligneEstLibre(l: LigneCommande): boolean {
  return !ligneEstPack(l) && (!l.slug || l.slug.length === 0);
}

export function ligneUniteReelle(l: LigneCommande): Unite {
  if (l.unite) return l.unite;
  if (ligneEstPack(l)) return Unite.part;
  if (ligneEstLibre(l)) return Unite.morceau;
  return Unite.kg;
}

export function ligneQuantiteAffichee(l: LigneCommande): string {
  return uniteAvec(ligneUniteReelle(l), l.quantite);
}

export function ligneAnnonce(l: LigneCommande): string {
  return `${ligneQuantiteAffichee(l)} de ${l.nom}`;
}

export function ligneSousTotal(l: LigneCommande): number {
  return Math.round(l.quantite * l.prix);
}

export function ligneCout(l: LigneCommande): number {
  return Math.round(l.quantite * l.coutAchat);
}

export function ligneFromJson(json: Record<string, unknown>): LigneCommande {
  const slugRaw = (json.slug as string) ?? "";
  const slug = slugRaw.trim().length === 0 ? null : slugRaw;
  return {
    produitId: (json.produit_id as string) ?? "",
    slug,
    nom: (json.nom as string) ?? "",
    categorie: categorieResolve(json.categorie as string),
    quantite: Number(json.quantite ?? 0),
    prix: Math.round(Number(json.prix ?? 0)),
    coutAchat: Math.round(Number(json.cout_achat ?? 0)),
    photo: (json.photo as string) ?? "",
    unite: json.unite ? uniteResolve(json.unite as string) : null,
    composants: packComposantDepuisJson(json.composants),
  };
}

export function ligneToJson(l: LigneCommande): Record<string, unknown> {
  const u = ligneUniteReelle(l);
  const base: Record<string, unknown> = {
    produit_id: l.produitId,
    slug: l.slug ?? "",
    nom: l.nom,
    categorie: l.categorie,
    quantite: l.quantite,
    unite: u,
    prix: l.prix,
    cout_achat: l.coutAchat,
    photo: l.photo,
  };
  if (ligneEstPack(l)) {
    base.composants = l.composants.map((c) => ({
      slug: c.slug,
      nom: packComposantLibelle(c),
      quantite: c.quantite,
      unite: c.unite,
    }));
  }
  return base;
}

function packComposantLibelle(c: PackComposant): string {
  const gele = c.nom?.trim();
  return !gele || gele.length === 0 ? c.slug.replaceAll("_", " ") : gele;
}

/** Résume les quantités d'un panier, groupées par unité : « 8 kilos · 2 parts ». */
export function resumerQuantites(lignes: LigneCommande[]): string {
  const parUnite = new Map<Unite, number>();
  for (const l of lignes) {
    const u = ligneUniteReelle(l);
    parUnite.set(u, (parUnite.get(u) ?? 0) + l.quantite);
  }
  if (parUnite.size === 0) return "rien";
  return Array.from(parUnite.entries())
    .map(([u, val]) => uniteAvec(u, val))
    .join(" · ");
}
