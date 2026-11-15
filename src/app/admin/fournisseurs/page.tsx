"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chargerFournisseurs, basculerFournisseurActif } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Fournisseur, fournisseurProduction, fournisseurLie } from "@/core/types/fournisseur";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

export default function FournisseursAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);

  async function charger() { setFournisseurs(await chargerFournisseurs()); }

  useEffect(() => {
    charger();
  }, []);

  async function basculer(f: Fournisseur, actif: boolean) {
    await basculerFournisseurActif(f.id, actif);
    await charger();
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
      <EnTetePage titre={t("adm.fourn.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {fournisseurs.map((f) => (
          <CarteMboa key={f.id}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-corps font-bold">{f.nom}</span>
                <p className="text-aide text-[var(--mboa-text-doux)]">{f.village}</p>
                <p className="text-aide text-[var(--mboa-text-doux)]">{fournisseurProduction(f)}</p>
              </div>
              <div className="flex items-center gap-2">
                <BoutonVoix texte={`${f.nom}, ${f.village}. ${fournisseurProduction(f)}`} />
                <span className={`text-aide px-2 py-1 rounded-full ${f.actif ? "bg-[var(--mboa-secondary-doux)] text-[var(--mboa-primary)]" : "bg-amber-100 text-amber-800"}`}>
                  {f.actif ? (fournisseurLie(f) ? t("adm.fourn.compteLie") : t("adm.fourn.sansCompte")) : t("adm.fourn.enAttente")}
                </span>
              </div>
            </div>
            {!f.actif && (
              <div className="flex gap-2 mt-2">
                <BoutonMboa variant="primary" className="flex-1 !min-h-[44px]" onClick={() => basculer(f, true)}>
                  ✓ {t("adm.fourn.valider")}
                </BoutonMboa>
                <BoutonMboa variant="surface" className="flex-1 !min-h-[44px]" onClick={() => basculer(f, false)}>
                  {t("adm.fourn.garderAttente")}
                </BoutonMboa>
              </div>
            )}
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}
