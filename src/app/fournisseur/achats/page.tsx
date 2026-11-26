"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { mesAchats } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { Achat, achatMontant, achatResume } from "@/core/types/achat";
import { STATUT_ACHAT_INFO } from "@/core/types/achat";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { toast } from "@/core/etat/store";
import { vibrer, jouerNotificationSonore } from "@/core/utils/son";

export default function MesAchatsPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const t = useTr();

  const [achats, setAchats] = useState<Achat[]>([]);
  const statutsVus = useRef<Map<string, string>>(new Map());

  async function charger() {
    if (!profil) return;
    const a = await mesAchats(profil.id, profil.telephone);
    for (const x of a) {
      const avant = statutsVus.current.get(x.id);
      if (avant !== undefined && avant !== x.statut) {
        const info = STATUT_ACHAT_INFO[x.statut];
        const texte = `${x.nom} · ${info.annonce ?? info.libelle}`;
        toast(texte);
        vibrer();
        jouerNotificationSonore();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("🌾 MBOA BIO", { body: texte, icon: "/logo-mboa.jpeg", tag: `achat-${x.id}` });
          } catch {
            /* notification indisponible */
          }
        }
      }
      statutsVus.current.set(x.id, x.statut);
    }
    setAchats(a);
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);
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
      <EnTetePage titre={t("fourn.achats.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {achats.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">📋</span>
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
