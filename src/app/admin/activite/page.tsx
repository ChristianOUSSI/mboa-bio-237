"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activitesAdmin, ActiviteAdmin } from "@/core/data/depots";
import { CarteMboa, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { formaterDate, formaterDateHeure } from "@/core/utils/format_date";

/** Journal complet des actions admin : qui a fait quoi, et quand. */
export default function ActiviteAdminPage() {
  const router = useRouter();
  const { pret } = useGuardRole("admin");
  const t = useTr();
  const [activites, setActivites] = useState<ActiviteAdmin[]>([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const acts = await activitesAdmin();
    setActivites(acts);
    // Marque le flux comme lu : le badge du dashboard se vide.
    try {
      localStorage.setItem("mboa_act_lue_le", String(Date.now()));
    } catch {}
    setChargement(false);
  }

  useActualisation(charger);

  if (!pret || chargement) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={8} />
        </div>
      </FondMboa>
    );
  }

  return (
    <FondMboa>
      <EnTetePage titre={t("adm.act.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {activites.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">📋</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("adm.act.vide")}</p>
          </div>
        ) : (
          activites.map((a) => (
            <CarteMboa key={a.id}>
              <div className="flex justify-between items-start gap-2">
                <p className="text-corps">
                  <strong>{a.auteur}</strong> {t(a.action)}
                  {a.detail ? <span className="text-[var(--mboa-text-doux)]"> · {a.detail}</span> : null}
                </p>
                <span className="text-aide text-[var(--mboa-text-doux)] whitespace-nowrap shrink-0">
                  {formaterDateHeure(a.quand)}
                </span>
              </div>
            </CarteMboa>
          ))
        )}
      </div>
    </FondMboa>
  );
}
