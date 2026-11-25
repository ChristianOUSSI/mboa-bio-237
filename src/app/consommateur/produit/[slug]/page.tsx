"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, FondMboa, SkeletonMboa, BoutonMboa } from "@/core/design_system/composants";
import { BlocQuantite } from "@/core/design_system/bloc_quantite";
import { chargerStock } from "@/core/data/depots";
import { Produit, produitAnnonceVocale, produitPrixLabel, produitJauge, produitEstRupture, produitEstPack, produitEstBundle, produitEstTheme } from "@/core/types/produit";
import { unitePour } from "@/core/types/unite";
import { packComposantLibelle } from "@/core/types/pack_composant";
import { categoriesPerso, libelleCategorie, CategoriePerso } from "@/core/data/categories";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { toutesAnnonces } from "@/core/data/depots";
import { Annonce } from "@/core/types/annonce";
import { annoncePromoPct, annonceExpiree } from "@/core/utils/promos";

/** Fiche produit : photo, prix, unités, quantité et composition des packs.
 *  Accessible depuis chaque carte du marché et de la catégorie. */
export default function PageProduit() {
  return (
    <Suspense
      fallback={
        <FondMboa>
          <div className="flex-1 p-4">
            <SkeletonMboa lignes={6} />
          </div>
        </FondMboa>
      }
    >
      <PageProduitInterne />
    </Suspense>
  );
}

function PageProduitInterne() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? "");
  const { pret } = useGuardRole("consommateur");
  const t = useTr();
  const [produit, setProduit] = useState<Produit | null>(null);
  const [stock, setStock] = useState<Produit[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [persos, setPersos] = useState<CategoriePerso[]>([]);
  const [chargement, setChargement] = useState(true);
  // Horodatage pour le badge « Nouveau » (Date.now() impur au render).
  const [maintenant, setMaintenant] = useState(0);

  const recharger = useCallback(async () => {
    setMaintenant(Date.now());
    const [s, a, p] = await Promise.all([chargerStock(), toutesAnnonces(), categoriesPerso()]);
    const actifs = s.filter((x) => x.actif);
    setStock(actifs);
    setProduit(actifs.find((x) => x.slug === slug) ?? null);
    setAnnonces(a.filter((x) => x.actif && !annonceExpiree(x)));
    setPersos(p);
    setChargement(false);
  }, [slug]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  // Tirer vers le bas depuis le haut = recharger la fiche (stock frais).
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(recharger);

  if (!pret || chargement) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  if (!produit) {
    return (
      <FondMboa>
        <EnTetePage titre={t("produit.fiche")} onRetour={() => router.back()} />
        <div className="flex-1 p-4">
          <CarteMboa className="text-center">
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("produit.introuvable")}</p>
            <Link href="/consommateur" className="inline-block mt-3">
              <BoutonMboa variant="surface">{t("march.titre")}</BoutonMboa>
            </Link>
          </CarteMboa>
        </div>
      </FondMboa>
    );
  }

  const pct = annoncePromoPct(annonces, produit);
  const rupture = produitEstRupture(produit);
  const estNouveau = !!produit.createdLe && maintenant > 0 && maintenant - new Date(produit.createdLe).getTime() < 7 * 24 * 3600 * 1000;
  // Résout les produits d'un bundle par slug pour afficher leurs noms.
  const bundleDetails = produitEstBundle(produit)
    ? (produit.bundleProduits ?? []).map((b) => ({
        ...b,
        nom: stock.find((x) => x.slug === b.slug)?.nom ?? b.slug,
      }))
    : [];

  return (
    <FondMboa>
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
      <EnTetePage
        titre={produit.nom}
        sousTitre={libelleCategorie(produit.categorie, persos)}
        onRetour={() => router.back()}
      />

      <div className="flex-1 px-4 py-2 space-y-3">
        <CarteMboa>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {produit.emoji ?? <PictoCategorie categorie={produit.categorie} size={28} />}
              <h2 className="text-titre titre-section">{produit.nom}</h2>
              {estNouveau && (
                <span className="text-aide px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--mboa-accent-doux)", color: "var(--mboa-primary)", fontSize: 11 }}>
                  {t("march.nouveau")}
                </span>
              )}
              {produitEstPack(produit) && (
                <span className="text-aide px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--mboa-secondary-doux)", color: "var(--mboa-primary)", fontSize: 11 }}>
                  🍲 {produitEstTheme(produit) ? "Thème" : produitEstBundle(produit) ? "Lot" : "Plat"}
                </span>
              )}
            </div>
            <BoutonVoix texte={produitAnnonceVocale(produit, true)} />
          </div>

          <div className="zone-photo w-full h-56 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
            {produit.emoji ? (
              <span style={{ fontSize: 96 }} aria-hidden>{produit.emoji}</span>
            ) : produit.photoReelle ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produit.photoReelle} alt={produit.nom} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <PictoCategorie categorie={produit.categorie} size={96} />
            )}
          </div>

          <p className="text-aide text-[var(--mboa-text-doux)] mb-1">
            {rupture ? t("march.rupture") : t("march.disponible")}
          </p>
          <JaugeMboa valeur={produitJauge(produit)} />

          {produit.perissable && (
            <p className="text-aide mt-2 font-bold" style={{ color: "var(--mboa-accent, #F9A825)" }}>
              ❄️ {t("produit.perissable")} - {t("produit.conservation")}
            </p>
          )}

          {/* Prix : barré + promo le cas échéant, sinon prix unitaire */}
          <div className="mt-3">
            {pct ? (
              <p className="flex items-center gap-2 flex-wrap">
                <span className="text-aide line-through" style={{ color: "var(--mboa-text-doux)" }}>{produitPrixLabel(produit)}</span>
                <span className="puce-prix" style={{ background: "var(--mboa-error)" }}>
                  {formaterFcfa(Math.round(produit.prix * (1 - pct / 100)))} -{pct} %
                </span>
              </p>
            ) : (
              <span className="puce-prix">{produitPrixLabel(produit)}</span>
            )}
          </div>

          {!rupture && (
            <div className="mt-3">
              <BlocQuantite produit={produit} promoPct={() => pct} t={t} />
            </div>
          )}
        </CarteMboa>

        {/* Composition des plats (ingrédients) */}
        {produit.composants.length > 0 && (
          <>
            <h2 className="text-titre titre-section">{t("pack.ingredients")}</h2>
            <CarteMboa>
              <ul className="space-y-2">
                {produit.composants.map((c, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[var(--mboa-secondary-doux)] flex items-center justify-center text-lg" aria-hidden>
                      🥬
                    </span>
                    <span className="text-corps flex-1">{packComposantLibelle(c)}</span>
                    <span className="text-corps font-bold text-[var(--mboa-primary)]">
                      {c.quantite} {unitePour(c.unite, c.quantite)}
                    </span>
                  </li>
                ))}
              </ul>
            </CarteMboa>
          </>
        )}

        {/* Contenu des lots (bundle) : produits du stock */}
        {bundleDetails.length > 0 && (
          <>
            <h2 className="text-titre titre-section">{t("produit.bundleContenu")}</h2>
            <CarteMboa>
              <ul className="space-y-2">
                {bundleDetails.map((b, i) => {
                  const cible = stock.find((x) => x.slug === b.slug);
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[var(--mboa-secondary-doux)] flex items-center justify-center text-lg" aria-hidden>
                        {cible?.emoji ?? "📦"}
                      </span>
                      <span className="text-corps flex-1">{b.nom}</span>
                      <span className="text-corps font-bold text-[var(--mboa-primary)]">×{b.quantite}</span>
                    </li>
                  );
                })}
              </ul>
            </CarteMboa>
          </>
        )}

        {/* Pour les plats, la page dédiée « pack » reste accessible */}
        {produitEstPack(produit) && (
          <Link href={`/consommateur/pack/${encodeURIComponent(produit.slug)}`}>
            <BoutonMboa variant="surface" className="w-full">🍲 {t("pack.voir")}</BoutonMboa>
          </Link>
        )}

        <div className="sticky bottom-20 z-30 mt-2">
          <Link href="/consommateur/panier">
            <BoutonMboa variant="surface" className="w-full">
              {t("panier.titre")}
            </BoutonMboa>
          </Link>
        </div>
      </div>
    </FondMboa>
  );
}
