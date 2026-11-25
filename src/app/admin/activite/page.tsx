"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activitesAdmin, supprimerActivite, archiverActivite, viderActivites, ActiviteAdmin } from "@/core/data/depots";
import { CarteMboa, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
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
  const [modeArchive, setModeArchive] = useState(false);

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
  // Tirer vers le bas depuis le haut = recharger la page.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

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
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
      <EnTetePage titre={t("adm.act.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {activites.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">📋</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("adm.act.vide")}</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={() => setModeArchive(!modeArchive)}
                className="text-aide font-bold underline"
              >
                {modeArchive ? t("adm.act.modeRecent") : t("adm.act.modeArchive")}
              </button>
              <button
                onClick={async () => { await viderActivites(); await charger(); }}
                className="text-aide text-[var(--mboa-error)] font-bold underline"
              >
                {t("adm.act.vider")}
              </button>
            </div>
            {activites.map((a) => (
              <CarteMboa key={a.id} className={a.archive ? "opacity-50" : ""}>
                <div className="flex justify-between items-start gap-2">
                  <p className="text-corps">
                    <strong>{a.auteur}</strong> {t(a.action)}
                    {a.detail ? <span className="text-[var(--mboa-text-doux)]"> · {a.detail}</span> : null}
                  </p>
                  <span className="text-aide text-[var(--mboa-text-doux)] whitespace-nowrap shrink-0">
                    {formaterDateHeure(a.quand)}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  {!a.archive && (
                    <button
                      onClick={async () => { await archiverActivite(a.id); await charger(); }}
                      className="text-aide text-[var(--mboa-primary)] font-bold underline"
                    >
                      {t("adm.act.archiver")}
                    </button>
                  )}
                  <button
                    onClick={async () => { await supprimerActivite(a.id); await charger(); }}
                    className="text-aide text-[var(--mboa-error)] font-bold underline"
                  >
                    {t("adm.act.supprimer")}
                  </button>
                </div>
              </CarteMboa>
            ))}
          </>
        )}
      </div>
    </FondMboa>
  );
}
