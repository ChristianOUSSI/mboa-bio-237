"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, FondMboa, SkeletonMboa, BoutonMboa } from "@/core/design_system/composants";
import { chargerVitrine } from "@/core/data/depots";
import { Produit, produitAnnonceVocale, produitDisponibilite, produitPrixLabel, produitJauge, produitEstRupture, produitUniteReelle, produitEstPack } from "@/core/types/produit";
import { unitePour } from "@/core/types/unite";
import { packComposantLibelle } from "@/core/types/pack_composant";
import { usePanier } from "@/core/etat/store";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

/** Détail d'un plat : photo, prix et liste de ce qu'il contient. */
export default function PagePack() {
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
      <PagePackInterne />
    </Suspense>
  );
}

function PagePackInterne() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? "");
  const { pret } = useGuardRole("consommateur");
  const panier = usePanier();
  const t = useTr();
  const [produit, setProduit] = useState<Produit | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function charger() {
      const v = await chargerVitrine();
      setProduit(v.find((x) => x.slug === slug && produitEstPack(x)) ?? null);
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

  if (!produit) {
    return (
      <FondMboa>
        <EnTetePage titre={t("pack.titre")} onRetour={() => router.back()} />
        <div className="flex-1 p-4">
          <CarteMboa className="text-center">
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("pack.introuvable")}</p>
          </CarteMboa>
        </div>
      </FondMboa>
    );
  }

  function poserAuPanier() {
    const u = produitUniteReelle(produit!);
    panier.poser({
      produitId: produit!.id,
      slug: produit!.slug,
      nom: produit!.nom,
      categorie: produit!.categorie,
      quantite: 1,
      prix: produit!.prix,
      coutAchat: produit!.prixAchat ?? 0,
      photo: produit!.photoReelle,
      unite: u,
      composants: produit!.composants,
    });
    router.push("/consommateur/panier");
  }

  return (
    <FondMboa>
      <EnTetePage
        titre={produit.nom}
        sousTitre={t("pack.contenu")}
        onRetour={() => router.back()}
      />

      <div className="flex-1 px-4 py-2 space-y-3">
        <CarteMboa>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              {produit.emoji ?? <PictoCategorie categorie={produit.categorie} size={28} />}
              <h2 className="text-titre">{produit.nom}</h2>
            </div>
            <BoutonVoix texte={produitAnnonceVocale(produit, true)} />
          </div>

          <div className="w-full h-48 bg-[var(--mboa-background)] rounded-xl flex items-center justify-center mb-3">
            {produit.emoji ? (
              <span style={{ fontSize: 80 }} aria-hidden>{produit.emoji}</span>
            ) : produit.photoReelle ? (
              <img src={produit.photoReelle} alt={produit.nom} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <PictoCategorie categorie={produit.categorie} size={80} />
            )}
          </div>

          <p className="text-aide text-[var(--mboa-text-doux)] mb-1">
            {produitEstRupture(produit) ? t("march.rupture") : t("march.disponible")}
          </p>
          <JaugeMboa valeur={produitJauge(produit)} />

          <div className="flex justify-between items-center mt-3">
            <span className="text-chiffre text-[var(--mboa-primary)]">
              {produitPrixLabel(produit)}
            </span>
            {!produitEstRupture(produit) && (
              <BoutonMboa variant="primary" onClick={poserAuPanier}>
                {t("pack.ajouterPanier")}
              </BoutonMboa>
            )}
          </div>
        </CarteMboa>

        {/* Ce que le plat contient */}
        <h2 className="text-titre">{t("pack.ingredients")}</h2>
        <CarteMboa>
          <ul className="space-y-2">
            {produit.composants.map((c, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[var(--mboa-secondary-doux)] flex items-center justify-center text-lg" aria-hidden>
                  🥬
                </span>
                <span className="text-corps flex-1">
                  {packComposantLibelle(c)}
                </span>
                <span className="text-corps font-bold text-[var(--mboa-primary)]">
                  {c.quantite} {unitePour(c.unite, c.quantite)}
                </span>
              </li>
            ))}
          </ul>
        </CarteMboa>

        <Link href="/consommateur/panier">
          <BoutonMboa variant="surface" className="w-full">
            🛒 {t("panier.titre")}
          </BoutonMboa>
        </Link>
      </div>
    </FondMboa>
  );
}
