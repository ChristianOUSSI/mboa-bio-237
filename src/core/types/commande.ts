import { categorieResolve } from "./categorie";
import { Unite, uniteResolve, uniteAvec, unitePour, uniteAvecArticle } from "./unite";
import { PackComposant, packComposantDepuisJson } from "./pack_composant";

/** Une ligne du devis, telle qu'elle est gelée dans `commandes.produits`. */
export interface LigneCommande {
  produitId: string;
  slug?: string | null;
  nom: string;
  categorie: string;
  quantite: number;
  prix: number;
  coutAchat: number;
  photo: string;
  /** Unité choisie : valeur de l'enum Unite OU libellé libre
   *  (« sac », « caisse »…) défini dans produit.unites. */
  unite?: string | null;
  composants: PackComposant[];
}

export function ligneEstPack(l: LigneCommande): boolean {
  return l.composants.length > 0;
}

export function ligneEstLibre(l: LigneCommande): boolean {
  return !ligneEstPack(l) && (!l.slug || l.slug.length === 0);
}

const UNITES_CONNNUES = new Set<string>(Object.values(Unite));

export function ligneUniteReelle(l: LigneCommande): Unite {
  // Unité libre inconnue de l'enum → kg par défaut pour la logique
  // interne ; l'affichage utilise ligneQuantiteAffichee qui préserve
  // le libellé brut.
  if (l.unite) return uniteResolve(l.unite);
  if (ligneEstPack(l)) return Unite.part;
  if (ligneEstLibre(l)) return Unite.morceau;
  return Unite.kg;
}

export function ligneQuantiteAffichee(l: LigneCommande): string {
  if (l.unite && !UNITES_CONNNUES.has(l.unite)) {
    return `${l.quantite} ${l.unite}`;
  }
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
    unite: (json.unite as string) ?? null,
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
    // Préserve l'unité libre choisie (« sac »…) ; sinon l'unité réelle.
    unite: l.unite ?? u,
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
  // Clé = libellé brut (« sac »…) si présent, sinon l'unité réelle.
  const parUnite = new Map<string, { unite: Unite | null; total: number }>();
  for (const l of lignes) {
    const brut = l.unite ?? null;
    const cle = brut ?? ligneUniteReelle(l);
    const entree = parUnite.get(cle) ?? { unite: brut ? null : ligneUniteReelle(l), total: 0 };
    entree.total += l.quantite;
    parUnite.set(cle, entree);
  }
  if (parUnite.size === 0) return "rien";
  return Array.from(parUnite.entries())
    .map(([cle, v]) => (v.unite ? uniteAvec(v.unite, v.total) : `${v.total} ${cle}`))
    .join(" · ");
}
