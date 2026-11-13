"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { mesAchats } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Achat, achatMontant, achatResume } from "@/core/types/achat";
import { STATUT_ACHAT_INFO } from "@/core/types/achat";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

export default function MesAchatsPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const t = useTr();

  const [achats, setAchats] = useState<Achat[]>([]);

  useEffect(() => {
    async function charger() {
      if (!profil) return;
      setAchats(await mesAchats(profil.id));
    }
    charger();
  }, [profil]);

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
      <EnTetePage titre={t("fourn.achats.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {achats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("fourn.achats.vide")}</p>
          </div>
        ) : (
          achats.map((a) => (
            <CarteMboa key={a.id}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <BoutonVoix texte={achatResume(a)} />
                  <span className="text-corps font-bold">{a.nom}</span>
                </div>
                <BadgeStatut statut={a.statut} libelle={STATUT_ACHAT_INFO[a.statut].libelle} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-aide text-[var(--mboa-text-doux)]">
                  {a.quantite} {a.unite} · {a.prixDemande} F
                </span>
                <span className="text-chiffre text-[var(--mboa-primary)]">
                  {formaterFcfa(achatMontant(a))}
                </span>
              </div>
              {a.motif && (
                <p className="text-aide text-[var(--mboa-error)] mt-2">{a.motif}</p>
              )}
            </CarteMboa>
          ))
        )}
      </div>
    </FondMboa>
  );
}
