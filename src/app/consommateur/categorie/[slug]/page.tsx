"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { chargerVitrine, toutesAnnonces } from "@/core/data/depots";
import { Annonce } from "@/core/types/annonce";
import { annoncePromoPct, annonceExpiree } from "@/core/utils/promos";
import { categoriesPerso, libelleCategorie, emojiCategorie, CategoriePerso } from "@/core/data/categories";
import { Produit, produitAnnonceVocale, produitJauge, produitEstRupture, produitEstVitrine, produitEstPack, produitPrixLabel } from "@/core/types/produit";
import { BlocQuantite } from "@/core/design_system/bloc_quantite";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { formaterFcfaCourt } from "@/core/utils/format_monnaie";

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
  const t = useTr();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [persos, setPersos] = useState<CategoriePerso[]>([]);
  const [chargement, setChargement] = useState(true);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  // Horodatage du chargement : Date.now() est impur au render.
  const [maintenant, setMaintenant] = useState(0);

  async function charger() {
    setMaintenant(Date.now());
    const [v, p, a] = await Promise.all([chargerVitrine(), categoriesPerso(), toutesAnnonces()]);
    setAnnonces(a.filter((x) => x.actif && !annonceExpiree(x)));
    setProduits(v.filter((x) => produitEstVitrine(x) && x.categorie === slug));
    setPersos(p);
    setChargement(false);
  }

  // Recharge au montage, toutes les 60 s et au retour sur l'onglet.
  useActualisation(charger, 60000);
  // Tirer vers le bas depuis le haut = recharger la catégorie.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

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
    !!p.createdLe && maintenant > 0 && maintenant - new Date(p.createdLe).getTime() < 7 * 24 * 3600 * 1000;

  return (
    <FondMboa>
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
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
              <CarteProduitCat key={p.id} p={p} promoPct={promoPct} estNouveau={estNouveau} t={t} />
            ))}
          </div>
        )}
      </div>
    </FondMboa>
  );
}

/** Carte produit de la page catégorie : même présentation que la
 *  grille du marché - photo cliquable vers la fiche, prix et
 *  BlocQuantite partagé (unité + quantité). */
function CarteProduitCat({
  p,
  promoPct,
  estNouveau,
  t,
}: {
  p: Produit;
  promoPct: (x: Produit) => number | null;
  estNouveau: (x: Produit) => boolean;
  t: (k: string) => string;
}) {
  const pct = promoPct(p);

  return (
    <CarteMboa className="card-produit !p-3">
      <div className="flex justify-between items-start mb-1">
        <Link href={`/consommateur/produit/${encodeURIComponent(p.slug)}`} className="flex items-center gap-1 min-w-0">
          {p.emoji ?? <PictoCategorie categorie={p.categorie} size={24} />}
          <h3 className="text-corps font-bold truncate">{p.nom}</h3>
          {estNouveau(p) && (
            <span className="text-aide px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: "var(--mboa-accent-doux)", color: "var(--mboa-primary)", fontSize: 11 }}>
              {t("march.nouveau")}
            </span>
          )}
        </Link>
        <BoutonVoix texte={produitAnnonceVocale(p, true)} />
      </div>

      <Link href={`/consommateur/produit/${encodeURIComponent(p.slug)}`} className="block">
        <div className="zone-photo w-full h-32 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
          {p.emoji ? (
            <span className="emoji-anime" style={{ fontSize: 64 }} aria-hidden>{p.emoji}</span>
          ) : p.photoReelle ? (
            <img src={p.photoReelle} alt={p.nom} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <PictoCategorie categorie={p.categorie} size={64} />
          )}
        </div>
      </Link>

      <p className="text-aide text-[var(--mboa-text-doux)] mb-1">
        {produitEstRupture(p) ? t("march.rupture") : t("march.disponible")}
      </p>
      <JaugeMboa valeur={produitJauge(p)} />

      {/* Prix de l'unité par défaut (+ promo) puis sélecteur partagé :
          le choix d'unité et la quantité se font dans BlocQuantite,
          comme sur la grille du marché. */}
      <div className="flex justify-between items-center mt-2">
        {pct ? (
          <span className="flex flex-col items-end">
            <span className="text-aide line-through" style={{ color: "var(--mboa-text-doux)" }}>{produitPrixLabel(p)}</span>
            <span className="puce-prix" style={{ background: "var(--mboa-error)" }}>
              {formaterFcfaCourt(Math.round(p.prix * (1 - pct / 100)))} -{pct} %
            </span>
          </span>
        ) : (
          <span className="puce-prix">{produitPrixLabel(p)}</span>
        )}
      </div>
      {!produitEstRupture(p) && (
        <BlocQuantite produit={p} promoPct={promoPct} t={t} />
      )}
      {produitEstPack(p) && (
        <Link
          href={`/consommateur/pack/${encodeURIComponent(p.slug)}`}
          className="block text-center text-aide text-[var(--mboa-primary)] font-bold mt-2 underline"
        >
          🍲 {t("pack.voir")}
        </Link>
      )}
    </CarteMboa>
  );
}
