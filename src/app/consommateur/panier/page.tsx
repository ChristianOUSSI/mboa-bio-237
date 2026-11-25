"use client";

import { useRouter } from "next/navigation";
import { usePanier, toast, clePanier } from "@/core/etat/store";
import { CarteMboa, BoutonMboa, EnTetePage, BoutonVoix, FondMboa, ChargementMboa } from "@/core/design_system/composants";
import { formaterFcfa, formaterFcfaCourt } from "@/core/utils/format_monnaie";
import { commander, chargerVitrine, toutesAnnonces, fraisLivraisonPourQuartier } from "@/core/data/depots";
import { Annonce } from "@/core/types/annonce";
import { codePromoPct, annoncePromoPct } from "@/core/utils/promos";
import { Produit, produitEstRupture, produitPrixLabel, produitUniteReelle, produitUnites } from "@/core/types/produit";
import { resumerQuantites } from "@/core/types/commande";
import { ModePaiement, MODE_PAIEMENT_INFO } from "@/core/types/statuts";
import {
  copierDocument,
  exporterPdf,
  partagerWhatsApp,
  imprimerDocument,
} from "@/core/utils/export_document";
import { useEffect, useState } from "react";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { vibrer } from "@/core/utils/son";
import { useTr } from "@/core/i18n";
import { lireParametre } from "@/core/data/parametres";

const FRAIS_LIVRAISON_DEFAUT = 500;
const CLE_FRAIS = "frais_livraison";

export default function PanierPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("consommateur");
  const t = useTr();

  const panier = usePanier();
  const [enCours, setEnCours] = useState(false);
  const [recap, setRecap] = useState<{
    lignes: typeof panier.lignes;
    quartier: string;
    total: number;
    remise: number;
    codePct: number | null;
  } | null>(null);
  const [modePaiement, setModePaiement] = useState<ModePaiement>(ModePaiement.especes);
  const [menuExport, setMenuExport] = useState(false);
  const [appelSouhaite, setAppelSouhaite] = useState(false);
  const [numeroContact, setNumeroContact] = useState("");
  const [livraisonQuartier, setLivraisonQuartier] = useState("");
  const [livraisonDetail, setLivraisonDetail] = useState("");
  const [erreurAdresse, setErreurAdresse] = useState(false);
  const [copieOk, setCopieOk] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsEtat, setGpsEtat] = useState<"repos" | "charge" | "ok" | "erreur">("repos");
  const [fraisLivraisonCfg, setFraisLivraisonCfg] = useState(FRAIS_LIVRAISON_DEFAUT);
  const [calculEnCours, setCalculEnCours] = useState(false);
  const [suggestions, setSuggestions] = useState<Produit[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [codePct, setCodePct] = useState<number | null>(null);
  const [codeErreur, setCodeErreur] = useState(false);
  // Assistant en 3 étapes : 1 panier, 2 livraison, 3 paiement + validation.
  const [etape, setEtape] = useState<1 | 2 | 3>(1);

  // Calcul dynamique des frais de livraison selon le quartier.
  // setState différé : la règle react-hooks interdit le setState
  // synchrone dans le corps d'un effet.
  useEffect(() => {
    if (etape === 2 && livraisonQuartier.trim()) {
      const frame = requestAnimationFrame(() => setCalculEnCours(true));
      fraisLivraisonPourQuartier(livraisonQuartier.trim()).then((p) => {
        setFraisLivraisonCfg(p);
        setCalculEnCours(false);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [etape, livraisonQuartier]);

  useEffect(() => {
    void lireParametre<number>(CLE_FRAIS, FRAIS_LIVRAISON_DEFAUT).then((f) => {
      if (typeof f === "number" && f >= 0) setFraisLivraisonCfg(f);
    });
    // Catalogue + annonces : suggestions, prix à jour, code promo.
    void Promise.all([chargerVitrine(), toutesAnnonces()]).then(([v, a]) => {
      const anns = a.filter((x) => x.actif);
      setAnnonces(anns);
      const ids = new Set(panier.lignes.map((l) => l.produitId));
      setSuggestions(v.filter((p) => p.actif && p.quantite > 0 && !ids.has(p.id)).slice(0, 8));
      // Le prix figé dans le panier datait de l'ajout : on le recalcule
      // avec le catalogue et les promos ACTUELS pour que l'affichage,
      // le total et la commande soient identiques.
      const lignes = panier.lignes.map((l) => {
        const p = v.find((x) => x.id === l.produitId);
        if (!p) return l;
        const u = produitUnites(p).find((x) => x.unite === l.unite);
        if (!u) return l;
        const pct = annoncePromoPct(anns, p);
        const prix = pct ? Math.round(u.prix * (1 - pct / 100)) : u.prix;
        return prix === l.prix ? l : { ...l, prix };
      });
      if (lignes.some((l, i) => l !== panier.lignes[i])) {
        usePanier.getState().actualiserPrix(lignes);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function poserSuggestion(produit: Produit) {
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: 1,
      prix: produit.prix,
      coutAchat: produit.prixAchat ?? 0,
      photo: produit.photoReelle,
      unite: produitUniteReelle(produit),
      composants: produit.composants,
    });
    vibrer();
    toast(`${produit.nom} ${t("toast.ajoute")}`);
  }

  const montantProduits = panier.montantTotal();
  const fraisLivraison = montantProduits > 0 ? fraisLivraisonCfg : 0;
  // Code promo : % global sur le total produits.
  const remiseCode = codePct ? Math.round(montantProduits * codePct / 100) : 0;
  const montantTotal = montantProduits - remiseCode + fraisLivraison;

  function appliquerCode() {
    const pct = codePromoPct(annonces, codeSaisi);
    if (pct) {
      setCodePct(pct);
      setCodeErreur(false);
    } else {
      setCodePct(null);
      setCodeErreur(codeSaisi.trim().length > 0);
    }
  }

  function capturerPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsEtat("erreur");
      return;
    }
    setGpsEtat("charge");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsEtat("ok");
      },
      () => setGpsEtat("erreur"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function passerEtapeSuivante() {
    if (etape === 2 && !livraisonQuartier.trim()) {
      setErreurAdresse(true);
      return;
    }
    setErreurAdresse(false);
    setEtape((e) => (e < 3 ? ((e + 1) as 1 | 2 | 3) : e));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  async function validerCommande() {
    if (!profil || panier.lignes.length === 0) return;
    if (!livraisonQuartier.trim()) {
      setErreurAdresse(true);
      return;
    }
    setErreurAdresse(false);
    setEnCours(true);
    try {
      // Prix recalculés au moment de la commande : le prix figé dans le
      // panier datait de l'ajout — une promo expirée ou un prix ajusté
      // depuis ne doit plus être honoré.
      const vitrineFraiche = await chargerVitrine();
      const lignes = panier.lignes.map((l) => {
        const p = vitrineFraiche.find((x) => x.id === l.produitId);
        let prix = l.prix;
        if (p) {
          const unites = produitUnites(p);
          // Unité disparue de la config ? On garde le prix de ligne
          // plutôt que de facturer l'unité de base à la place.
          const u = unites.find((x) => x.unite === l.unite);
          if (u) {
            const pct = annoncePromoPct(annonces, p);
            prix = pct ? Math.round(u.prix * (1 - pct / 100)) : u.prix;
          }
        }
        return {
          produitId: l.produitId,
          slug: l.slug ?? "",
          nom: l.nom,
          categorie: l.categorie,
          quantite: l.quantite,
          prix,
          unite: String(l.unite ?? "kg"),
          photo: l.photo,
          composants: l.composants,
        };
      });
      await commander(lignes, profil.id, {
        appelSouhaite,
        numeroContact: appelSouhaite ? numeroContact.trim() || profil.telephone || null : null,
        clientNom: profil.nom,
        clientVillage: profil.village,
        clientTel: profil.telephone || null,
        livraisonQuartier: livraisonQuartier.trim(),
        livraisonDetail: livraisonDetail.trim() || null,
        livraisonLat: gps?.lat ?? null,
        livraisonLng: gps?.lng ?? null,
        fraisLivraison: fraisLivraisonCfg > 0 ? fraisLivraisonCfg : null,
        modePaiement,
      });
      // Instantané AVANT de vider le panier : sert à l'écran récap.
      setRecap({
        lignes: panier.lignes.map((l) => ({ ...l })),
        quartier: livraisonQuartier.trim(),
        total: montantTotal,
        remise: remiseCode,
        codePct,
      });
      panier.vider();
      vibrer([30, 60, 30]);
    } catch (e) {
      console.error("Order error:", e);
    } finally {
      setEnCours(false);
    }
  }

  const optionsExport = () => ({
    type: "devis" as const,
    titre: t("panier.titreDoc"),
    lignes: panier.lignes,
    telephone: profil?.telephone ?? null,
    destinataire: profil?.nom ?? null,
    code: null,
    fraisLivraison,
  });

  async function copier() {
    const ok = await copierDocument(optionsExport());
    setCopieOk(ok);
    setTimeout(() => setCopieOk(false), 2200);
  }

  /** Partage le récap de la commande envoyée (instantané, panier déjà vidé). */
  function partagerRecap() {
    if (!recap) return;
    // Prix unitaire déjà remisé par le code promo, comme à la commande.
    const lignes = recap.codePct
      ? recap.lignes.map((l) => ({ ...l, prix: Math.round(l.prix * (1 - recap.codePct! / 100)) }))
      : recap.lignes;
    partagerWhatsApp({
      type: "devis",
      titre: t("panier.titreDoc"),
      lignes,
      telephone: profil?.telephone ?? null,
      destinataire: profil?.nom ?? null,
      code: null,
      fraisLivraison,
    });
  }

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <ChargementMboa />
        </div>
      </FondMboa>
    );
  }

  function recommander() {
    for (const l of recap?.lignes ?? []) panier.poser(l);
    router.push("/consommateur/panier");
  }

  // Écran de confirmation : récap complet de la commande envoyée.
  if (recap) {
    return (
      <FondMboa>
        <EnTetePage titre={t("panier.envoye")} onRetour={() => router.push("/consommateur")} />
        <div className="flex-1 p-4">
          <div className="etat-vide anim-apparition">
            <div className="relative inline-block mb-2">
              <span className="emoji-vide" style={{ fontSize: 72 }}>✅</span>
              {/* Petite liesse : emojis qui s'élèvent autour du succès */}
              {["🎉", "🌿", "🥬", "🍅", "✨", "🥭"].map((e, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="confetti-mboa"
                  style={{
                    left: `${8 + i * 15}%`,
                    animationDelay: `${i * 0.18}s`,
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
            <p className="text-corps font-bold">{t("panier.envoyeTexte")}</p>
            <p className="text-aide mt-1">🚴 {t("panier.delai")}</p>
          </div>

          <CarteMboa className="mt-4">
            <p className="text-corps font-bold mb-2">{t("panier.adresse")}</p>
            <p className="text-aide">📍 {recap.quartier}</p>
          </CarteMboa>

          <CarteMboa className="mt-3">
            <div className="space-y-1">
              {recap.lignes.map((l, i) => (
                <div key={i} className="flex justify-between items-center text-aide">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--mboa-secondary-doux)] flex items-center justify-center shrink-0 text-base">
                      {l.photo ? <img src={l.photo} alt="" className="w-full h-full object-cover" /> : "🥬"}
                    </span>
                    <span className="truncate">{l.quantite} × {l.nom}</span>
                  </span>
                  <span className="text-[var(--mboa-text-doux)] shrink-0">{formaterFcfa(Math.round(l.quantite * l.prix))}</span>
                </div>
              ))}
              {recap.remise > 0 && (
                <div className="flex justify-between text-aide font-bold" style={{ color: "var(--mboa-primary)" }}>
                  <span>🎟️ {t("panier.remise")} (-{recap.codePct} %)</span>
                  <span>-{formaterFcfa(recap.remise)}</span>
                </div>
              )}
              <div className="border-t border-[var(--mboa-trait)] pt-2 mt-2 flex justify-between items-center">
                <span className="text-corps font-bold">{t("panier.total")}</span>
                <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(recap.total)}</span>
              </div>
            </div>
          </CarteMboa>

          <div className="mt-4 space-y-2">
            <BoutonMboa onClick={() => router.push("/consommateur/suivi")} className="w-full">
              {t("panier.voirSuivi")}
            </BoutonMboa>
            <BoutonMboa variant="surface" onClick={recommander} className="w-full">
              🛒 {t("panier.recommander")}
            </BoutonMboa>
            <BoutonMboa variant="surface" onClick={partagerRecap} className="w-full">
              {t("panier.partager")}
            </BoutonMboa>
            <BoutonMboa variant="surface" onClick={() => router.push("/consommateur")} className="w-full">
              {t("panier.retourMarche")}
            </BoutonMboa>
          </div>
        </div>
      </FondMboa>
    );
  }

  return (
    <FondMboa>
      <EnTetePage titre={t("panier.titre")} sousTitre={t("panier.sousTitre")} onRetour={() => router.back()} />

      <div className="flex-1 p-4">
        {panier.lignes.length === 0 ? (
          <div className="etat-vide anim-apparition">
            <span className="emoji-vide">🛒</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("panier.vide")}</p>
            <BoutonMboa variant="primary" onClick={() => router.push("/consommateur")} className="mt-4">{t("panier.allerMarche")}</BoutonMboa>
          </div>
        ) : (
          <>
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2 mb-4">
              {([1, 2, 3] as const).map((n) => (
                <div key={n} className="flex items-center gap-2 flex-1">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-aide font-bold shrink-0"
                    style={{
                      background: etape >= n ? "var(--mboa-primary)" : "var(--mboa-trait)",
                      color: etape >= n ? "#fff" : "var(--mboa-text-doux)",
                    }}
                  >
                    {n}
                  </span>
                  <span
                    className="text-aide font-bold hidden sm:inline"
                    style={{ color: etape === n ? "var(--mboa-primary)" : "var(--mboa-text-doux)" }}
                  >
                    {n === 1 ? t("panier.etapePanier") : n === 2 ? t("panier.etapeLivraison") : t("panier.etapePaiement")}
                  </span>
                  {n < 3 && <span className="flex-1 h-px" style={{ background: "var(--mboa-trait)" }} />}
                </div>
              ))}
            </div>

            {etape === 1 && (<>
            {/* Suggestions : produits du marché absents du panier */}
            {suggestions.length > 0 && (
              <div className="mb-4 anim-apparition">
                <p className="text-corps font-bold mb-2">💡 {t("panier.aussi")}</p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                  {suggestions.map((p) => (
                    <CarteMboa key={p.id} className="!p-3 shrink-0 flex flex-col items-center text-center" style={{ width: 140 }}>
                      <span style={{ fontSize: 40 }} aria-hidden>{p.emoji ?? "🥬"}</span>
                      <p className="text-aide font-bold mt-1 truncate w-full">{p.nom}</p>
                      <p className="puce-prix mt-1">{produitPrixLabel(p)}</p>
                      {!produitEstRupture(p) && (
                        <button
                          onClick={() => poserSuggestion(p)}
                          className="btn-mboa btn-primary w-full !min-h-[40px] !rounded-xl mt-2 text-aide font-bold"
                        >
                          + {t("march.ajouter")}
                        </button>
                      )}
                    </CarteMboa>
                  ))}
                </div>
              </div>
            )}

            {/* Quantities summary */}
            <CarteMboa className="mb-3 card-accent anim-apparition">
              <div className="flex justify-between items-center">
                <span className="text-corps">{t("liste.quantites")}</span>
                <span className="text-corps font-bold">{resumerQuantites(panier.lignes)}</span>
              </div>
            </CarteMboa>

            {/* Cart lines */}
            <div className="space-y-2">
              {panier.lignes.map((l, i) => (
                <CarteMboa key={clePanier(l.produitId, l.unite)} className="anim-apparition" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Miniature produit */}
                      <span className="w-10 h-10 rounded-xl bg-[var(--mboa-secondary-doux)] flex items-center justify-center overflow-hidden flex-shrink-0 text-xl">
                        {l.photo ? (
                          <img src={l.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          "🥬"
                        )}
                      </span>
                      <BoutonVoix texte={`${l.quantite} ${t("liste.de")} ${l.nom}, ${l.prix} francs`} />
                      <span className="text-corps font-bold">{l.nom}</span>
                      {l.unite && (
                        <span className="text-aide px-2 py-0.5 rounded-full font-bold" style={{ background: "var(--mboa-secondary-doux)", color: "var(--mboa-primary)", fontSize: 12 }}>
                          {l.unite}
                        </span>
                      )}
                    </div>
                    <span className="text-chiffre text-[var(--mboa-primary)]">
                      {formaterFcfaCourt(Math.round(l.quantite * l.prix))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-aide text-[var(--mboa-text-doux)]">
                      {formaterFcfa(l.prix)} / {l.unite || t("panier.parUnite")}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => panier.ajuster(clePanier(l.produitId, l.unite), l.quantite - 1)}
                        className="btn-mboa btn-surface !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                        aria-label={`Remove one ${l.nom}`}
                      >
                        −
                      </button>
                      <span className="text-chiffre min-w-[48px] text-center">{l.quantite}</span>
                      <button
                        onClick={() => panier.ajuster(clePanier(l.produitId, l.unite), l.quantite + 1)}
                        className="btn-mboa btn-secondary !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                        aria-label={`Add one ${l.nom}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </CarteMboa>
              ))}
            </div>

            {/* Vider le panier - étape 1 seulement */}
            <button
              onClick={() => panier.vider()}
              className="text-aide text-[var(--mboa-error)] mt-3 underline text-center w-full no-print"
            >
              {t("panier.vider")}
            </button>
            </>)}

            {/* Étape 2 : adresse de livraison - obligatoire : sans quartier,
                le livreur ne sait pas où se rendre. */}
            {etape === 2 && (
            <CarteMboa className="mt-4 anim-apparition">
              <p className="text-corps font-bold mb-2">📍 {t("panier.adresse")}</p>
              <label className="text-aide block mb-1 font-bold">{t("panier.quartier")}</label>
              <input
                type="text"
                placeholder={t("panier.quartierPh")}
                value={livraisonQuartier}
                onChange={(e) => { setLivraisonQuartier(e.target.value); setErreurAdresse(false); }}
                className="champ-mboa mb-2"
                style={{ fontSize: 18 }}
              />
              {livraisonQuartier.trim() && (
                <p className="text-aide text-[var(--mboa-primary)] font-bold mb-2">
                  🚴 {t("panier.livraison")} : {formaterFcfa(fraisLivraisonCfg)}
                  {calculEnCours && " …"}
                </p>
              )}
              <label className="text-aide block mb-1 font-bold">{t("panier.repere")}</label>
              <input
                type="text"
                placeholder={t("panier.reperePh")}
                value={livraisonDetail}
                onChange={(e) => setLivraisonDetail(e.target.value)}
                className="champ-mboa"
                style={{ fontSize: 18 }}
              />
              <button
                type="button"
                onClick={capturerPosition}
                disabled={gpsEtat === "charge"}
                className="btn-mboa btn-surface w-full !min-h-[48px] mb-2"
              >
                {gpsEtat === "charge"
                  ? "⏳ …"
                  : gpsEtat === "ok"
                    ? `📍 ${t("panier.gpsOk")}`
                    : gpsEtat === "erreur"
                      ? `❌ ${t("panier.gpsErreur")}`
                      : `📍 ${t("panier.gps")}`}
              </button>
              {erreurAdresse && (
                <p className="text-[var(--mboa-error)] text-aide mt-2 font-bold anim-secousse">
                  {t("panier.quartierRequis")}
                </p>
              )}
            </CarteMboa>
            )}

            {/* Étape 3 : paiement + code promo + validation */}
            {etape === 3 && (<>
            {/* Payment method choice */}
            <CarteMboa className="mt-4 anim-apparition">
              <p className="text-corps font-bold mb-2">{t("panier.paiement")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.values(ModePaiement) as string[]).map((m) => {
                  const info = MODE_PAIEMENT_INFO[m as ModePaiement];
                  const selected = modePaiement === m;
                  const marque = m === ModePaiement.momo ? "🟡" : m === ModePaiement.orangeMoney ? "🟠" : "💵";
                  return (
                    <button
                      key={m}
                      onClick={() => setModePaiement(m as ModePaiement)}
                      className="p-3 rounded-xl flex flex-col items-center gap-1 transition-transform active:scale-95"
                      style={{
                        background: selected ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                        border: `2px solid ${selected ? "var(--mboa-primary)" : "transparent"}`,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>{marque}</span>
                      <span className="text-aide text-center" style={{ fontSize: 15, fontWeight: 700 }}>
                        {info.libelle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CarteMboa>

            {/* Code promo */}
            <CarteMboa className="mt-4 anim-apparition">
              <p className="text-corps font-bold mb-2">🎟️ {t("panier.codePromo")}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t("panier.codePh")}
                  value={codeSaisi}
                  onChange={(e) => { setCodeSaisi(e.target.value.toUpperCase()); setCodePct(null); setCodeErreur(false); }}
                  className="champ-mboa flex-1"
                />
                <BoutonMboa variant="surface" onClick={appliquerCode} className="!min-h-[48px]">
                  {t("panier.appliquer")}
                </BoutonMboa>
              </div>
              {codePct ? (
                <p className="text-aide mt-2 font-bold" style={{ color: "var(--mboa-primary)" }}>
                  ✅ -{codePct} % {t("panier.applique")}
                </p>
              ) : codeErreur ? (
                <p className="text-aide mt-2 font-bold" style={{ color: "var(--mboa-error)" }}>
                  ❌ {t("panier.codeInvalide")}
                </p>
              ) : null}
              <p className="text-aide mt-1 text-[var(--mboa-text-doux)]">{t("panier.codeNote")}</p>
            </CarteMboa>

            {/* Cost summary - bloqué en bas : total et validation toujours visibles */}
            <CarteMboa className="mt-3 anim-apparition sticky bottom-4 z-30 !shadow-[0_16px_40px_-10px_rgba(30,81,40,0.4)]" style={{ border: "2px solid var(--mboa-primary)" }}>
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-corps">
                  <span>{t("panier.produits")}</span>
                  <span>{formaterFcfa(montantProduits)}</span>
                </div>
                {remiseCode > 0 && (
                  <div className="flex justify-between text-corps font-bold" style={{ color: "var(--mboa-primary)" }}>
                    <span>🎟️ {t("panier.remise")} (-{codePct} %)</span>
                    <span>-{formaterFcfa(remiseCode)}</span>
                  </div>
                )}
                <div className="flex justify-between text-corps">
                  <span>{t("panier.livraison")}</span>
                  <span>{formaterFcfa(fraisLivraison)}</span>
                </div>
                <p className="text-aide text-[var(--mboa-text-doux)] -mt-1">🚴 {t("panier.delai")}</p>
                <div className="border-t border-[var(--mboa-trait)] pt-1 flex justify-between items-center">
                  <span className="text-titre">{t("panier.total")}</span>
                  <span className="text-chiffre-geant text-[var(--mboa-primary)]">
                    {formaterFcfa(montantTotal)}
                  </span>
                </div>
              </div>
              <p className="text-aide text-[var(--mboa-text-doux)] mb-3">
                {t("panier.payerSurPlace")} ({MODE_PAIEMENT_INFO[modePaiement].libelle.toLowerCase()})
              </p>

              {/* Appel du livreur à l'arrivée */}
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appelSouhaite}
                  onChange={(e) => setAppelSouhaite(e.target.checked)}
                  className="w-5 h-5 accent-[var(--mboa-primary)]"
                />
                <span className="text-corps font-bold">📞 {t("panier.appelLivreur")}</span>
              </label>
              {appelSouhaite && (
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder={t("panier.numeroContactPh")}
                  value={numeroContact}
                  onChange={(e) => setNumeroContact(e.target.value)}
                  className="champ-mboa mb-3"
                  style={{ fontSize: 18 }}
                />
              )}

              <BoutonMboa onClick={validerCommande} disabled={enCours} className="w-full !text-titre">
                {enCours ? t("rej.envoi") : t("liste.commander")}
              </BoutonMboa>
              <button
                onClick={() => setEtape(2)}
                className="text-aide text-[var(--mboa-text-doux)] mt-3 underline text-center w-full"
              >
                {t("panier.retourEtape")}
              </button>
            </CarteMboa>
            </>)}

            {/* Navigation entre étapes : total visible + Continuer / Retour */}
            {etape < 3 && (
              <CarteMboa className="mt-3 anim-apparition sticky bottom-4 z-30 !shadow-[0_16px_40px_-10px_rgba(30,81,40,0.4)]" style={{ border: "2px solid var(--mboa-primary)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-aide text-[var(--mboa-text-doux)]">{t("panier.total")}</p>
                    <p className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(montantTotal)}</p>
                  </div>
                  <div className="flex gap-2">
                    {etape === 2 && (
                      <BoutonMboa variant="surface" onClick={() => { setErreurAdresse(false); setEtape(1); }} className="!min-h-[52px]">
                        {t("panier.retourEtape")}
                      </BoutonMboa>
                    )}
                    <BoutonMboa onClick={passerEtapeSuivante} className="!text-titre !min-h-[52px]">
                      {t("panier.continuer")} →
                    </BoutonMboa>
                  </div>
                </div>
              </CarteMboa>
            )}

            {/* Quote export - étape 3 */}
            {etape === 3 && (
            <CarteMboa className="mt-3 no-print">
              <button
                onClick={() => setMenuExport(!menuExport)}
                className="w-full flex items-center justify-between"
                aria-expanded={menuExport}
              >
                <span className="text-corps font-bold">📤 {t("panier.export")}</span>
                <span className="text-[var(--mboa-primary)] text-2xl">{menuExport ? "▲" : "▼"}</span>
              </button>
              {menuExport && (
                <div className="grid grid-cols-2 gap-2 mt-3 anim-apparition">
                  <BoutonMboa variant="surface" onClick={() => exporterPdf(optionsExport())} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">📕</span>
                    <span className="text-aide">PDF</span>
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={imprimerDocument} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">🖨️</span>
                    <span className="text-aide">{t("liste.imprimer")}</span>
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={() => partagerWhatsApp(optionsExport())} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">💬</span>
                    <span className="text-aide">WhatsApp</span>
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={copier} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">📋</span>
                    <span className="text-aide">{t("liste.copier")}</span>
                  </BoutonMboa>
                </div>
              )}
              {copieOk && (
                <p className="text-aide text-[var(--mboa-primary)] mt-2 text-center anim-apparition">
                  {t("panier.copieOk")}
                </p>
              )}
            </CarteMboa>
            )}
          </>
        )}
      </div>
    </FondMboa>
  );
}
