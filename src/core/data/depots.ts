"use client";

import { mboaReseau } from "./mboa_reseau";
import { creerCategoriePerso, type CategoriePerso } from "./categories";
import { cacheTout, cacheEcrire, cacheLire, etatEcrire, etatLire, fileAjouter, fileCompte, fileTout, fileSupprimer } from "./base_locale";
import { CATALOGUE_HORS_LIGNE } from "./catalogue_hors_ligne";
import { supabaseConfigure } from "../config/app_env";
import { compteParIdentifiant } from "../auth/auth_service";
import { Produit, produitFromMap, produitUniteReelle } from "../types/produit";
import { uniteResolve } from "../types/unite";
import { EntreeCatalogue } from "../types/catalogue";
import { Categorie } from "../types/categorie";
import { Commande, commandeFromMap } from "../types/commande_full";
import { LigneCommande, ligneUniteReelle } from "../types/commande";
import { Achat, StatutAchat, achatFromMap, achatMontant } from "../types/achat";
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

export async function commander(lignes: { produitId: string; slug: string; nom: string; categorie: string; quantite: number; prix: number; unite: string; photo: string; composants?: { slug: string; nom?: string | null; quantite: number; unite: string }[] }[], consommateurId: string, contact?: { appelSouhaite?: boolean; numeroContact?: string | null; clientNom?: string | null; clientVillage?: string | null; clientTel?: string | null; livraisonQuartier?: string | null; livraisonDetail?: string | null; livraisonLat?: number | null; livraisonLng?: number | null; fraisLivraison?: number | null }): Promise<Commande | null> {
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
        livraison_quartier: contact?.livraisonQuartier ?? null,
        livraison_detail: contact?.livraisonDetail ?? null,
        livraison_lat: contact?.livraisonLat ?? null,
        livraison_lng: contact?.livraisonLng ?? null,
        client_nom: contact?.clientNom ?? null,
        client_village: contact?.clientVillage ?? null,
        client_tel: contact?.clientTel ?? null,
        frais_livraison: contact?.fraisLivraison ?? null,
      };
      if (patch.appel_souhaite || patch.numero_contact || patch.livraison_quartier || patch.livraison_detail || patch.livraison_lat != null || patch.client_nom || patch.frais_livraison != null) {
        void mboaReseau()!.from("commandes").update(patch).eq("id", commande.id);
        return {
          ...commande,
          appelSouhaite: patch.appel_souhaite,
          numeroContact: patch.numero_contact,
          livraisonQuartier: patch.livraison_quartier,
          livraisonDetail: patch.livraison_detail,
          livraisonLat: patch.livraison_lat,
          livraisonLng: patch.livraison_lng,
          clientNom: patch.client_nom,
          clientVillage: patch.client_village,
          clientTel: patch.client_tel,
          fraisLivraison: patch.frais_livraison,
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
        livraison_quartier: contact?.livraisonQuartier ?? null,
        livraison_detail: contact?.livraisonDetail ?? null,
        livraison_lat: contact?.livraisonLat ?? null,
        livraison_lng: contact?.livraisonLng ?? null,
        frais_livraison: contact?.fraisLivraison ?? null,
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
    livraisonQuartier: contact?.livraisonQuartier ?? null,
    livraisonDetail: contact?.livraisonDetail ?? null,
    livraisonLat: contact?.livraisonLat ?? null,
    livraisonLng: contact?.livraisonLng ?? null,
    clientNom: contact?.clientNom ?? null,
    clientVillage: contact?.clientVillage ?? null,
    clientTel: contact?.clientTel ?? null,
    fraisLivraison: contact?.fraisLivraison ?? null,
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

/** L'admin modifie les informations complètes d'un produit. */
export async function modifierProduit(produitId: string, maj: {
  nom?: string;
  categorie?: string;
  unite?: string;
  prix?: number;
  prixAchat?: number | null;
  photo?: string;
  perissable?: boolean;
  emoji?: string | null;
}): Promise<void> {
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

  const distant: Record<string, unknown> = {};
  if (maj.nom != null && maj.nom.trim()) {
    produit.nom = maj.nom.trim();
    distant.nom = produit.nom;
  }
  if (maj.categorie != null) {
    produit.categorie = maj.categorie as never;
    distant.categorie = maj.categorie;
  }
  if (maj.unite != null) {
    produit.unite = uniteResolve(maj.unite);
    distant.unite = maj.unite;
  }
  if (maj.prix != null) {
    produit.prix = Math.round(maj.prix);
    distant.prix = produit.prix;
  }
  if (maj.prixAchat !== undefined) {
    produit.prixAchat = maj.prixAchat;
    distant.prix_achat = maj.prixAchat;
  }
  if (maj.photo != null) {
    produit.photoReelle = maj.photo;
    distant.photo_reelle = maj.photo;
  }
  if (maj.perissable != null) {
    produit.perissable = maj.perissable;
    distant.perissable = maj.perissable;
  }
  if (maj.emoji !== undefined) {
    produit.emoji = maj.emoji;
    distant.emoji = maj.emoji;
  }
  if (mboaReseau() && Object.keys(distant).length > 0) {
    await mboaReseau()!.from("produits").update(distant).eq("id", produitId);
    await mboaReseau()!.from("vitrine").update(distant).eq("id", produitId);
  }
  await cacheEcrire("produit", produit.id, produit);
  await cacheEcrire("vitrine", produit.id, produit);
  void notifierActiviteAdmin("act.produitModifie", produit.nom);
}

/** Active ou désactive un livreur (compte conservé). */
export async function basculerLivreurActif(livreurId: string, actif: boolean): Promise<void> {
  const l = await cacheLire<Livreur>("livreur", livreurId);
  if (mboaReseau()) {
    await mboaReseau()!.from("livreurs").update({ actif }).eq("id", livreurId);
  }
  if (l) {
    await cacheEcrire("livreur", l.id, { ...l, actif });
  }
  await fileAjouter("livreur", livreurId, "update:actif", { actif });
  void notifierActiviteAdmin(actif ? "act.livreurActive" : "act.livreurDesactive", l?.nom);
}

/** Supprime définitivement un livreur (fiche + droits de connexion restent côté comptes). */
export async function supprimerLivreur(livreurId: string): Promise<void> {
  if (mboaReseau()) {
    const { error } = await mboaReseau()!.from("livreurs").delete().eq("id", livreurId);
    if (!error) {
      const l = await cacheLire<Livreur>("livreur", livreurId);
      void notifierActiviteAdmin("act.livreurSupprime", l?.nom);
      return;
    }
  }
  await fileAjouter("livreur", livreurId, "delete:livreur", {});
  void notifierActiviteAdmin("act.livreurSupprime", livreurId.slice(0, 8));
}

/** Supprime définitivement une fiche fournisseur. */
export async function supprimerFournisseur(fournisseurId: string): Promise<void> {
  const f = await cacheLire<Fournisseur>("fournisseur", fournisseurId);
  if (mboaReseau()) {
    const { error } = await mboaReseau()!.from("fournisseurs").delete().eq("id", fournisseurId);
    if (!error) {
      void notifierActiviteAdmin("act.fournisseurSupprime", f?.nom);
      return;
    }
  }
  await fileAjouter("fournisseur", fournisseurId, "delete:fournisseur", {});
  void notifierActiviteAdmin("act.fournisseurSupprime", f?.nom ?? fournisseurId.slice(0, 8));
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
  whatsapp?: string | null;
  village: string;
  productionCategorie?: string | null;
  productionLibre?: string;
  unite?: string;
  photo?: string | null;
  /** false = candidature en attente de validation par l'admin. */
  actif?: boolean;
}): Promise<Fournisseur | null> {
  const id = params.id ?? `tel_${params.telephone.replace(/\D/g, "")}`;
  const actif = params.actif ?? true;
  const whatsapp = params.whatsapp?.replace(/\D/g, "") || null;
  const fournisseur: Fournisseur = {
    id,
    profilId: null,
    nom: params.nom,
    telephone: params.telephone,
    whatsapp,
    village: params.village,
    photo: params.photo ?? null,
    productionCategorie: (params.productionCategorie as never) ?? null,
    productionLibre: params.productionLibre ?? "",
    unite: params.unite ?? "kg",
    actif,
  };
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("fournisseurs")
      .upsert({
        id,
        nom: params.nom,
        telephone_237: params.telephone,
        whatsapp,
        village: params.village,
        photo: params.photo ?? null,
        production_categorie: params.productionCategorie ?? null,
        production_libre: params.productionLibre ?? "",
        unite: params.unite ?? "kg",
        actif,
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
  await fileAjouter("fournisseur", id, "upsert:fournisseur", { ...params, whatsapp });
  return fournisseur;
}

/** L'admin valide ou suspend la candidature d'un fournisseur. */
export async function basculerFournisseurActif(fournisseurId: string, actif: boolean): Promise<void> {
  const f = await cacheLire<Fournisseur>("fournisseur", fournisseurId);
  if (mboaReseau()) {
    await mboaReseau()!.from("fournisseurs").update({ actif }).eq("id", fournisseurId);
  }
  if (f) {
    await cacheEcrire("fournisseur", f.id, { ...f, actif });
  }
  await fileAjouter("fournisseur", fournisseurId, "update:actif", { actif });
  void notifierActiviteAdmin(actif ? "act.fournisseurValide" : "act.fournisseurSuspendu", f?.nom);
}

/** L'admin refuse définitivement la candidature : fiche inactive + horodatée. */
export async function refuserFournisseur(fournisseurId: string): Promise<void> {
  const f = await cacheLire<Fournisseur>("fournisseur", fournisseurId);
  const refuseLe = new Date().toISOString();
  if (mboaReseau()) {
    await mboaReseau()!
      .from("fournisseurs")
      .update({ actif: false, refuse_le: refuseLe })
      .eq("id", fournisseurId);
  }
  if (f) {
    await cacheEcrire("fournisseur", f.id, { ...f, actif: false, refuseLe });
  }
  await fileAjouter("fournisseur", fournisseurId, "update:refus", { refuseLe });
  void notifierActiviteAdmin("act.fournisseurRefuse", f?.nom);
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
  // Positions publiées depuis un autre appareil (table `positions`).
  const client = mboaReseau();
  if (client) {
    try {
      const { data } = await client
        .from("positions")
        .select("type, latitude, longitude, horodatage, maj_le")
        .eq("commande_id", commandeId);
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const pos: PositionGps = {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          horodatage: String(row.horodatage ?? row.maj_le ?? ""),
        };
        if (row.type === "livreur" && (!suivi.positionActuelle || pos.horodatage > suivi.positionActuelle.horodatage)) {
          suivi.positionActuelle = pos;
        }
        if (row.type === "client" && (!suivi.positionDestination || pos.horodatage > suivi.positionDestination.horodatage)) {
          suivi.positionDestination = pos;
        }
      }
    } catch {
      /* positions indisponibles : on garde le local */
    }
  }
  suivi.positionDepart = DEPOT_MBOA;
  // Destination de secours : la position GPS fournie à la commande,
  // si le client n'a pas (encore) partagé sa position en direct.
  if (!suivi.positionDestination) {
    const cmd = await cacheLire<Commande>("commande", commandeId);
    if (!cmd && client) {
      const { data } = await client
        .from("commandes")
        .select("livraison_lat, livraison_lng")
        .eq("id", commandeId)
        .maybeSingle();
      if (data && data.livraison_lat != null && data.livraison_lng != null) {
        suivi.positionDestination = {
          latitude: Number(data.livraison_lat),
          longitude: Number(data.livraison_lng),
          horodatage: "",
        };
      }
    }
    if (!suivi.positionDestination && cmd?.livraisonLat != null && cmd?.livraisonLng != null) {
      suivi.positionDestination = {
        latitude: cmd.livraisonLat,
        longitude: cmd.livraisonLng,
        horodatage: "",
      };
    }
  }
  return suivi;
}

// ============================================================
// DepotAchats
// ============================================================

export async function fileAttenteAchats(): Promise<Achat[]> {
  const locales = (await cacheTout<Achat>("achat")).filter((a) => a.statut === StatutAchat.propose);
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("achats")
      .select("*")
      .eq("statut", "propose")
      .order("propose_le", { ascending: true });
    if (!error && data) {
      const distants = data.map((d) => achatFromMap(d as unknown as Record<string, unknown>));
      const ids = new Set(distants.map((a) => a.id));
      for (const a of distants) await cacheEcrire("achat", a.id, a);
      return [...distants, ...locales.filter((a) => !ids.has(a.id))];
    }
  }
  return locales;
}

/** Toutes les propositions d'achat, tous statuts confondus. */
export async function toutesAchats(): Promise<Achat[]> {
  const locales = await cacheTout<Achat>("achat");
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("achats")
      .select("*")
      .order("propose_le", { ascending: false });
    if (!error && data) {
      const distants = data.map((d) => achatFromMap(d as unknown as Record<string, unknown>));
      const ids = new Set(distants.map((a) => a.id));
      for (const a of distants) await cacheEcrire("achat", a.id, a);
      return [...distants, ...locales.filter((a) => !ids.has(a.id))];
    }
  }
  return locales;
}

export async function mesAchats(fournisseurId: string, telephone?: string): Promise<Achat[]> {
  // Le fournisseur est identifié tantôt par l'id du compte, tantôt par
  // `tel_<chiffres>` (convention des fiches et de /rejoindre). On retient
  // tout achat dont l'id correspond ou dont le téléphone colle (9 derniers
  // chiffres, comme GardeFournisseur).
  const tel9 = (telephone ?? "").replace(/\D/g, "").slice(-9);
  const chiffres = (s: string) => s.replace(/^tel_/, "").replace(/\D/g, "");
  const estLeMien = (a: Achat) =>
    a.fournisseurId === fournisseurId ||
    (tel9.length === 9 && chiffres(a.fournisseurId).slice(-9) === tel9);
  const locales = (await cacheTout<Achat>("achat")).filter(estLeMien);
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!
      .from("achats")
      .select("*")
      .or(`fournisseur_id.eq.${fournisseurId},fournisseur_id.like.tel_*`)
      .order("propose_le", { ascending: false });
    if (!error && data) {
      const distants = data
        .map((d) => achatFromMap(d as unknown as Record<string, unknown>))
        .filter(estLeMien);
      const ids = new Set(distants.map((a) => a.id));
      for (const a of distants) await cacheEcrire("achat", a.id, a);
      return [...distants, ...locales.filter((a) => !ids.has(a.id))];
    }
  }
  return locales;
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
      await sauverProfil(profil);
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
  await sauverProfil(profil);
  await etatEcrire("session_id", profil.id);
}

/** Crée ou met à jour le profil dans Supabase et le cache local. */
export async function sauverProfil(profil: Profil): Promise<void> {
  await cacheEcrire("profil", profil.id, profil);
  const client = mboaReseau();
  if (!client) return;
  const { error } = await client.from("profiles").upsert({
    id: profil.id,
    role: profil.role,
    nom: profil.nom,
    village: profil.village,
    telephone_237: profil.telephone,
    langue: profil.langue,
    photo_visage: profil.photoVisage ?? null,
    latitude: profil.latitude ?? null,
    longitude: profil.longitude ?? null,
    actif: profil.actif,
  });
  if (error) console.warn("[synchro] profil:", error.message);
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
  const locales = await cacheTout<Livreur>("livreur");
  if (mboaReseau()) {
    // La table `livreurs` porte les chauffeurs ; `vitrine_livreurs` est une
    // vue de *commandes* enrichies (identité client) et ne doit pas être lue ici.
    const { data, error } = await mboaReseau()!.from("livreurs").select("*").order("nom");
    if (!error && data) {
      const distants = data.map((d) => livreurFromMap(d as unknown as Record<string, unknown>));
      const ids = new Set(distants.map((l) => l.id));
      for (const l of distants) await cacheEcrire("livreur", l.id, l);
      return [...distants, ...locales.filter((l) => !ids.has(l.id))];
    }
  }
  return locales;
}

// ============================================================
// DepotFournisseurs
// ============================================================

export async function chargerFournisseurs(): Promise<Fournisseur[]> {
  const locales = await cacheTout<Fournisseur>("fournisseur");
  if (mboaReseau()) {
    const { data, error } = await mboaReseau()!.from("fournisseurs").select("*").order("nom");
    if (!error && data) {
      const distants = data.map((d) => fournisseurFromMap(d as unknown as Record<string, unknown>));
      const ids = new Set(distants.map((f) => f.id));
      for (const f of distants) await cacheEcrire("fournisseur", f.id, f);
      return [...distants, ...locales.filter((f) => !ids.has(f.id))];
    }
  }
  return locales;
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

/** Publie une position GPS (livreur ou client) pour le suivi cross-device. */
export function partagerPositionGps(type: "livreur" | "client", commandeId: string, pos: PositionGps): void {
  const client = mboaReseau();
  if (!client) return;
  void client
    .from("positions")
    .upsert({
      cle: `${type}:${commandeId}`,
      type,
      commande_id: commandeId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      horodatage: pos.horodatage,
      maj_le: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) console.warn("[synchro] position:", error.message);
    });
}

// ============================================================
// Rejeu de la file hors-ligne vers Supabase
// ============================================================

/**
 * Pousse vers Supabase l'état complet des entités ayant des opérations
 * en file (last-write-wins). Idempotent : upsert sur la clé primaire.
 * Retourne le nombre d'opérations retirées de la file.
 */
export async function synchroniserFileAttente(): Promise<number> {
  const client = mboaReseau();
  if (!client) return 0;
  const ops = await fileTout();
  if (ops.length === 0) return 0;
  let faites = 0;
  for (const op of ops) {
    try {
      const ok = await rejouerOperation(client, op.entite, op.id, op.operation);
      if (ok && op.cle != null) {
        await fileSupprimer(op.cle);
        faites++;
      }
    } catch {
      // On réessaiera à la prochaine synchro.
    }
  }
  return faites;
}

async function rejouerOperation(client: NonNullable<ReturnType<typeof mboaReseau>>, entite: string, id: string, operation?: string): Promise<boolean> {
  switch (entite) {
    case "produit": {
      const p = await cacheLire<Produit>("produit", id);
      if (!p) return true;
      const { error } = await client.from("produits").upsert({
        id: p.id, slug: p.slug, nom: p.nom, categorie: p.categorie,
        photo_reelle: p.photoReelle, photo_filigranee: p.photoFiligranee,
        emoji: p.emoji, quantite: p.quantite, prix: p.prix, unite: p.unite,
        prix_achat: p.prixAchat, audio_description_url: p.audioDescription,
        perissable: p.perissable, actif: p.actif,
        pack_composants: p.composants.length ? JSON.parse(JSON.stringify(p.composants)) : null,
        created_at: p.createdLe,
      });
      return !error;
    }
    case "commande": {
      const c = await cacheLire<Commande>("commande", id);
      if (!c) return true;
      const produitsJson = c.lignes.map((l) => ({
        produit_id: l.produitId, slug: l.slug ?? "", nom: l.nom, categorie: l.categorie,
        quantite: l.quantite, prix: l.prix, cout_achat: l.coutAchat, photo: l.photo,
        unite: l.unite ?? null,
        ...(l.composants?.length ? { composants: l.composants } : {}),
      }));
      const { error } = await client.from("commandes").upsert({
        id: c.id, consommateur_id: c.consommateurId, produits: produitsJson,
        statut_enum: c.statut, montant_total: c.montantTotal, cout_achat: c.coutAchat,
        montant_livre: c.montantLivre ?? null, paiement: c.paiement ?? null,
        paiement_ref: c.paiementRef ?? null, livraison_moto: c.livraisonMoto,
        stock_sorti: c.stockSorti, photo_livraison_url: c.photoLivraison ?? null,
        signature_url: c.signature ?? null, appel_vocal_fait: c.appelVocalFait,
        created_at: c.createdLe, livree_le: c.livreeLe ?? null, recue_le: c.recueLe ?? null,
        satisfaction: c.satisfaction ?? null, satisfaction_motif: c.satisfactionMotif ?? null,
        satisfaction_audio: c.satisfactionAudio ?? null, clos: c.clos,
        clos_par: c.closPar ?? null, annule_le: c.annuleLe ?? null,
        motif_annulation: c.motifAnnulation ?? null, livreur_id: c.livreurId ?? null,
        livreur: c.livreurNom ? { nom: c.livreurNom, photo: c.livreurPhoto, moto: c.livreurMoto, plaque: c.livreurPlaque, tarif_course: c.livreurTarif } : null,
        nom_livreur: c.livreurNom ?? null, photo_livreur: c.livreurPhoto ?? null,
        moto: c.livreurMoto ?? null, plaque: c.livreurPlaque ?? null,
        telephone_livreur: c.livreurTelephone ?? null, tarif_livreur: c.livreurTarif ?? null,
        tarif_course: c.livreurTarif ?? null, paye_le: null,
        appel_souhaite: c.appelSouhaite, numero_contact: c.numeroContact ?? null,
        livraison_quartier: c.livraisonQuartier ?? null, livraison_detail: c.livraisonDetail ?? null,
        livraison_lat: c.livraisonLat ?? null, livraison_lng: c.livraisonLng ?? null,
        client_nom: c.clientNom ?? null, client_village: c.clientVillage ?? null, client_tel: c.clientTel ?? null,
        frais_livraison: c.fraisLivraison ?? null,
      });
      return !error;
    }
    case "achat": {
      const a = await cacheLire<Achat>("achat", id);
      if (!a) return true;
      const { error } = await client.from("achats").upsert({
        id: a.id, fournisseur_id: a.fournisseurId, slug: a.slug, nom: a.nom,
        categorie: a.categorie, unite: a.unite, quantite: a.quantite,
        prix_demande: a.prixDemande, prix_achat: a.prixMarchand ?? null,
        photo_url: a.photoUrl, emoji: a.emoji, audio_url: a.audioUrl,
        produit_id: a.produitId ?? null, statut: a.statut, motif: a.motif ?? null,
        motif_audio_url: a.motifAudioUrl ?? null, propose_le: a.proposeLe,
        valide_le: a.valideLe ?? null, paye_le: a.payeLe ?? null,
      });
      return !error;
    }
    case "fournisseur": {
      const f = await cacheLire<Fournisseur>("fournisseur", id);
      if (!f) return true;
      const { error } = await client.from("fournisseurs").upsert({
        id: f.id, profil_id: f.profilId, nom: f.nom, telephone_237: f.telephone,
        whatsapp: f.whatsapp ?? null, refuse_le: f.refuseLe ?? null,
        village: f.village, photo: f.photo, production_categorie: f.productionCategorie,
        production_libre: f.productionLibre, unite: f.unite, actif: f.actif,
      });
      return !error;
    }
    case "livreur": {
      const l = await cacheLire<Livreur>("livreur", id);
      if (!l) return true;
      const { error } = await client.from("livreurs").upsert({
        id: l.id, nom: l.nom, telephone_237: l.telephone, zone: l.zone,
        profil_id: l.profilId, photo: l.photo, moto: l.moto, plaque: l.plaque,
        tarif_course: l.tarifCourse, actif: l.actif,
      });
      return !error;
    }
    case "profil": {
      const p = await cacheLire<Profil>("profil", id);
      if (!p) return true;
      const { error } = await client.from("profiles").upsert({
        id: p.id, role: p.role, nom: p.nom, village: p.village,
        telephone_237: p.telephone, langue: p.langue,
        photo_visage: p.photoVisage ?? null,
        latitude: p.latitude ?? null, longitude: p.longitude ?? null,
        actif: p.actif,
      });
      return !error;
    }
    case "annonce": {
      if (operation === "delete:annonce") {
        const { error } = await client.from("annonces").delete().eq("id", id);
        return !error;
      }
      const a = await cacheLire<import("../types/annonce").Annonce>("annonce", id);
      if (!a) return true;
      const { error } = await client.from("annonces").upsert({
        id: a.id, type: a.type, titre: a.titre, texte: a.texte ?? "",
        actif: a.actif, created_le: a.createdLe,
      });
      return !error;
    }
    case "categorie": {
      const cat = await cacheLire<CategoriePerso>("categorie", id);
      if (!cat) return true;
      const { error } = await client.from("categories_perso").upsert({
        id: cat.id, slug: cat.slug, nom: cat.nom, emoji: cat.emoji, created_le: cat.createdLe,
      });
      return !error;
    }
    default:
      return true; // entité non synchronisable : on vide la file
  }
}

// ============================================================
// Annonces du comptoir (promo / info / produit phare)
// ============================================================

export async function toutesAnnonces(): Promise<import("../types/annonce").Annonce[]> {
  const { annonceFromMap } = await import("../types/annonce");
  const locales = await cacheTout<import("../types/annonce").Annonce>("annonce");
  const client = mboaReseau();
  if (client) {
    const { data, error } = await client
      .from("annonces")
      .select("*")
      .order("created_le", { ascending: false });
    if (!error && data) {
      const distantes = data.map((d) => annonceFromMap(d as unknown as Record<string, unknown>));
      const ids = new Set(distantes.map((a) => a.id));
      for (const a of distantes) await cacheEcrire("annonce", a.id, a);
      return [...distantes, ...locales.filter((a) => !ids.has(a.id))];
    }
  }
  return locales;
}

export async function sauverAnnonce(params: {
  id?: string;
  type: "promo" | "info" | "phare";
  titre: string;
  texte?: string;
  produitSlug?: string | null;
  expireLe?: string | null;
}): Promise<void> {
  const id = params.id ?? uuidV4();
  const annonce = {
    id,
    type: params.type,
    titre: params.titre.trim(),
    texte: params.texte?.trim() ?? "",
    produitSlug: params.produitSlug ?? null,
    expireLe: params.expireLe ?? null,
    actif: true,
    createdLe: new Date().toISOString(),
  };
  await cacheEcrire("annonce", id, annonce);
  const client = mboaReseau();
  if (client) {
    const { error } = await client.from("annonces").upsert({
      id,
      type: annonce.type,
      titre: annonce.titre,
      texte: annonce.texte,
      produit_slug: params.produitSlug ?? null,
      expire_le: params.expireLe ?? null,
      actif: true,
    });
    if (!error) {
      void notifierActiviteAdmin("act.annonceCreee", annonce.titre);
      return;
    }
  }
  await fileAjouter("annonce", id, "upsert:annonce", annonce);
  void notifierActiviteAdmin("act.annonceCreee", annonce.titre);
}

export async function basculerAnnonceActive(annonceId: string, actif: boolean): Promise<void> {
  const client = mboaReseau();
  if (client) {
    await client.from("annonces").update({ actif }).eq("id", annonceId);
  }
  const a = await cacheLire<import("../types/annonce").Annonce>("annonce", annonceId);
  if (a) await cacheEcrire("annonce", a.id, { ...a, actif });
  await fileAjouter("annonce", annonceId, "update:actif", { actif });
}

export async function supprimerAnnonce(annonceId: string): Promise<void> {
  const client = mboaReseau();
  if (client) {
    await client.from("annonces").delete().eq("id", annonceId);
  }
  const { cacheSupprimer } = await import("./base_locale");
  await cacheSupprimer("annonce", annonceId);
  await fileAjouter("annonce", annonceId, "delete:annonce", {});
}
