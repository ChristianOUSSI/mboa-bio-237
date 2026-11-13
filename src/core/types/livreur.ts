import { StatutCommande, statutCommandeResolve } from "./statuts";
import { LigneCommande, ligneFromJson, resumerQuantites } from "./commande";

/** Un moto qui porte les paniers. Table `public.livreurs`. */
export interface Livreur {
  id: string;
  nom: string;
  telephone: string;
  zone: string;
  profilId?: string | null;
  photo?: string | null;
  moto?: string | null;
  plaque?: string | null;
  tarifCourse: number;
  actif: boolean;
}

export function livreurRepere(l: Livreur): string {
  const p = l.plaque?.trim();
  if (p && p.length > 0) return p;
  const m = l.moto?.trim();
  if (m && m.length > 0) return m;
  return l.nom;
}

export function livreurFromMap(map: Record<string, unknown>): Livreur {
  return {
    id: map.id as string,
    nom: (map.nom as string) ?? "Livreur",
    telephone: (map.telephone_237 as string) ?? "",
    zone: (map.zone as string) ?? "",
    profilId: (map.profil_id as string) ?? null,
    photo: (map.photo as string) ?? null,
    moto: (map.moto as string) ?? null,
    plaque: (map.plaque as string) ?? null,
    tarifCourse: Math.round(Number(map.tarif_course ?? 0)),
    actif: (map.actif as boolean) ?? true,
  };
}

/** Une course telle que le livreur la voit. Ligne de `mboa.mes_courses()`. */
export interface CourseLivreur {
  id: string;
  statut: StatutCommande;
  montantTotal: number;
  tarifCourse: number;
  createdLe: string;
  livreeLe?: string | null;
  /** Date à laquelle le livreur a été payé, après réception confirmée par la cliente. */
  payeLe?: string | null;
  clienteNom: string;
  clienteVillage: string;
  clienteTelephone?: string | null;
  lignes: LigneCommande[];
}

export function courseEnRoute(c: CourseLivreur): boolean {
  return c.statut === StatutCommande.enLivraison;
}

export function courseACharger(c: CourseLivreur): boolean {
  return c.statut === StatutCommande.valideeAdmin;
}

/** Le livreur est payé uniquement quand la cliente a confirmé la réception. */
export function courseEstPayee(c: CourseLivreur): boolean {
  return c.statut === StatutCommande.recue;
}

/** Le paiement est dû (réception confirmée mais pas encore payée). */
export function coursePaiementDu(c: CourseLivreur): boolean {
  return c.statut === StatutCommande.recue && !c.payeLe;
}

export function courseClienteLabel(c: CourseLivreur): string {
  const nom = c.clienteNom.trim();
  const base = nom.length === 0 ? "La cliente" : nom;
  const village = c.clienteVillage.trim();
  return village.length === 0 ? base : `${base}, ${village}`;
}

export function courseResumeQuantites(c: CourseLivreur): string {
  return resumerQuantites(c.lignes);
}

/** Montant que le livreur doit encaisser : tarif course + montant commande (payé à réception confirmée). */
export function courseMontantAEncaisser(c: CourseLivreur): number {
  return c.montantTotal + (c.tarifCourse ?? 0);
}

/** Statut du paiement pour affichage. */
export function courseStatutPaiement(c: CourseLivreur): { label: string; couleur: "vert" | "orange" | "gris" } {
  if (courseEstPayee(c) && c.payeLe) return { label: "Payé", couleur: "vert" };
  if (coursePaiementDu(c)) return { label: "À encaisser (réception confirmée)", couleur: "orange" };
  return { label: "En livraison", couleur: "gris" };
}

export function courseFromMap(map: Record<string, unknown>): CourseLivreur {
  const brut = map.produits;
  let tableau: unknown[];
  if (Array.isArray(brut)) {
    tableau = brut;
  } else if (typeof brut === "string" && brut.trim().length > 0) {
    tableau = JSON.parse(brut);
  } else {
    tableau = [];
  }
  return {
    id: map.id as string,
    statut: statutCommandeResolve(map.statut_enum as string),
    montantTotal: Math.round(Number(map.montant_total ?? 0)),
    tarifCourse: Math.round(Number(map.tarif_course ?? map.tarif_livreur ?? 0)),
    createdLe: (map.created_at as string) ?? new Date(0).toISOString(),
    livreeLe: (map.livree_le as string) ?? null,
    payeLe: (map.paye_le as string) ?? null,
    clienteNom: (map.cliente_nom as string) ?? "",
    clienteVillage: (map.cliente_village as string) ?? "",
    clienteTelephone: (map.cliente_tel as string) ?? null,
    lignes: tableau
      .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
      .map((j) => ligneFromJson(j)),
  };
}
