"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { chargerVitrine, toutesAnnonces } from "@/core/data/depots";
import { Annonce } from "@/core/types/annonce";
import { annoncePromoPct, annonceExpiree } from "@/core/utils/promos";
import { categoriesPerso, libelleCategorie, emojiCategorie, CategoriePerso } from "@/core/data/categories";
import { Produit, produitAnnonceVocale, produitDisponibilite, produitPrixLabel, produitJauge, produitEstRupture, produitUniteReelle, produitEstVitrine, produitEstPack } from "@/core/types/produit";
import { usePanier } from "@/core/etat/store";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

/** Page d'une catégorie : tous les produits qu'elle contient, prix et photos. */
export default function PageCategorie() {
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
      <PageCategorieInterne />
    </Suspense>
  );
}

function PageCategorieInterne() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? "");
  const { pret } = useGuardRole("consommateur");
  const panier = usePanier();
  const t = useTr();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [persos, setPersos] = useState<CategoriePerso[]>([]);
  const [chargement, setChargement] = useState(true);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);

  async function charger() {
    const [v, p, a] = await Promise.all([chargerVitrine(), categoriesPerso(), toutesAnnonces()]);
    setAnnonces(a.filter((x) => x.actif && !annonceExpiree(x)));
    setProduits(v.filter((x) => produitEstVitrine(x) && x.categorie === slug));
    setPersos(p);
    setChargement(false);
  }

  // Recharge au montage, toutes les 60 s et au retour sur l'onglet.
  useActualisation(charger, 60000);

  if (!pret || chargement) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  const titre = libelleCategorie(slug, persos);
  const emoji = emojiCategorie(slug, persos);

  const promoPct = (p: Produit) => annoncePromoPct(annonces, p);
  const estNouveau = (p: Produit) =>
    !!p.createdLe && Date.now() - new Date(p.createdLe).getTime() < 7 * 24 * 3600 * 1000;

  function poserAuPanier(produit: Produit) {
    const u = produitUniteReelle(produit);
    const pct = promoPct(produit);
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: 1,
      prix: pct ? Math.round(produit.prix * (1 - pct / 100)) : produit.prix,
      coutAchat: produit.prixAchat ?? 0,
      photo: produit.photoReelle,
      unite: u,
      composants: produit.composants,
    });
  }

  return (
    <FondMboa>
      <EnTetePage
        titre={`${emoji ? `${emoji} ` : ""}${titre}`}
        sousTitre={`${produits.length} ${t("cat.produits")}`}
        onRetour={() => router.back()}
      />

      <div className="flex-1 px-4 py-2">
        {produits.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide" aria-hidden>🥬</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("march.aucunProduit")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {produits.map((p) => (
              <CarteMboa key={p.id} className="card-produit !p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1">
                    {p.emoji ?? <PictoCategorie categorie={p.categorie} size={24} />}
                    <h3 className="text-corps font-bold">{p.nom}</h3>
                    {estNouveau(p) && (
                      <span className="text-aide px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--mboa-accent-doux)", color: "var(--mboa-primary)", fontSize: 11 }}>
                        {t("march.nouveau")}
                      </span>
                    )}
                  </div>
                  <BoutonVoix texte={produitAnnonceVocale(p, true)} />
                </div>

                <div className="zone-photo w-full h-32 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
                  {p.emoji ? (
                    <span style={{ fontSize: 64 }} aria-hidden>{p.emoji}</span>
                  ) : p.photoReelle ? (
                    <img src={p.photoReelle} alt={p.nom} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <PictoCategorie categorie={p.categorie} size={64} />
                  )}
                </div>

                <p className="text-aide text-[var(--mboa-text-doux)] mb-1">
                  {produitEstRupture(p) ? t("march.rupture") : t("march.disponible")}
                </p>
                <JaugeMboa valeur={produitJauge(p)} />

                <div className="flex justify-between items-center mt-2">
                  {(() => {
                    const pct = promoPct(p);
                    return pct ? (
                      <span className="flex flex-col items-end">
                        <span className="text-aide line-through" style={{ color: "var(--mboa-text-doux)" }}>{p.prix} F</span>
                        <span className="puce-prix" style={{ background: "var(--mboa-error)" }}>{Math.round(p.prix * (1 - pct / 100))} F -{pct} %</span>
                      </span>
                    ) : (
                      <span className="puce-prix">{produitPrixLabel(p)}</span>
                    );
                  })()}
                  {!produitEstRupture(p) && (
                    <button
                      onClick={() => poserAuPanier(p)}
                      className="btn-mboa btn-primary !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                      aria-label={t("march.ajouter")}
                    >
                      +
                    </button>
                  )}
                </div>
                {produitEstPack(p) && (
                  <Link
                    href={`/consommateur/pack/${encodeURIComponent(p.slug)}`}
                    className="block text-center text-aide text-[var(--mboa-primary)] font-bold mt-2 underline"
                  >
                    🍲 {t("pack.voir")}
                  </Link>
                )}
              </CarteMboa>
            ))}
          </div>
        )}
      </div>
    </FondMboa>
  );
}
