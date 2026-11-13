"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { chargerVitrine } from "@/core/data/depots";
import { categoriesPerso, libelleCategorie, emojiCategorie, CategoriePerso } from "@/core/data/categories";
import { Produit, produitAnnonceVocale, produitDisponibilite, produitPrixLabel, produitJauge, produitEstRupture, produitUniteReelle, produitEstVitrine, produitEstPack } from "@/core/types/produit";
import { usePanier } from "@/core/etat/store";
import { useGuardRole } from "@/core/auth/use_guard_role";
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

  useEffect(() => {
    async function charger() {
      const [v, p] = await Promise.all([chargerVitrine(), categoriesPerso()]);
      setProduits(v.filter((x) => produitEstVitrine(x) && x.categorie === slug));
      setPersos(p);
      setChargement(false);
    }
    charger();
  }, [slug]);

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

  function poserAuPanier(produit: Produit) {
    const u = produitUniteReelle(produit);
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: 1,
      prix: produit.prix,
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
          <CarteMboa className="text-center">
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("march.aucunProduit")}</p>
          </CarteMboa>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {produits.map((p) => (
              <CarteMboa key={p.id}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1">
                    {p.emoji ?? <PictoCategorie categorie={p.categorie} size={24} />}
                    <h3 className="text-corps font-bold">{p.nom}</h3>
                  </div>
                  <BoutonVoix texte={produitAnnonceVocale(p, true)} />
                </div>

                <div className="w-full h-32 bg-[var(--mboa-background)] rounded-xl flex items-center justify-center mb-2">
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
                  <span className="text-chiffre text-[var(--mboa-primary)]">
                    {produitPrixLabel(p)}
                  </span>
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
