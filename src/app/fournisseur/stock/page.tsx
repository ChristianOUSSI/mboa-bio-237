"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { chargerStock } from "@/core/data/depots";
import { CarteMboa, EnTetePage, JaugeMboa, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { Produit, produitJauge, produitDisponibilite } from "@/core/types/produit";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

export default function StockFournisseurPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const t = useTr();

  const [stock, setStock] = useState<Produit[]>([]);

  async function charger() {
    setStock(await chargerStock());
  }

  // Recharge au montage, toutes les 60 s et au retour sur l'onglet.
  useActualisation(charger, 60000);
  // Tirer vers le bas depuis le haut = recharger la page.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

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
      <EnTetePage titre={t("stock.titre")} onRetour={() => router.back()} />
      <p className="px-4 py-2 text-aide text-[var(--mboa-text-doux)] italic">
        {t("stock.note")}
      </p>
      <div className="flex-1 p-4 space-y-2">
        {stock.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">📦</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("stock.vide")}</p>
          </div>
        ) : (
          stock.map((p) => (
            <CarteMboa key={p.id}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <BoutonVoix texte={`${p.nom}, ${produitDisponibilite(p)}`} />
                  <span className="text-corps font-bold">{p.nom}</span>
                </div>
                <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(p.prix)}</span>
              </div>
              <p className="text-aide text-[var(--mboa-text-doux)] mb-1">{produitDisponibilite(p)}</p>
              <JaugeMboa valeur={produitJauge(p)} />
            </CarteMboa>
          ))
        )}
      </div>
    </FondMboa>
  );
}
