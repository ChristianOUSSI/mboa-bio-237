"use client";

import { mboaReseau } from "./mboa_reseau";
import { creerCategoriePerso } from "./categories";
import { cacheTout, cacheEcrire, cacheLire, etatEcrire, etatLire, fileAjouter, fileCompte } from "./base_locale";
import { CATALOGUE_HORS_LIGNE } from "./catalogue_hors_ligne";
import { supabaseConfigure } from "../config/app_env";
import { compteParIdentifiant } from "../auth/auth_service";
import { Produit, produitFromMap, produitUniteReelle } from "../types/produit";
import { uniteResolve } from "../types/unite";
import { EntreeCatalogue } from "../types/catalogue";
import { Categorie } from "../types/categorie";
import { Commande, commandeFromMap } from "../types/commande_full";
import { LigneCommande, ligneUniteReelle } from "../types/commande";
import { Achat, achatFromMap, achatMontant } from "../types/achat";
import { Profil, profilFromMap } from "../types/profil";
import { roleResolve } from "../config/app_env";
import { Livreur, livreurFromMap } from "../types/livreur";
import { Fournisseur, fournisseurFromMap } from "../types/fournisseur";
import { SuiviColis, suiviFromMaps, suiviVide, PositionGps, DEPOT_MBOA, etapesDepuisStatut } from "../types/suivi_colis";
import { uuidV4, slugDe } from "../utils/identifiants";

// ============================================================
// DepotProduits
// ============================================================

export async function chargerVitrine(): Promise<Produit[]> {
  const client = mboaReseau();
  if (client) {
    const { data, error } = await client.from("vitrine").select("*");
    if (!error && data) {
      const produits = data.map((d) => produitFromMap(d as unknown as Record<string, unknown>));
      for (const p of produits) {
        await cacheEcrire("vitrine", p.id, p);
      }
      return produits;
    }
  }
  return cacheTout<Produit>("vitrine");
}

export async function chargerStock(): Promise<Produit[]> {
  const client = mboaReseau();
  if (client) {
    const { data, error } = await client.from("produits").select("*").order("nom");
    if (!error && data) {
      return data.map((d) => produitFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Produit>("produit");
}

export async function chargerCatalogue(): Promise<EntreeCatalogue[]> {
  const client = mboaReseau();
  if (client) {
    const { data, error } = await client.from("catalogue").select("*").order("ordre");
    if (!error && data) {
      return data.map((d) => {
        const e = d as unknown as Record<string, unknown>;
        return {
          slug: (e.slug as string) ?? "",
          nom: (e.nom as string) ?? "",
          categorie: (e.categorie as Categorie) ?? Categorie.fruit,
          prixTendance: Number(e.prix_tendance ?? 0),
          paliers: Array.isArray(e.paliers) ? (e.paliers as number[]) : [],
          perissable: (e.perissable as boolean) ?? true,
          ordre: Number(e.ordre ?? 0),
          unite: (e.unite_defaut as never) ?? null,
          uniteLibelle: (e.unite_libelle as string) ?? null,
        };
      });
    }
  }
  // Fallback hors-ligne
  return CATALOGUE_HORS_LIGNE.slice().sort((a, b) => a.ordre - b.ordre);
}

// ============================================================
// DepotCommandes
// ============================================================

export async function commandesCliente(consommateurId: string): Promise<Commande[]> {
  const client = mboaReseau();
  if (client) {
    const { data, error } = await client
      .from("commandes_clientes")
      .select("*")
      .eq("consommateur_id", consommateurId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((d) => commandeFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Commande>("commande");
}

export async function toutesCommandes(): Promise<Commande[]> {
  const client = mboaReseau();
  if (client) {
    const { data, error } = await client
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((d) => commandeFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Commande>("commande");
}

export async function commander(lignes: { produitId: string; slug: string; nom: string; categorie: string; quantite: number; prix: number; unite: string; photo: string; composants?: { slug: string; nom?: string | null; quantite: number; unite: string }[] }[], consommateurId: string, contact?: { appelSouhaite?: boolean; numeroContact?: string | null; clientNom?: string | null; clientVillage?: string | null; clientTel?: string | null }): Promise<Commande | null> {
  const produitsJson = lignes.map((l) => ({
    produit_id: l.produitId,
    slug: l.slug,
    nom: l.nom,
    categorie: l.categorie,
    quantite: l.quantite,
    unite: l.unite,
    prix: l.prix,
    cout_achat: 0,
    photo: l.photo,
    ...(l.composants && l.composants.length > 0
      ? {
          composants: l.composants.map((c) => ({
            slug: c.slug,
            nom: c.nom ?? null,
            quantite: c.quantite,
            unite: c.unite,
          })),
        }
      : {}),
  }));
  const montantTotal = lignes.reduce((s, l) => s + Math.round(l.quantite * l.prix), 0);

  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.rpc("creer_devis", {
      p_lignes: produitsJson,
      p_montant: montantTotal,
    });
    if (!error && data) {
      const commande = commandeFromMap(data as unknown as Record<string, unknown>);
      // Le RPC ne connaît pas les champs contact : on les pose en update direct.
      const patch = {
        appel_souhaite: contact?.appelSouhaite ?? false,
        numero_contact: contact?.numeroContact ?? null,
      };
      if (patch.appel_souhaite || patch.numero_contact) {
        void mboaReseau()!.from("commandes").update(patch).eq("id", commande.id);
        return {
          ...commande,
          appelSouhaite: patch.appel_souhaite,
          numeroContact: patch.numero_contact,
        };
      }
      return commande;
    }
    // RPC absente/incompatible : insertion directe pour que le devis soit
    // visible par l'admin sur n'importe quel appareil.
    const { data: ins, error: errIns } = await mboaReseau()!
      .from("commandes")
      .insert({
        consommateur_id: consommateurId,
        produits: produitsJson,
        statut_enum: "nouvelle",
        montant_total: montantTotal,
        cout_achat: 0,
        livraison_moto: true,
        appel_souhaite: contact?.appelSouhaite ?? false,
        numero_contact: contact?.numeroContact ?? null,
        client_nom: contact?.clientNom ?? null,
        client_village: contact?.clientVillage ?? null,
        client_tel: contact?.clientTel ?? null,
      })
      .select("*")
      .maybeSingle();
    if (!errIns && ins) {
      const commande = commandeFromMap(ins as unknown as Record<string, unknown>);
      await cacheEcrire("commande", commande.id, commande);
      return commande;
    }
    if (errIns) console.warn("[devis] insert direct:", errIns.message);
  }
  // Offline : création locale
  const commande: Commande = {
    id: uuidV4(),
    consommateurId,
    lignes: lignes.map((l) => ({
      produitId: l.produitId,
      slug: l.slug,
      nom: l.nom,
      categorie: l.categorie as never,
      quantite: l.quantite,
      prix: l.prix,
      coutAchat: 0,
      photo: l.photo,
      unite: l.unite as never,
      composants: (l.composants ?? []).map((c) => ({
        slug: c.slug,
        nom: c.nom ?? null,
        quantite: c.quantite,
        unite: c.unite as never,
      })),
    })),
    statut: "nouvelle" as never,
    montantTotal,
    coutAchat: 0,
    livraisonMoto: true,
    stockSorti: false,
    appelVocalFait: false,
    appelSouhaite: contact?.appelSouhaite ?? false,
    numeroContact: contact?.numeroContact ?? null,
    createdLe: new Date().toISOString(),
    clos: false,
  };
  await cacheEcrire("commande", commande.id, commande);
  await fileAjouter("commande", commande.id, "rpc:creer_devis", { lignes: produitsJson, montant: montantTotal });
  return commande;
}

export async function confirmerReception(commandeId: string, satisfaction: "bon" | "probleme", motif?: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!.rpc("confirmer_reception", {
      p_commande: commandeId,
      p_satisfaction: satisfaction,
      p_motif: motif ?? null,
    });
    if (!error) return;
  }
  await fileAjouter("commande", commandeId, "rpc:confirmer_reception", { satisfaction, motif });
}

/** Décrémente le stock d'une ligne de devis validé. */
async function decrementerStock(ligne: LigneCommande): Promise<void> {
  if (!ligne.produitId || ligne.produitId.startsWith("libre_")) return;
  const uLigne = ligneUniteReelle(ligne);

  let produit: Produit | null = null;
  if (mboaReseau()) {
    const { data } = await mboaReseau()!
      .from("produits")
      .select("*")
      .eq("id", ligne.produitId)
      .maybeSingle();
    if (data) produit = produitFromMap(data as unknown as Record<string, unknown>);
  }
  if (!produit) produit = await cacheLire<Produit>("produit", ligne.produitId);
  if (!produit) return;
  // Unités non convertibles : on ne décrémente pas à l'aveugle
  if (produitUniteReelle(produit) !== uLigne) return;

  const nouvelleQte = Math.max(0, produit.quantite - ligne.quantite);
  produit.quantite = nouvelleQte;
  if (mboaReseau()) {
    await mboaReseau()!.from("produits").update({ quantite: nouvelleQte }).eq("id", produit.id);
    await mboaReseau()!.from("vitrine").update({ quantite: nouvelleQte }).eq("id", produit.id);
  }
  // Le client ne voit que le stock réel : vitrine et stock admin restent synchronisés
  await cacheEcrire("produit", produit.id, produit);
  await cacheEcrire("vitrine", produit.id, produit);
}

/** L'admin valide le devis : statut nouvelle → validee_admin, et le stock diminue. */
export async function validerDevis(commande: Commande): Promise<void> {
  const commandeId = commande.id;
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("commandes")
      .update({ statut_enum: "validee_admin" })
      .eq("id", commandeId);
    if (!error) {
      for (const l of commande.lignes) await decrementerStock(l);
      void notifierActiviteAdmin("act.devisValide", commande.lignes.map((l) => l.nom).join(", "));
      return;
    }
  }
  await fileAjouter("commande", commandeId, "update:statut=validee_admin", {});
  for (const l of commande.lignes) await decrementerStock(l);
  void notifierActiviteAdmin("act.devisValide", commande.lignes.map((l) => l.nom).join(", "));
}

/** L'admin assigne un livreur au devis validé. */
export async function assignerLivreur(commandeId: string, livreurId: string, tarifCourse: number): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("commandes")
      .update({
        livreur_id: livreurId,
        tarif_livreur: tarifCourse,
      })
      .eq("id", commandeId);
    if (!error) {
      void notifierActiviteAdmin("act.livreurAssigne", livreurId);
      return;
    }
  }
  await fileAjouter("commande", commandeId, "update:assigner_livreur", { livreurId, tarifCourse });
  void notifierActiviteAdmin("act.livreurAssigne", livreurId);
}

/** Le livreur démarre la livraison : statut validee_admin → en_livraison. */
export async function demarrerLivraison(commandeId: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("commandes")
      .update({ statut_enum: "en_livraison" })
      .eq("id", commandeId);
    if (!error) return;
  }
  await fileAjouter("commande", commandeId, "update:statut=en_livraison", {});
}

/** L'admin refuse un devis : statut → annulee (avant toute sortie de stock). */
export async function refuserDevis(commandeId: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("commandes")
      .update({ statut_enum: "annulee", annule_le: new Date().toISOString() })
      .eq("id", commandeId);
    if (error) {
      await fileAjouter("commande", commandeId, "update:statut=annulee", {});
    }
  } else {
    await fileAjouter("commande", commandeId, "update:statut=annulee", {});
  }
  const cmd = await cacheLire<Commande>("commande", commandeId);
  if (cmd) {
    await cacheEcrire("commande", commandeId, { ...cmd, statut: "annulee" as never });
  }
  void notifierActiviteAdmin("act.devisRefuse", commandeId.slice(0, 8));
}

/** Le comptoir ajuste le stock ou le prix d'un produit (admin). */
export async function ajusterProduit(produitId: string, maj: { quantite?: number; prix?: number }): Promise<void> {
  let produit = await cacheLire<Produit>("produit", produitId);
  if (!produit && mboaReseau()) {
    const { data } = await mboaReseau()!
      .from("produits")
      .select("*")
      .eq("id", produitId)
      .maybeSingle();
    if (data) produit = produitFromMap(data as unknown as Record<string, unknown>);
  }
  if (!produit) return;

  const miseAJour: Record<string, unknown> = {};
  if (maj.quantite != null) {
    produit.quantite = Math.max(0, maj.quantite);
    miseAJour.quantite = produit.quantite;
  }
  if (maj.prix != null) {
    produit.prix = Math.round(maj.prix);
    miseAJour.prix = produit.prix;
  }
  if (mboaReseau() && Object.keys(miseAJour).length > 0) {
    await mboaReseau()!.from("produits").update(miseAJour).eq("id", produitId);
    await mboaReseau()!.from("vitrine").update(miseAJour).eq("id", produitId);
  }
  await cacheEcrire("produit", produit.id, produit);
  await cacheEcrire("vitrine", produit.id, produit);
  void notifierActiviteAdmin("act.stockAjuste", `${produit.nom} → ${produit.quantite}`);
}

/** L'admin crée manuellement un produit dans le stock (hors achat fournisseur). */
export async function creerProduit(params: {
  nom: string;
  categorie: string;
  unite: string;
  prix: number;
  quantite: number;
  photo?: string;
  prixAchat?: number;
  perissable?: boolean;
}): Promise<Produit | null> {
  const slug = slugDe(params.nom);
  const produit: Produit = {
    id: uuidV4(),
    slug,
    nom: params.nom,
    categorie: params.categorie as never,
    photoReelle: params.photo ?? "",
    photoFiligranee: null,
    quantite: Math.max(0, params.quantite),
    prix: Math.round(params.prix),
    prixAchat: params.prixAchat ?? null,
    unite: uniteResolve(params.unite),
    audioDescription: null,
    perissable: params.perissable ?? true,
    actif: true,
    composants: [],
    createdLe: new Date().toISOString(),
  };
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("produits")
      .insert({
        slug,
        nom: params.nom,
        categorie: params.categorie,
        unite: params.unite,
        prix: produit.prix,
        quantite: produit.quantite,
        photo_reelle: produit.photoReelle,
        prix_achat: params.prixAchat ?? null,
        perissable: produit.perissable,
        actif: true,
      })
      .select("*")
      .maybeSingle();
    if (!error && data) {
      const cree = produitFromMap(data as unknown as Record<string, unknown>);
      await cacheEcrire("produit", cree.id, cree);
      await cacheEcrire("vitrine", cree.id, cree);
      void notifierActiviteAdmin("act.produitCree", cree.nom);
      return cree;
    }
  }
  await cacheEcrire("produit", produit.id, produit);
  await cacheEcrire("vitrine", produit.id, produit);
  await fileAjouter("produit", produit.id, "insert:produit", params);
  void notifierActiviteAdmin("act.produitCree", produit.nom);
  return produit;
}

/** L'admin supprime définitivement un produit du stock. */
export async function supprimerProduit(produitId: string): Promise<void> {
  if (mboaReseau()) {
    const { error: err1 } = await mboaReseau()!.from("produits").delete().eq("id", produitId);
    const { error: err2 } = await mboaReseau()!.from("vitrine").delete().eq("id", produitId);
    if (!err1 && !err2) return;
  }
  await fileAjouter("produit", produitId, "delete:produit", {});
  // Marquer inactif dans le cache (impossible de supprimer la clé en IndexedDB sans scan)
  const produit = await cacheLire<Produit>("produit", produitId);
  if (produit) {
    await cacheEcrire("produit", produitId, { ...produit, actif: false, quantite: 0 });
    await cacheEcrire("vitrine", produitId, { ...produit, actif: false, quantite: 0 });
    void notifierActiviteAdmin("act.produitSupprime", produit.nom);
  }
}

/** L'admin active/désactive un produit sans le supprimer. */
export async function basculerProduitActif(produitId: string, actif: boolean): Promise<void> {
  if (mboaReseau()) {
    await mboaReseau()!.from("produits").update({ actif }).eq("id", produitId);
    await mboaReseau()!.from("vitrine").update({ actif }).eq("id", produitId);
  }
  const produit = await cacheLire<Produit>("produit", produitId);
  if (produit) {
    await cacheEcrire("produit", produitId, { ...produit, actif });
    await cacheEcrire("vitrine", produitId, { ...produit, actif });
  }
  await fileAjouter("produit", produitId, "update:actif", { actif });
  void notifierActiviteAdmin(actif ? "act.produitActive" : "act.produitDesactive", produit?.nom);
}

/** Enregistre le mode et la référence de paiement d'une commande (à la livraison). */
export async function enregistrerPaiementCommande(commandeId: string, mode: string, reference?: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("commandes")
      .update({ paiement: mode, paiement_ref: reference ?? null })
      .eq("id", commandeId);
    if (!error) return;
  }
  await fileAjouter("commande", commandeId, "update:paiement", { mode, reference });
  const cmd = await cacheLire<Commande>("commande", commandeId);
  if (cmd) {
    await cacheEcrire("commande", commandeId, { ...cmd, paiement: mode as never, paiementRef: reference ?? null });
  }
}

/** L'admin crée ou met à jour une fiche fournisseur. */
export async function sauverFournisseur(params: {
  id?: string;
  nom: string;
  telephone: string;
  village: string;
  productionCategorie?: string | null;
  productionLibre?: string;
  unite?: string;
  photo?: string | null;
}): Promise<Fournisseur | null> {
  const id = params.id ?? `tel_${params.telephone.replace(/\D/g, "")}`;
  const fournisseur: Fournisseur = {
    id,
    profilId: null,
    nom: params.nom,
    telephone: params.telephone,
    village: params.village,
    photo: params.photo ?? null,
    productionCategorie: (params.productionCategorie as never) ?? null,
    productionLibre: params.productionLibre ?? "",
    unite: params.unite ?? "kg",
    actif: true,
  };
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("fournisseurs")
      .upsert({
        id,
        nom: params.nom,
        telephone_237: params.telephone,
        village: params.village,
        photo: params.photo ?? null,
        production_categorie: params.productionCategorie ?? null,
        production_libre: params.productionLibre ?? "",
        unite: params.unite ?? "kg",
        actif: true,
      })
      .select("*")
      .maybeSingle();
    if (!error && data) {
      const f = fournisseurFromMap(data as unknown as Record<string, unknown>);
      await cacheEcrire("fournisseur", f.id, f);
      return f;
    }
  }
  await cacheEcrire("fournisseur", id, fournisseur);
  await fileAjouter("fournisseur", id, "upsert:fournisseur", params);
  return fournisseur;
}

/** L'admin crée ou met à jour une fiche livreur. */
export async function sauverLivreur(params: {
  id?: string;
  nom: string;
  telephone: string;
  zone: string;
  moto?: string | null;
  plaque?: string | null;
  tarifCourse: number;
  photo?: string | null;
}): Promise<Livreur | null> {
  const id = params.id ?? uuidV4();
  const livreur: Livreur = {
    id,
    nom: params.nom,
    telephone: params.telephone,
    zone: params.zone,
    profilId: null,
    photo: params.photo ?? null,
    moto: params.moto ?? null,
    plaque: params.plaque ?? null,
    tarifCourse: Math.round(params.tarifCourse),
    actif: true,
  };
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("livreurs")
      .upsert({
        id,
        nom: params.nom,
        telephone_237: params.telephone,
        zone: params.zone,
        moto: params.moto ?? null,
        plaque: params.plaque ?? null,
        tarif_course: livreur.tarifCourse,
        photo: params.photo ?? null,
        actif: true,
      })
      .select("*")
      .maybeSingle();
    if (!error && data) {
      const l = livreurFromMap(data as unknown as Record<string, unknown>);
      await cacheEcrire("livreur", l.id, l);
      return l;
    }
  }
  await cacheEcrire("livreur", id, livreur);
  await fileAjouter("livreur", id, "upsert:livreur", params);
  void notifierActiviteAdmin("act.livreurCree", livreur.nom);
  return livreur;
}

/** Le livreur arrive chez la cliente : statut en_livraison → livree. */
export async function marquerLivree(commandeId: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("commandes")
      .update({ statut_enum: "livree", livree_le: new Date().toISOString() })
      .eq("id", commandeId);
    if (!error) return;
  }
  await fileAjouter("commande", commandeId, "update:statut=livree", {});
}

/** Le livreur met à jour sa position GPS en temps réel. */
export async function majPositionLivreur(commandeId: string, latitude: number, longitude: number): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!.rpc("maj_position_livreur", {
      p_commande: commandeId,
      p_lat: latitude,
      p_lng: longitude,
    });
    if (!error) return;
  }
  // Pas de file pour les positions temps réel - données éphémères
}

/** Le livreur est payé après réception confirmée par la cliente. */
export async function payerLivreur(commandeId: string, montant: number): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!.rpc("payer_livreur", {
      p_commande: commandeId,
      p_montant: montant,
    });
    if (!error) return;
  }
  await fileAjouter("commande", commandeId, "rpc:payer_livreur", { montant });
  void notifierActiviteAdmin("act.livreurPaye", `${montant} F`);
}

/** L'admin compose un pack par plat (ingrédients + prix unique). */
export async function sauverPack(params: {
  nom: string;
  categorie?: string;
  photo: string;
  prix: number;
  quantite?: number;
  composants: { slug: string; nom: string; quantite: number; unite: string }[];
}): Promise<Produit | null> {
  const slug = slugDe(params.nom);
  // Chaque plat devient sa propre catégorie (ex. « Ndolé sauce ») pour que les
  // clientes le retrouvent dans la grille des catégories du marché.
  const categorie =
    (await creerCategoriePerso(params.nom, "🍲"))?.slug ?? params.categorie ?? slug;
  const produit: Produit = {
    id: uuidV4(),
    slug,
    nom: params.nom,
    categorie: categorie as never,
    photoReelle: params.photo,
    photoFiligranee: null,
    quantite: params.quantite ?? 1,
    prix: params.prix,
    prixAchat: null,
    unite: null,
    audioDescription: null,
    perissable: false,
    actif: true,
    composants: params.composants.map((c) => ({
      slug: c.slug,
      nom: c.nom,
      quantite: c.quantite,
      unite: c.unite as never,
    })),
    createdLe: new Date().toISOString(),
  };
  let resultat: Produit | null = null;
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.rpc("creer_pack", {
      p_nom: params.nom,
      p_categorie: categorie,
      p_photo: params.photo,
      p_prix: params.prix,
      p_composants: params.composants,
    });
    if (!error && data) {
      resultat = produitFromMap(data as unknown as Record<string, unknown>);
    } else {
      // RPC absente ou en échec : insertion directe dans `produits` pour que
      // le plat soit visible sur TOUS les appareils (sinon il reste local à
      // l'admin et le client ne le voit jamais).
      const packJson = JSON.parse(JSON.stringify(params.composants));
      const { data: ins, error: errIns } = await mboaReseau()!
        .from("produits")
        .insert({
          slug,
          nom: params.nom,
          categorie,
          unite: "part",
          prix: params.prix,
          quantite: produit.quantite,
          photo_reelle: params.photo,
          perissable: false,
          actif: true,
          pack_composants: packJson,
        })
        .select("*")
        .maybeSingle();
      if (!errIns && ins) {
        resultat = produitFromMap(ins as unknown as Record<string, unknown>);
      } else if (errIns) {
        console.warn("[pack] insert direct:", errIns.message);
      }
    }
  }
  const final = resultat ?? produit;
  await cacheEcrire("produit", final.id, final);
  await cacheEcrire("vitrine", final.id, final);
  await fileAjouter("produit", final.id, "rpc:creer_pack", params);
  void notifierActiviteAdmin("act.packCree", final.nom);
  return final;
}

/** L'admin modifie la composition d'un plat existant (ajout/retrait d'ingrédients). */
export async function majPackComposants(
  produitId: string,
  composants: { slug: string; nom: string; quantite: number; unite: string }[],
): Promise<Produit | null> {
  let produit = await cacheLire<Produit>("produit", produitId);
  if (!produit) produit = await cacheLire<Produit>("vitrine", produitId);
  if (!produit && mboaReseau()) {
    const { data } = await mboaReseau()!
      .from("produits")
      .select("*")
      .eq("id", produitId)
      .maybeSingle();
    if (data) produit = produitFromMap(data as unknown as Record<string, unknown>);
  }
  if (!produit) return null;

  produit.composants = composants.map((c) => ({
    slug: c.slug,
    nom: c.nom,
    quantite: c.quantite,
    unite: uniteResolve(c.unite),
  }));

  if (mboaReseau()) {
    const packJson = JSON.parse(JSON.stringify(produit.composants));
    const { error } = await mboaReseau()!
      .from("produits")
      .update({ pack_composants: packJson })
      .eq("id", produitId);
    if (!error) {
      // La vitrine n'a pas toujours la colonne pack_composants : on tente,
      // l'échec est sans gravité (le cache local fait foi hors ligne).
      await mboaReseau()!
        .from("vitrine")
        .update({ pack_composants: packJson })
        .eq("id", produitId);
    }
  }
  await cacheEcrire("produit", produit.id, produit);
  await cacheEcrire("vitrine", produit.id, produit);
  await fileAjouter("produit", produit.id, "maj:pack_composants", { composants });
  void notifierActiviteAdmin("act.packModifie", produit.nom);
  return produit;
}

export async function suiviCommande(commandeId: string): Promise<SuiviColis> {
  let suivi: SuiviColis;
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.rpc("suivi_commande", { p_commande: commandeId });
    if (!error && data) {
      const maps = (data as unknown as Record<string, unknown>[]);
      suivi = suiviFromMaps(commandeId, maps);
    } else {
      suivi = suiviVide(commandeId);
    }
  } else {
    suivi = suiviVide(commandeId);
  }
  // Hors ligne ou RPC indisponible : on reconstruit les jalons depuis le statut
  if (suivi.etapes.length === 0) {
    const cmd = await cacheLire<Commande>("commande", commandeId);
    if (cmd) suivi.etapes = etapesDepuisStatut(cmd.statut, cmd.createdLe);
  }
  // Position temps réel du livreur, partagée depuis son téléphone
  const posLivreur = await cacheLire<PositionGps>("gps_livreur", commandeId);
  if (posLivreur) suivi.positionActuelle = posLivreur;
  const posClient = await cacheLire<PositionGps>("gps_client", commandeId);
  if (posClient) suivi.positionDestination = posClient;
  suivi.positionDepart = DEPOT_MBOA;
  return suivi;
}

// ============================================================
// DepotAchats
// ============================================================

export async function fileAttenteAchats(): Promise<Achat[]> {
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("achats")
      .select("*")
      .eq("statut", "propose")
      .order("propose_le", { ascending: true });
    if (!error && data) {
      return data.map((d) => achatFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Achat>("achat");
}

/** Toutes les propositions d'achat, tous statuts confondus. */
export async function toutesAchats(): Promise<Achat[]> {
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("achats")
      .select("*")
      .order("propose_le", { ascending: false });
    if (!error && data) {
      return data.map((d) => achatFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Achat>("achat");
}

export async function mesAchats(fournisseurId: string): Promise<Achat[]> {
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("achats")
      .select("*")
      .eq("fournisseur_id", fournisseurId)
      .order("propose_le", { ascending: false });
    if (!error && data) {
      return data.map((d) => achatFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Achat>("achat");
}

export async function proposerAchat(params: {
  fournisseurId: string;
  nom: string;
  categorie: string;
  unite: string;
  quantite: number;
  prixDemande: number;
  photoUrl: string;
  emoji?: string | null;
  audioUrl?: string | null;
}): Promise<Achat | null> {
  const slug = slugDe(params.nom);
  const achat: Achat = {
    id: uuidV4(),
    fournisseurId: params.fournisseurId,
    slug,
    nom: params.nom,
    categorie: params.categorie as never,
    unite: params.unite,
    quantite: params.quantite,
    prixDemande: params.prixDemande,
    photoUrl: params.photoUrl,
    emoji: params.emoji ?? null,
    audioUrl: params.audioUrl ?? null,
    statut: "propose" as never,
    proposeLe: new Date().toISOString(),
  };
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.rpc("proposer_achat", {
      p_nom: params.nom,
      p_categorie: params.categorie,
      p_unite: params.unite,
      p_quantite: params.quantite,
      p_prix: params.prixDemande,
      p_photo: params.photoUrl,
      p_audio: params.audioUrl,
    });
    if (!error && data) {
      return achatFromMap(data as unknown as Record<string, unknown>);
    }
    // RPC absente : insertion directe pour que le comptoir voie la
    // proposition sur tous ses appareils.
    const { data: ins, error: errIns } = await mboaReseau()!
      .from("achats")
      .insert({
        id: achat.id,
        fournisseur_id: params.fournisseurId,
        slug,
        nom: params.nom,
        categorie: params.categorie,
        unite: params.unite,
        quantite: params.quantite,
        prix_demande: params.prixDemande,
        photo_url: params.photoUrl,
        emoji: params.emoji ?? null,
        audio_url: params.audioUrl ?? null,
        statut: "propose",
        propose_le: achat.proposeLe,
      })
      .select("*")
      .maybeSingle();
    if (!errIns && ins) {
      const a = achatFromMap(ins as unknown as Record<string, unknown>);
      await cacheEcrire("achat", a.id, a);
      return a;
    }
    if (errIns) console.warn("[achat] insert direct:", errIns.message);
  }
  await cacheEcrire("achat", achat.id, achat);
  await fileAjouter("achat", achat.id, "rpc:proposer_achat", params);
  return achat;
}

/** Le comptoir achète la marchandise proposée : statut propose → valide, entrée au stock. */
export async function validerAchat(achatId: string, prixMarchand?: number): Promise<void> {
  const achat = await cacheLire<Achat>("achat", achatId);
  if (mboaReseau()) {
    const maj: Record<string, unknown> = { statut: "valide", valide_le: new Date().toISOString() };
    if (prixMarchand != null) maj.prix_achat = prixMarchand;
    const { error } = await mboaReseau()!.from("achats").update(maj).eq("id", achatId);
    if (error) {
      await fileAjouter("achat", achatId, "update:statut=valide", { prixMarchand });
    }
  } else {
    await fileAjouter("achat", achatId, "update:statut=valide", { prixMarchand });
  }
  if (achat) {
    const achete: Achat = {
      ...achat,
      statut: "valide" as never,
      prixMarchand: prixMarchand ?? achat.prixMarchand,
      valideLe: new Date().toISOString(),
    };
    await cacheEcrire("achat", achatId, achete);
    // La marchandise achetée entre au stock du comptoir
    const produitExistant = await cacheLire<Produit>("produit", achat.slug);
    const produit: Produit = produitExistant ?? {
      id: achat.slug || uuidV4(),
      slug: achat.slug,
      nom: achat.nom,
      categorie: achat.categorie,
      photoReelle: achat.photoUrl,
      photoFiligranee: null,
      emoji: achat.emoji ?? null,
      quantite: 0,
      prix: prixMarchand ?? achat.prixDemande,
      prixAchat: prixMarchand ?? achat.prixDemande,
      unite: uniteResolve(achat.unite),
      audioDescription: achat.audioUrl ?? null,
      perissable: true,
      actif: true,
      composants: [],
      createdLe: new Date().toISOString(),
    };
    produit.quantite += achat.quantite;
    await cacheEcrire("produit", produit.id, produit);
    await cacheEcrire("vitrine", produit.id, produit);
    void notifierActiviteAdmin("act.achatValide", `${achat.nom} ×${achat.quantite}`);
  }
}

/** Le comptoir refuse la marchandise proposée : statut propose → annule. */
export async function refuserAchat(achatId: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("achats")
      .update({ statut: "annule" })
      .eq("id", achatId);
    if (error) {
      await fileAjouter("achat", achatId, "update:statut=annule", {});
    }
  } else {
    await fileAjouter("achat", achatId, "update:statut=annule", {});
  }
  const achat = await cacheLire<Achat>("achat", achatId);
  if (achat) {
    await cacheEcrire("achat", achatId, { ...achat, statut: "annule" as never });
    void notifierActiviteAdmin("act.achatRefuse", achat.nom);
  }
}

/** Le comptoir paie le fournisseur après réception de la marchandise. */
export async function payerAchat(achatId: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!
      .from("achats")
      .update({ statut: "paye", paye_le: new Date().toISOString() })
      .eq("id", achatId);
    if (error) {
      await fileAjouter("achat", achatId, "update:statut=paye", {});
    }
  } else {
    await fileAjouter("achat", achatId, "update:statut=paye", {});
  }
  const achat = await cacheLire<Achat>("achat", achatId);
  if (achat) {
    await cacheEcrire("achat", achatId, { ...achat, statut: "paye" as never, payeLe: new Date().toISOString() });
    void notifierActiviteAdmin("act.achatPaye", `${achat.nom} - ${achatMontant(achat)} F`);
  }
}

// ============================================================
// DepotAuth
// ============================================================

export async function demanderCode(telephone: string): Promise<{ code: string; mode: "voix" | "sms" }> {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  await etatEcrire("otp_en_cours", { telephone, code });

  if (mboaReseau() && supabaseConfigure) {
    const { error } = await mboaReseau()!.auth.signInWithOtp({
      phone: telephone,
    });
    if (!error) {
      return { code: "", mode: "sms" };
    }
  }
  // Mode voix locale : le code est lu par le TTS du navigateur
  return { code, mode: "voix" };
}

export async function validerCode(telephone: string, codeSaisi: string, role?: string): Promise<Profil | null> {
  // Mode SMS Supabase
  if (mboaReseau() && supabaseConfigure) {
    const { data, error } = await mboaReseau()!.auth.verifyOtp({
      phone: telephone,
      token: codeSaisi,
      type: "sms",
    });
    if (!error && data.user) {
      const profil = await profilParId(data.user.id);
      return profil;
    }
  }
  // Mode voix local - le profil vient du compte réel, jamais d'une démo.
  const stocke = await etatLire<{ telephone: string; code: string }>("otp_en_cours");
  if (stocke && stocke.code === codeSaisi) {
    const compte = await compteParIdentifiant(telephone);
    if (compte && compte.actif) {
      const profil: Profil = {
        id: compte.id,
        role: compte.role,
        nom: compte.nom,
        village: compte.village,
        telephone: compte.telephone ?? telephone,
        langue: "en" as never,
        actif: true,
      };
      await cacheEcrire("profil", profil.id, profil);
      await etatEcrire("session_id", profil.id);
      return profil;
    }
  }
  return null;
}

export async function profilParId(id: string): Promise<Profil | null> {
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) {
      return profilFromMap(data as unknown as Record<string, unknown>);
    }
  }
  return cacheLire<Profil>("profil", id);
}

export async function profilActuel(): Promise<Profil | null> {
  const id = await etatLire<string>("session_id");
  if (!id) return null;
  return profilParId(id);
}

/**
 * Écrit la session locale (IndexedDB) après une connexion par mot de passe :
 * profil en cache + `session_id`, comme le fait `validerCode` pour l'OTP.
 * Sans ça, `/` renverrait vers /connexion après un rafraîchissement.
 */
export async function ouvrirSessionLocale(profil: Profil): Promise<void> {
  await cacheEcrire("profil", profil.id, profil);
  await etatEcrire("session_id", profil.id);
}

export async function deconnexionAuth(): Promise<void> {
  if (mboaReseau()) {
    await mboaReseau()!.auth.signOut();
  }
  await etatEcrire("session_id", null);
}

// ============================================================
// DepotLivreurs
// ============================================================

export async function chargerLivreurs(): Promise<Livreur[]> {
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.from("vitrine_livreurs").select("*").order("nom");
    if (!error && data) {
      return data.map((d) => livreurFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Livreur>("livreur");
}

// ============================================================
// DepotFournisseurs
// ============================================================

export async function chargerFournisseurs(): Promise<Fournisseur[]> {
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.from("fournisseurs").select("*").order("nom");
    if (!error && data) {
      return data.map((d) => fournisseurFromMap(d as unknown as Record<string, unknown>));
    }
  }
  return cacheTout<Fournisseur>("fournisseur");
}

// ============================================================
// Compteur file d'envoi
// ============================================================

export async function compterFile(): Promise<number> {
  return fileCompte();
}

// ============================================================
// Activité admin - fil d'infos entre les comptes admin
// ============================================================

export interface ActiviteAdmin {
  id: string;
  quand: string;
  auteur: string;
  /** Clé i18n de l'action (ex. "act.achatValide"). */
  action: string;
  detail?: string;
}

const CLE_ACTIVITE_ADMIN = "admin_activite";

/**
 * Journalise une action admin et notifie les autres admins :
 * - fil d'activité lu sur la page d'accueil admin
 * - notification système du navigateur si la permission est accordée
 * L'auteur est déduit de la session courante. Ne bloque jamais l'action métier.
 */
export async function notifierActiviteAdmin(action: string, detail?: string): Promise<void> {
  try {
    const { useSession } = await import("../etat/store");
    const auteur = useSession.getState().profil?.nom ?? "Admin";
    const evt: ActiviteAdmin = {
      id: uuidV4(),
      quand: new Date().toISOString(),
      auteur,
      action,
      detail,
    };
    const liste = (await etatLire<ActiviteAdmin[]>(CLE_ACTIVITE_ADMIN)) ?? [];
    liste.unshift(evt);
    await etatEcrire(CLE_ACTIVITE_ADMIN, liste.slice(0, 50));
    // Synchro multi-appareils : tous les admins voient l'action, quel que soit leur PC/téléphone.
    const client = mboaReseau();
    if (client) {
      void client
        .from("admin_activite")
        .upsert({ id: evt.id, auteur: evt.auteur, action: evt.action, detail: evt.detail ?? null, quand: evt.quand })
        .then(({ error }) => {
          if (error) console.warn("[synchro] activité admin:", error.message);
        });
    }
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      typeof document !== "undefined" &&
      document.hidden
    ) {
      new Notification("MBOA Admin", { body: `${auteur} - ${detail ?? action}` });
    }
    const { jouerNotificationSonore } = await import("../utils/son");
    jouerNotificationSonore();
  } catch {
    // La notification ne doit jamais faire échouer l'action métier.
  }
}

/** Lit le fil d'activité admin (réservé aux admins) - fusionne local + Supabase. */
export async function activitesAdmin(): Promise<ActiviteAdmin[]> {
  const locales = (await etatLire<ActiviteAdmin[]>(CLE_ACTIVITE_ADMIN)) ?? [];
  const client = mboaReseau();
  if (!client) return locales;
  const { data } = await client
    .from("admin_activite")
    .select("id, auteur, action, detail, quand")
    .order("quand", { ascending: false })
    .limit(50);
  if (!data || data.length === 0) return locales;
  const distantes = data as ActiviteAdmin[];
  const ids = new Set(locales.map((a) => a.id));
  return [...locales, ...distantes.filter((d) => !ids.has(d.id))]
    .sort((a, b) => (a.quand < b.quand ? 1 : -1))
    .slice(0, 50);
}
