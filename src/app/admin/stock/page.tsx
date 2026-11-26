"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chargerStock, ajusterProduit, creerProduit, supprimerProduit, basculerProduitActif, modifierProduit } from "@/core/data/depots";
import { CarteMboa, EnTetePage, JaugeMboa, BoutonVoix, BadgeStatut, BoutonMboa, PictoCategorie, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { Produit, produitJauge, produitMargeUnitaire, produitMargePct, produitEstAPerte, produitDisponibilite, produitEstPack } from "@/core/types/produit";
import { CATEGORIES_ORDREES } from "@/core/types/categorie";
import { categoriesPerso, libelleCategorie, emojiCategorie, CategoriePerso } from "@/core/data/categories";
import { Unite, UNITE_INFO } from "@/core/types/unite";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { choisirPhotoDepuisAppareil } from "@/core/utils/photo";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

type Onglet = "stock" | "ajouter";

export default function StockAdminPage() {
  const router = useRouter();
  const { pret } = useGuardRole("admin");
  const t = useTr();
  const [stock, setStock] = useState<Produit[]>([]);
  const [prixEdit, setPrixEdit] = useState<Record<string, string>>({});
  const [onglet, setOnglet] = useState<Onglet>("stock");
  const [recherche, setRecherche] = useState("");
  const [filtreCat, setFiltreCat] = useState<string | null>(null);
  const [persos, setPersos] = useState<CategoriePerso[]>([]);
  const [confirmSuppr, setConfirmSuppr] = useState<string | null>(null);

  // Formulaire nouveau produit
  const [npNom, setNpNom] = useState("");
  const [npCategorie, setNpCategorie] = useState<string>("fruit");
  const [npUnite, setNpUnite] = useState<Unite>(Unite.kg);
  const [npPrix, setNpPrix] = useState("");
  const [npQuantite, setNpQuantite] = useState("1");
  const [npPrixAchat, setNpPrixAchat] = useState("");
  const [npPhoto, setNpPhoto] = useState("");
  const [npPerissable, setNpPerissable] = useState(true);
  const [npUnites, setNpUnites] = useState<{ unite: string; prix: string }[]>([]);
  const [npEnCours, setNpEnCours] = useState(false);
  const [npSucces, setNpSucces] = useState(false);
  const [npErreur, setNpErreur] = useState("");

  // Formulaire d'édition produit
  const [edition, setEdition] = useState<Produit | null>(null);
  const [edNom, setEdNom] = useState("");
  const [edCategorie, setEdCategorie] = useState<string>("fruit");
  const [edUnite, setEdUnite] = useState<Unite>(Unite.kg);
  const [edPrix, setEdPrix] = useState("");
  const [edPrixAchat, setEdPrixAchat] = useState("");
  const [edPhoto, setEdPhoto] = useState("");
  const [edPerissable, setEdPerissable] = useState(true);
  const [edUnites, setEdUnites] = useState<{ unite: string; prix: string }[]>([]);
  const [edEnCours, setEdEnCours] = useState(false);

  async function charger() {
    setStock(await chargerStock());
    categoriesPerso().then(setPersos).catch(() => {});
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);
  // Tirer vers le bas depuis le haut = recharger la page.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

  async function ajusterQuantite(p: Produit, delta: number) {
    await ajusterProduit(p.id, { quantite: p.quantite + delta });
    await charger();
  }

  async function sauverPrix(p: Produit) {
    const brut = prixEdit[p.id];
    if (brut == null) return;
    const prix = parseInt(brut);
    if (!isNaN(prix) && prix >= 0 && prix !== p.prix) {
      await ajusterProduit(p.id, { prix });
      await charger();
    }
    setPrixEdit({ ...prixEdit, [p.id]: "" });
  }

  async function togglerActif(p: Produit) {
    await basculerProduitActif(p.id, !p.actif);
    await charger();
  }

  function ouvrirEdition(p: Produit) {
    setEdition(p);
    setEdNom(p.nom);
    setEdCategorie(p.categorie);
    setEdUnite(p.unite ?? Unite.kg);
    setEdPrix(String(p.prix));
    setEdPrixAchat(p.prixAchat != null ? String(p.prixAchat) : "");
    setEdPhoto(p.photoReelle ?? "");
    setEdPerissable(p.perissable);
    setEdUnites((p.unites ?? []).map((u) => ({ unite: u.unite, prix: String(u.prix) })));
  }

  async function sauverEdition() {
    if (!edition || edEnCours) return;
    setEdEnCours(true);
    try {
      await modifierProduit(edition.id, {
        nom: edNom,
        categorie: edCategorie,
        unite: edUnite,
        prix: parseInt(edPrix) || edition.prix,
        prixAchat: edPrixAchat ? parseInt(edPrixAchat) : null,
        photo: edPhoto || "",
        perissable: edPerissable,
        unites: edUnites
          .map((u) => ({ unite: u.unite.trim(), prix: parseInt(u.prix) || 0 }))
          .filter((u) => u.unite && u.prix > 0),
      });
      setEdition(null);
      await charger();
    } finally {
      setEdEnCours(false);
    }
  }

  async function prendrePhotoEdition(mode?: "appareil" | "galerie") {
    const d = await choisirPhotoDepuisAppareil(mode);
    if (d) setEdPhoto(d);
  }

  async function confirmerSuppression(p: Produit) {
    await supprimerProduit(p.id);
    setConfirmSuppr(null);
    await charger();
  }

  async function creerNouveauProduit() {
    const prixNum = parseInt(npPrix) || 0;
    const qteNum = parseInt(npQuantite) || 0;
    if (!npNom.trim() || prixNum <= 0) return;
    const nomNorm = npNom.trim().toLowerCase();
    if (stock.some((p) => p.nom.toLowerCase() === nomNorm)) {
      setNpErreur(t("adm.stock.doublon"));
      return;
    }
    setNpErreur("");
    setNpEnCours(true);
    try {
      await creerProduit({
        nom: npNom.trim(),
        categorie: npCategorie,
        unite: npUnite,
        prix: prixNum,
        quantite: qteNum,
        photo: npPhoto,
        prixAchat: npPrixAchat ? parseInt(npPrixAchat) : undefined,
        perissable: npPerissable,
        unites: npUnites
          .map((u) => ({ unite: u.unite.trim(), prix: parseInt(u.prix) || 0 }))
          .filter((u) => u.unite && u.prix > 0),
      });
      setNpSucces(true);
      setNpNom(""); setNpPrix(""); setNpQuantite("1"); setNpPrixAchat(""); setNpPhoto(""); setNpPerissable(true); setNpUnites([]);
      setTimeout(() => setNpSucces(false), 2000);
      await charger();
    } finally {
      setNpEnCours(false);
    }
  }

  async function prendrePhotoProduit(mode?: "appareil" | "galerie") {
    const dataUrl = await choisirPhotoDepuisAppareil(mode);
    if (dataUrl) setNpPhoto(dataUrl);
  }

  const stockFiltre = stock.filter((p) => {
    if (filtreCat && p.categorie !== filtreCat) return false;
    if (recherche.trim() && !p.nom.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  });

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }
  return (
    <FondMboa>
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
      <EnTetePage titre={t("adm.stock")} sousTitre={t("adm.stk.sousTitre")} onRetour={() => router.back()} />

      {/* Onglets */}
      <div className="flex gap-1 p-2 bg-[var(--mboa-surface)]">
        <button
          onClick={() => setOnglet("stock")}
          className="flex-1 p-2 rounded-xl text-aide font-bold"
          style={{
            background: onglet === "stock" ? "var(--mboa-primary)" : "transparent",
            color: onglet === "stock" ? "white" : "var(--mboa-text)",
          }}
        >
          📦 {t("adm.stock")} ({stock.length})
        </button>
        <button
          onClick={() => setOnglet("ajouter")}
          className="flex-1 p-2 rounded-xl text-aide font-bold"
          style={{
            background: onglet === "ajouter" ? "var(--mboa-primary)" : "transparent",
            color: onglet === "ajouter" ? "white" : "var(--mboa-text)",
          }}
        >
          {t("adm.stk.ajouter")}
        </button>
      </div>

      {onglet === "stock" && (
        <div className="flex-1 p-4 space-y-2">
          {/* Recherche + filtre */}
          <CarteMboa>
            <input
              type="text"
              placeholder={t("adm.stk.recherche")}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full p-2 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
              style={{ fontSize: 16 }}
            />
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setFiltreCat(null)}
                className="px-3 py-1 rounded-full text-aide whitespace-nowrap"
                style={{
                  background: !filtreCat ? "var(--mboa-primary)" : "var(--mboa-background)",
                  color: !filtreCat ? "white" : "var(--mboa-text)",
                }}
              >
                {t("adm.stk.tout")}
              </button>
              {[...CATEGORIES_ORDREES, ...persos.map((x) => x.slug)].map((c) => (
                <button
                  key={c}
                  onClick={() => setFiltreCat(filtreCat === c ? null : c)}
                  className="px-3 py-1 rounded-full text-aide whitespace-nowrap flex items-center gap-1"
                  style={{
                    background: filtreCat === c ? "var(--mboa-primary)" : "var(--mboa-background)",
                    color: filtreCat === c ? "white" : "var(--mboa-text)",
                  }}
                >
                  {emojiCategorie(c, persos) ? (
                    <span>{emojiCategorie(c, persos)}</span>
                  ) : (
                    <PictoCategorie categorie={c} size={14} />
                  )}
                  {libelleCategorie(c, persos)}
                </button>
              ))}
            </div>
          </CarteMboa>

          {/* Formulaire d'édition produit */}
          {edition && (
            <CarteMboa className="mb-3 anim-apparition" style={{ border: "2px solid var(--mboa-primary)" }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-titre titre-section">✏️ {t("adm.stk.modifier")} - {edition.nom}</h3>
                <button onClick={() => setEdition(null)} className="text-aide font-bold">✕</button>
              </div>

              <label className="text-aide block mb-1">{t("adm.stk.nom")}</label>
              <input type="text" value={edNom} onChange={(e) => setEdNom(e.target.value)} className="champ-mboa w-full mb-2" style={{ fontSize: 18 }} />

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-aide block mb-1">{t("adm.stk.categorie")}</label>
                  <select value={edCategorie} onChange={(e) => setEdCategorie(e.target.value)} className="champ-mboa w-full" style={{ fontSize: 16 }}>
                    {[...CATEGORIES_ORDREES, ...persos.map((x) => x.slug)].map((c) => (
                      <option key={c} value={c}>{libelleCategorie(c, persos)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-aide block mb-1">{t("adm.stk.unite")}</label>
                  <select value={edUnite} onChange={(e) => setEdUnite(e.target.value as Unite)} className="champ-mboa w-full" style={{ fontSize: 16 }}>
                    {Object.values(Unite).map((u) => (
                      <option key={u} value={u}>{UNITE_INFO[u]?.un ?? u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-aide block mb-1">{t("adm.stk.prixVente2")}</label>
                  <input type="number" inputMode="numeric" value={edPrix} onChange={(e) => setEdPrix(e.target.value)} className="champ-mboa w-full" style={{ fontSize: 18 }} />
                </div>
                <div>
                  <label className="text-aide block mb-1">{t("adm.stk.prixAchat")}</label>
                  <input type="number" inputMode="numeric" value={edPrixAchat} onChange={(e) => setEdPrixAchat(e.target.value)} className="champ-mboa w-full" style={{ fontSize: 18 }} />
                </div>
              </div>

              {/* Unités de vente : quand ≥2 lignes valides, le client choisit
                  son unité (kg / pièce / sac…) et voit le prix directement. */}
              <label className="text-aide block mb-1 mt-2">{t("adm.stk.unites")}</label>
              {edUnites.map((u, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={u.unite}
                    onChange={(e) => setEdUnites(edUnites.map((x, j) => (j === i ? { ...x, unite: e.target.value } : x)))}
                    placeholder={t("adm.stk.uniteEx")}
                    className="champ-mboa flex-1"
                    style={{ fontSize: 16 }}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={u.prix}
                    onChange={(e) => setEdUnites(edUnites.map((x, j) => (j === i ? { ...x, prix: e.target.value } : x)))}
                    placeholder="F"
                    className="champ-mboa w-28"
                    style={{ fontSize: 16 }}
                  />
                  <button
                    type="button"
                    onClick={() => setEdUnites(edUnites.filter((_, j) => j !== i))}
                    className="text-aide font-bold px-2"
                    aria-label="✕"
                  >✕</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEdUnites([...edUnites, { unite: "", prix: "" }])}
                className="btn-mboa btn-surface w-full !min-h-[44px] mb-2"
              >{t("adm.stk.uniteAjout")}</button>

              <label className="text-aide block mb-1">{t("adm.stk.photo") ?? "Photo"}</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => prendrePhotoEdition("appareil")} className="btn-mboa btn-surface flex-1 !min-h-[44px]">📷 {t("adm.stk.appareil")}</button>
                <button type="button" onClick={() => prendrePhotoEdition("galerie")} className="btn-mboa btn-surface flex-1 !min-h-[44px]">🖼️ {t("adm.stk.galerie")}</button>
              </div>
              {edPhoto && <img src={edPhoto} alt="" className="w-full h-32 object-cover rounded-xl mb-2" />}

              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setEdPerissable(true)} className="flex-1 p-2 rounded-xl text-aide" style={{ background: edPerissable ? "var(--mboa-secondary-doux)" : "var(--mboa-background)", border: "2px solid " + (edPerissable ? "var(--mboa-primary)" : "transparent") }}>{t("adm.stk.oui")}</button>
                <button type="button" onClick={() => setEdPerissable(false)} className="flex-1 p-2 rounded-xl text-aide" style={{ background: !edPerissable ? "var(--mboa-secondary-doux)" : "var(--mboa-background)", border: "2px solid " + (!edPerissable ? "var(--mboa-primary)" : "transparent") }}>{t("adm.stk.non")}</button>
              </div>

              <div className="flex gap-2">
                <BoutonMboa variant="surface" className="flex-1" onClick={() => setEdition(null)}>{t("adm.stk.annuler")}</BoutonMboa>
                <BoutonMboa variant="primary" className="flex-1" onClick={sauverEdition} disabled={edEnCours || !edNom.trim()}>
                  {edEnCours ? "…" : t("adm.stk.modifier")}
                </BoutonMboa>
              </div>
            </CarteMboa>
          )}

          {stockFiltre.length === 0 && (
            <div className="etat-vide anim-apparition">
              <span className="emoji-vide">📦</span>
              <p className="text-corps text-[var(--mboa-text-doux)]">
                {stock.length === 0
                  ? t("adm.stk.vide1")
                  : t("adm.stk.vide2")}
              </p>
            </div>
          )}
          {stockFiltre.map((p) => {
            const margeU = produitMargeUnitaire(p);
            const margePct = produitMargePct(p);
            const aPerte = produitEstAPerte(p);
            return (
              <CarteMboa key={p.id}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <BoutonVoix texte={`${p.nom}, ${produitDisponibilite(p)}`} />
                    <span className="text-corps font-bold">{p.nom}</span>
                    {produitEstPack(p) && <BadgeStatut statut="valide" libelle={t("adm.stk.pack")} />}
                    {!p.actif && <BadgeStatut statut="annule" libelle={t("adm.stk.inactif")} />}
                  </div>
                  <div className="flex items-center gap-1">
                    {aPerte && <BadgeStatut statut="litige" libelle={t("adm.stk.aPerte")} />}
                    <button
                      onClick={() => ouvrirEdition(p)}
                      className="btn-mboa btn-surface !min-h-[36px] !min-w-[36px] !rounded-lg text-base"
                      aria-label={t("adm.stk.modifier")}
                      title={t("adm.stk.modifier")}
                    >
                      ✏️
                    </button>
                  </div>
                </div>
                {(p.unites?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.unites!.map((u) => (
                      <span
                        key={u.unite}
                        className="text-aide px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "var(--mboa-secondary-doux)", color: "var(--mboa-primary)", fontSize: 12 }}
                      >
                        {u.unite} · {u.prix} F
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div>
                    <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.stk.cout")}</p>
                    <p className="text-corps font-bold">{p.prixAchat != null ? formaterFcfa(p.prixAchat) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.stk.prixVente")}</p>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={String(p.prix)}
                        value={prixEdit[p.id] ?? ""}
                        onChange={(e) => setPrixEdit({ ...prixEdit, [p.id]: e.target.value })}
                        onBlur={() => sauverPrix(p)}
                        className="w-20 p-1 border-2 border-[var(--mboa-primary)] rounded-lg text-center"
                        style={{ fontSize: 16 }}
                      />
                      <span className="text-aide text-[var(--mboa-text-doux)]">F</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.stk.marge")}</p>
                    <p className="text-corps font-bold text-[var(--mboa-primary)]">
                      {margeU != null ? `${formaterFcfa(margeU)} (${margePct}%)` : "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-aide text-[var(--mboa-text-doux)]">{produitDisponibilite(p)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => ajusterQuantite(p, -1)}
                      className="btn-mboa btn-surface !min-h-[44px] !min-w-[44px] !rounded-xl text-xl"
                    >−</button>
                    <span className="text-chiffre min-w-[56px] text-center">{p.quantite}</span>
                    <button
                      onClick={() => ajusterQuantite(p, 1)}
                      className="btn-mboa btn-surface !min-h-[44px] !min-w-[44px] !rounded-xl text-xl"
                    >+</button>
                  </div>
                </div>
                <JaugeMboa valeur={produitJauge(p)} />
                {/* Actions produit */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => togglerActif(p)}
                    className="flex-1 p-2 rounded-xl text-aide"
                    style={{
                      background: p.actif ? "var(--mboa-error-doux)" : "var(--mboa-secondary-doux)",
                      color: p.actif ? "var(--mboa-error)" : "var(--mboa-primary)",
                    }}
                  >
                    {p.actif ? t("adm.stk.desactiver") : t("adm.stk.reactiver")}
                  </button>
                  {confirmSuppr === p.id ? (
                    <div className="flex gap-1 flex-1">
                      <button
                        onClick={() => confirmerSuppression(p)}
                        className="flex-1 p-2 rounded-xl text-aide font-bold bg-[var(--mboa-error)] text-white"
                      >
                        {t("adm.stk.confirmer")}
                      </button>
                      <button
                        onClick={() => setConfirmSuppr(null)}
                        className="flex-1 p-2 rounded-xl text-aide bg-[var(--mboa-background)]"
                      >
                        {t("adm.stk.annuler")}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmSuppr(p.id)}
                      className="flex-1 p-2 rounded-xl text-aide bg-[var(--mboa-error-doux)] text-[var(--mboa-error)]"
                    >
                      {t("adm.stk.supprimer")}
                    </button>
                  )}
                </div>
              </CarteMboa>
            );
          })}
        </div>
      )}

      {onglet === "ajouter" && (
        <div className="flex-1 p-4 space-y-3">
          {npSucces && (
            <div className="bg-[var(--mboa-secondary-doux)] rounded-xl p-3 text-center">
              <p className="text-corps text-[var(--mboa-primary)] font-bold">{t("adm.stk.succes")}</p>
            </div>
          )}
          {npErreur && (
            <div className="bg-[var(--mboa-error-doux)] rounded-xl p-3 text-center">
              <p className="text-corps text-[var(--mboa-error)] font-bold">{npErreur}</p>
            </div>
          )}
          <CarteMboa>
            <h2 className="text-titre titre-section mb-3">{t("adm.stk.nouveau")}</h2>

            <input
              type="text"
              placeholder={t("adm.stk.nom")}
              value={npNom}
              onChange={(e) => setNpNom(e.target.value)}
              className="champ-mboa w-full mb-2"
              style={{ fontSize: 20 }}
            />

            <label className="text-corps block mb-1">{t("adm.stk.categorie")}</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[...CATEGORIES_ORDREES, ...persos.map((x) => x.slug)].map((c) => (
                <button
                  key={c}
                  onClick={() => setNpCategorie(c)}
                  className="flex flex-col items-center p-2 rounded-xl"
                  style={{
                    minHeight: 56,
                    background: npCategorie === c ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                    border: `2px solid ${npCategorie === c ? "var(--mboa-primary)" : "transparent"}`,
                  }}
                >
                  {emojiCategorie(c, persos) ? (
                    <span style={{ fontSize: 20 }}>{emojiCategorie(c, persos)}</span>
                  ) : (
                    <PictoCategorie categorie={c} size={20} />
                  )}
                  <span className="text-aide mt-1 text-center" style={{ fontSize: 10 }}>{libelleCategorie(c, persos)}</span>
                </button>
              ))}
            </div>

            <label className="text-corps block mb-1">{t("adm.stk.unite")}</label>
            <select
              value={npUnite}
              onChange={(e) => setNpUnite(e.target.value as Unite)}
              className="champ-mboa w-full mb-2"
              style={{ fontSize: 18 }}
            >
              {Object.values(Unite).map((u) => (
                <option key={u} value={u}>{UNITE_INFO[u].pluriel}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-aide text-[var(--mboa-text-doux)] block mb-1">{t("adm.stk.prixVente2")}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="E.g.: 500"
                  value={npPrix}
                  onChange={(e) => setNpPrix(e.target.value)}
                  className="champ-mboa w-full text-chiffre"
                  style={{ fontSize: 24 }}
                />
              </div>
              <div>
                <label className="text-aide text-[var(--mboa-text-doux)] block mb-1">{t("adm.stk.prixAchat")}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="E.g.: 300"
                  value={npPrixAchat}
                  onChange={(e) => setNpPrixAchat(e.target.value)}
                  className="champ-mboa w-full text-chiffre"
                  style={{ fontSize: 24 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-aide text-[var(--mboa-text-doux)] block mb-1">{t("adm.stk.quantite")}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="E.g.: 50"
                  value={npQuantite}
                  onChange={(e) => setNpQuantite(e.target.value)}
                  className="champ-mboa w-full text-chiffre"
                  style={{ fontSize: 24 }}
                />
              </div>
              <div>
                <label className="text-aide text-[var(--mboa-text-doux)] block mb-1">{t("adm.stk.perissable")}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNpPerissable(true)}
                    className="flex-1 p-2 rounded-xl text-aide"
                    style={{
                      background: npPerissable ? "var(--mboa-primary)" : "var(--mboa-background)",
                      color: npPerissable ? "white" : "var(--mboa-text)",
                    }}
                  >
                    {t("adm.stk.oui")}
                  </button>
                  <button
                    onClick={() => setNpPerissable(false)}
                    className="flex-1 p-2 rounded-xl text-aide"
                    style={{
                      background: !npPerissable ? "var(--mboa-primary)" : "var(--mboa-background)",
                      color: !npPerissable ? "white" : "var(--mboa-text)",
                    }}
                  >
                    {t("adm.stk.non")}
                  </button>
                </div>
              </div>
            </div>

            {/* Unités de vente : ≥2 lignes valides → le client choisit
                son unité (kg / pièce / sac…) avec le prix affiché. */}
            <label className="text-aide text-[var(--mboa-text-doux)] block mb-1">{t("adm.stk.unites")}</label>
            {npUnites.map((u, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={u.unite}
                  onChange={(e) => setNpUnites(npUnites.map((x, j) => (j === i ? { ...x, unite: e.target.value } : x)))}
                  placeholder={t("adm.stk.uniteEx")}
                  className="champ-mboa flex-1"
                  style={{ fontSize: 16 }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={u.prix}
                  onChange={(e) => setNpUnites(npUnites.map((x, j) => (j === i ? { ...x, prix: e.target.value } : x)))}
                  placeholder="F"
                  className="champ-mboa w-28"
                  style={{ fontSize: 16 }}
                />
                <button
                  type="button"
                  onClick={() => setNpUnites(npUnites.filter((_, j) => j !== i))}
                  className="text-aide font-bold px-2"
                  aria-label="✕"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNpUnites([...npUnites, { unite: "", prix: "" }])}
              className="btn-mboa btn-surface w-full !min-h-[44px] mb-3"
            >{t("adm.stk.uniteAjout")}</button>

            {/* Photo */}
            <div className="w-full h-32 bg-[var(--mboa-background)] rounded-xl flex items-center justify-center border-2 border-dashed border-[var(--mboa-primary)] mb-2 overflow-hidden">
              {npPhoto ? (
                <img src={npPhoto} alt="Product" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="text-center">
                  <div className="text-4xl">📷</div>
                  <p className="text-aide text-[var(--mboa-text-doux)] mt-1">{t("adm.stk.photo")}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => prendrePhotoProduit("appareil")}
                className="btn-mboa btn-surface !min-h-[48px]"
              >
                📷 {t("adm.stk.appareil")}
              </button>
              <button
                type="button"
                onClick={() => prendrePhotoProduit("galerie")}
                className="btn-mboa btn-surface !min-h-[48px]"
              >
                🖼️ {t("adm.stk.galerie")}
              </button>
            </div>

            <BoutonMboa
              variant="primary"
              onClick={creerNouveauProduit}
              disabled={!npNom.trim() || !npPrix || npEnCours}
              className="w-full"
            >
              {npEnCours ? t("adm.stk.sauvegarde") : t("adm.stk.ajouterBtn")}
            </BoutonMboa>
          </CarteMboa>
        </div>
      )}
    </FondMboa>
  );
}
