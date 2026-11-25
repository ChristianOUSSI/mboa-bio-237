"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chargerCatalogue, chargerStock, sauverPack, majPackComposants, chargerVitrine } from "@/core/data/depots";
import { CarteMboa, BoutonMboa, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { EntreeCatalogue, catalogueUniteReelle } from "@/core/types/catalogue";
import { Produit, produitEstPack, produitEstBundle, produitEstTheme } from "@/core/types/produit";
import { Unite, UNITE_INFO, unitePour } from "@/core/types/unite";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { choisirPhotoDepuisAppareil } from "@/core/utils/photo";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

interface ComposantDraft {
  slug: string;
  nom: string;
  quantite: number;
  unite: Unite;
}

/** Éditeur d'ingrédients réutilisé à la création et à la modification d'un plat. */
function EditeurComposants({
  catalogue,
  composants,
  onChange,
}: {
  catalogue: EntreeCatalogue[];
  composants: ComposantDraft[];
  onChange: (suite: ComposantDraft[]) => void;
}) {
  const t = useTr();

  function maj(i: number, patch: Partial<ComposantDraft>) {
    onChange(composants.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function choisir(i: number, slug: string) {
    const entree = catalogue.find((e) => e.slug === slug);
    if (!entree) return;
    maj(i, { slug: entree.slug, nom: entree.nom, unite: catalogueUniteReelle(entree) });
  }

  function ajouter() {
    const premier = catalogue[0];
    if (!premier) return;
    onChange([
      ...composants,
      { slug: premier.slug, nom: premier.nom, quantite: 1, unite: catalogueUniteReelle(premier) },
    ]);
  }

  return (
    <div>
      <p className="text-corps font-bold mb-2">{t("adm.pack.ingredients")}</p>
      {composants.map((c, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          <select
            value={c.slug}
            onChange={(e) => choisir(i, e.target.value)}
            className="flex-1 p-2 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 16 }}
          >
            {catalogue.map((e) => (
              <option key={e.slug} value={e.slug}>{e.nom}</option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={c.quantite}
            onChange={(e) => maj(i, { quantite: parseInt(e.target.value) || 1 })}
            className="w-16 p-2 border-2 border-[var(--mboa-primary)] rounded-xl text-center"
            style={{ fontSize: 18 }}
          />
          <select
            value={c.unite}
            onChange={(e) => maj(i, { unite: e.target.value as Unite })}
            className="w-28 p-2 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 16 }}
          >
            {Object.values(Unite).map((u) => (
              <option key={u} value={u}>{UNITE_INFO[u].un}</option>
            ))}
          </select>
          <button
            onClick={() => onChange(composants.filter((_, idx) => idx !== i))}
            className="text-[var(--mboa-error)] text-2xl px-1"
            aria-label={t("adm.pack.retirer")}
          >
            ×
          </button>
        </div>
      ))}
      <BoutonMboa variant="surface" onClick={ajouter} className="w-full mb-3">
        {t("adm.pack.ajouter")}
      </BoutonMboa>
    </div>
  );
}

export default function PacksAdminPage() {
  const router = useRouter();
  const { pret } = useGuardRole("admin");
  const t = useTr();
  const [catalogue, setCatalogue] = useState<EntreeCatalogue[]>([]);
  const [stock, setStock] = useState<Produit[]>([]);
  const [packs, setPacks] = useState<Produit[]>([]);
  const [nom, setNom] = useState("");
  const [photo, setPhoto] = useState("");
  const [prix, setPrix] = useState("");
  const [quantiteStock, setQuantiteStock] = useState("10");
  const [typePack, setTypePack] = useState<"plat" | "bundle" | "theme">("plat");
  const [composants, setComposants] = useState<ComposantDraft[]>([]);
  const [bundleProduits, setBundleProduits] = useState<{ slug: string; quantite: number }[]>([]);
  const [theme, setTheme] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionComposants, setEditionComposants] = useState<ComposantDraft[]>([]);
  const [editionEnCours, setEditionEnCours] = useState(false);

  async function charger() {
    const [c, s, v] = await Promise.all([chargerCatalogue(), chargerStock(), chargerVitrine()]);
    setCatalogue(c);
    setStock(s);
    // Les packs sont dans le stock ET la vitrine (les bundles/themes peuvent être vitrine sans stock).
    const tous = [...s, ...v.filter((v) => !s.some((p) => p.id === v.id))];
    setPacks(tous.filter(produitEstPack));
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);
  // Tirer vers le bas depuis le haut = recharger la page.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

  async function sauver() {
    const prixNum = parseInt(prix) || 0;
    if (!nom.trim() || prixNum <= 0) return;
    if (typePack === "plat" && composants.length === 0) return;
    if (typePack === "bundle" && bundleProduits.length === 0) return;
    if (typePack === "theme" && !theme.trim()) return;
    setEnCours(true);
    try {
      const p = await sauverPack({
        nom: nom.trim(),
        photo,
        prix: prixNum,
        quantite: Math.max(1, parseInt(quantiteStock) || 1),
        composants: typePack === "plat" ? composants.map((c) => ({
          slug: c.slug,
          nom: c.nom,
          quantite: c.quantite,
          unite: c.unite,
        })) : [],
        typePack,
        bundleProduits: typePack === "bundle" ? bundleProduits : undefined,
        theme: typePack === "theme" ? theme.trim() : undefined,
      });
      if (p) setPacks([...packs, p]);
      setNom("");
      setPhoto("");
      setPrix("");
      setQuantiteStock("10");
      setTypePack("plat");
      setComposants([]);
      setBundleProduits([]);
      setTheme("");
    } finally {
      setEnCours(false);
    }
  }

  function ouvrirEdition(p: Produit) {
    setEditionId(p.id);
    setEditionComposants(
      p.composants.map((c) => ({
        slug: c.slug,
        nom: c.nom?.trim() || c.slug.replaceAll("_", " "),
        quantite: c.quantite,
        unite: c.unite,
      })),
    );
  }

  async function sauverEdition() {
    if (!editionId || editionComposants.length === 0) return;
    setEditionEnCours(true);
    try {
      const maj = await majPackComposants(
        editionId,
        editionComposants.map((c) => ({
          slug: c.slug,
          nom: c.nom,
          quantite: c.quantite,
          unite: c.unite,
        })),
      );
      if (maj) {
        setPacks(packs.map((p) => (p.id === maj.id ? maj : p)));
      }
      setEditionId(null);
    } finally {
      setEditionEnCours(false);
    }
  }

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
      <EnTetePage titre={t("adm.pack.titre")} sousTitre={t("adm.pack.sousTitre")} onRetour={() => router.back()} />

      <div className="flex-1 p-4 space-y-3">
        {/* Composition d'un nouveau pack */}
        <CarteMboa>
          <h2 className="text-titre titre-section mb-3">{t("adm.pack.composer")}</h2>

          {/* Sélection du type de pack */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTypePack("plat")}
              className={`flex-1 p-2 rounded-xl border-2 font-bold ${typePack === "plat" ? "border-[var(--mboa-primary)] bg-[var(--mboa-primary)] text-white" : "border-[var(--mboa-primary)] text-[var(--mboa-primary)]"}`}
              style={{ fontSize: 14 }}
            >
              🍲 Plat
            </button>
            <button
              onClick={() => setTypePack("bundle")}
              className={`flex-1 p-2 rounded-xl border-2 font-bold ${typePack === "bundle" ? "border-[var(--mboa-primary)] bg-[var(--mboa-primary)] text-white" : "border-[var(--mboa-primary)] text-[var(--mboa-primary)]"}`}
              style={{ fontSize: 14 }}
            >
              🧺 Bundle
            </button>
            <button
              onClick={() => setTypePack("theme")}
              className={`flex-1 p-2 rounded-xl border-2 font-bold ${typePack === "theme" ? "border-[var(--mboa-primary)] bg-[var(--mboa-primary)] text-white" : "border-[var(--mboa-primary)] text-[var(--mboa-primary)]"}`}
              style={{ fontSize: 14 }}
            >
              🎁 Thème
            </button>
          </div>

          <input
            type="text"
            placeholder={t("adm.pack.nomHint")}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="champ-mboa w-full mb-2"
            style={{ fontSize: 20 }}
          />

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder={t("adm.pack.photo")}
              value={photo.startsWith("data:") ? "" : photo}
              onChange={(e) => setPhoto(e.target.value)}
              className="flex-1 p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
              style={{ fontSize: 18 }}
            />
            <button
              type="button"
              onClick={async () => {
                const dataUrl = await choisirPhotoDepuisAppareil("appareil");
                if (dataUrl) setPhoto(dataUrl);
              }}
              className="px-3 rounded-xl border-2 border-[var(--mboa-primary)] bg-[var(--mboa-primary)] text-white font-bold"
              style={{ fontSize: 15 }}
              aria-label={t("adm.stk.appareil")}
            >
              📷
            </button>
            <button
              type="button"
              onClick={async () => {
                const dataUrl = await choisirPhotoDepuisAppareil("galerie");
                if (dataUrl) setPhoto(dataUrl);
              }}
              className="px-3 rounded-xl border-2 border-[var(--mboa-primary)] bg-[var(--mboa-background)] text-[var(--mboa-primary)] font-bold"
              style={{ fontSize: 15 }}
              aria-label={t("adm.stk.galerie")}
            >
              🖼️
            </button>
          </div>
          {photo.startsWith("data:") && (
            <img src={photo} alt="" className="w-full h-32 object-cover rounded-xl mb-2" />
          )}

          {/* Éditeur selon le type */}
          {typePack === "plat" && (
            <EditeurComposants catalogue={catalogue} composants={composants} onChange={setComposants} />
          )}

          {typePack === "bundle" && (
            <div className="mb-3">
              <p className="text-corps font-bold mb-2">🧺 Produits du bundle</p>
              {bundleProduits.map((b, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <select
                    value={b.slug}
                    onChange={(e) => {
                      const slug = e.target.value;
                      const prod = stock.find((p) => p.slug === slug);
                      setBundleProduits(bundleProduits.map((bp, idx) => idx === i ? { ...bp, slug, quantite: bp.quantite || 1 } : bp));
                    }}
                    className="flex-1 p-2 border-2 border-[var(--mboa-primary)] rounded-xl"
                    style={{ fontSize: 16 }}
                  >
                    <option value="">Choisir un produit…</option>
                    {stock.filter((p) => !produitEstPack(p) && p.actif).map((p) => (
                      <option key={p.id} value={p.slug}>{p.nom}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={b.quantite}
                    onChange={(e) => setBundleProduits(bundleProduits.map((bp, idx) => idx === i ? { ...bp, quantite: parseInt(e.target.value) || 1 } : bp))}
                    className="w-16 p-2 border-2 border-[var(--mboa-primary)] rounded-xl text-center"
                    style={{ fontSize: 18 }}
                  />
                  <button
                    onClick={() => setBundleProduits(bundleProduits.filter((_, idx) => idx !== i))}
                    className="text-[var(--mboa-error)] text-2xl px-1"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
              <BoutonMboa
                variant="surface"
                onClick={() => setBundleProduits([...bundleProduits, { slug: "", quantite: 1 }])}
                className="w-full mb-3"
              >
                ➕ Ajouter un produit
              </BoutonMboa>
            </div>
          )}

          {typePack === "theme" && (
            <div className="mb-3">
              <label className="text-corps block mb-1 font-bold">🎁 Thème du pack</label>
              <input
                type="text"
                placeholder="Ex. : fruits_rouges, saint_valentin, noel"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="champ-mboa w-full"
                style={{ fontSize: 18 }}
              />
              <p className="text-aide text-[var(--mboa-text-doux)] mt-1 italic">
                Les produits de ce thème seront regroupés côté client.
              </p>
            </div>
          )}

          {/* Prix unique + stock */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-corps block mb-1">{t("adm.pack.prix")}</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="E.g.: 2500"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="champ-mboa w-full text-chiffre"
                style={{ fontSize: 24 }}
              />
            </div>
            <div>
              <label className="text-corps block mb-1">{t("adm.pack.stock")}</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={quantiteStock}
                onChange={(e) => setQuantiteStock(e.target.value)}
                className="champ-mboa w-full text-chiffre text-center"
                style={{ fontSize: 24 }}
              />
            </div>
          </div>

          <p className="text-aide text-[var(--mboa-text-doux)] mb-2 italic">{t("adm.pack.autoCategorie")}</p>

          <BoutonMboa
            variant="primary"
            onClick={sauver}
            disabled={!nom.trim() || !prix || (typePack === "plat" && composants.length === 0) || (typePack === "bundle" && bundleProduits.length === 0) || (typePack === "theme" && !theme.trim()) || enCours}
            className="w-full"
          >
            {enCours ? t("adm.pack.sauvegarde") : t("adm.pack.sauver")}
          </BoutonMboa>
        </CarteMboa>

        {/* Plats existants */}
        <h2 className="text-titre titre-section">{t("adm.pack.liste")} ({packs.length})</h2>
        {packs.length === 0 && (
          <div className="etat-vide anim-apparition">
            <span className="emoji-vide">🍲</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("adm.pack.vide")}</p>
          </div>
        )}
        {packs.map((p) => (
          <CarteMboa key={p.id}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-corps font-bold">
                {p.nom}
                {produitEstBundle(p) && <span className="ml-2 text-[10px] bg-[var(--mboa-primary)] text-white px-2 py-0.5 rounded-full">BUNDLE</span>}
                {produitEstTheme(p) && <span className="ml-2 text-[10px] bg-[var(--mboa-secondary)] text-white px-2 py-0.5 rounded-full">THÈME</span>}
              </span>
              <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(p.prix)}</span>
            </div>
            <p className="text-aide text-[var(--mboa-text-doux)]">
              {produitEstBundle(p) && p.bundleProduits
                ? p.bundleProduits.map((b) => {
                    const prod = stock.find((s) => s.slug === b.slug);
                    return `${b.quantite}× ${prod?.nom ?? b.slug}`;
                  }).join(" · ")
                : produitEstTheme(p) && p.theme
                ? `Thème : ${p.theme}`
                : p.composants
                    .map((c) => `${c.quantite} ${unitePour(c.unite, c.quantite)} ${t("adm.pack.de")} ${c.nom?.trim() || c.slug.replaceAll("_", " ")}`)
                    .join(" · ")}
            </p>

            {editionId === p.id ? (
              <div className="mt-3 pt-3 border-t-2 border-[var(--mboa-primary)]">
                <EditeurComposants
                  catalogue={catalogue}
                  composants={editionComposants}
                  onChange={setEditionComposants}
                />
                <div className="flex gap-2">
                  <BoutonMboa
                    variant="primary"
                    onClick={sauverEdition}
                    disabled={editionComposants.length === 0 || editionEnCours}
                    className="flex-1"
                  >
                    {editionEnCours ? t("adm.pack.sauvegarde") : t("adm.pack.enregistrerModif")}
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={() => setEditionId(null)} className="flex-1">
                    {t("adm.pack.annuler")}
                  </BoutonMboa>
                </div>
              </div>
            ) : (
              <BoutonMboa variant="surface" onClick={() => ouvrirEdition(p)} className="w-full mt-3">
                ✏️ {t("adm.pack.modifier")}
              </BoutonMboa>
            )}
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}
