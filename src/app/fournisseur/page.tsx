"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, useReseau, toast } from "@/core/etat/store";
import { mesAchats } from "@/core/data/depots";
import { CarteMboa, BoutonMboa, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { Achat, achatMontant, achatEstPayee, achatEstDu } from "@/core/types/achat";
import { STATUT_ACHAT_INFO } from "@/core/types/achat";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { vibrer, jouerNotificationSonore } from "@/core/utils/son";

export default function AccueilFournisseur() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const t = useTr();
  const { deconnexion } = useSession();
  const { enLigne } = useReseau();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [gainsPaye, setGainsPaye] = useState(0);
  const [gainsEnAttente, setGainsEnAttente] = useState(0);
  // Statuts déjà vus : pour notifier le fournisseur quand le comptoir
  // traite une vente (acceptée, payée, refusée…).
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
    const paye = a.filter((x) => achatEstPayee(x.statut)).reduce((s, x) => s + achatMontant(x), 0);
    const enAttente = a.filter((x) => achatEstDu(x.statut)).reduce((s, x) => s + achatMontant(x), 0);
    setGainsPaye(paye);
    setGainsEnAttente(enAttente);
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);
  // Tirer vers le bas depuis le haut = recharger ventes et gains.
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
      <EnTetePage
        titre="MBOA SUPPLIER"
        sousTitre={profil ? profil.village : ""}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
      />

      <div className="px-4 py-1 text-center text-aide">
        {enLigne ? `● ${t("march.enLigne")}` : `● ${t("march.horsLigne")}`}
      </div>

      {/* Gains */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <CarteMboa>
          <p className="text-aide text-[var(--mboa-text-doux)]">{t("fourn.gainsPaye")}</p>
          <p className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(gainsPaye)}</p>
        </CarteMboa>
        <CarteMboa>
          <p className="text-aide text-[var(--mboa-text-doux)]">{t("fourn.gainsAttente")}</p>
          <p className="text-chiffre text-[var(--mboa-error)]">{formaterFcfa(gainsEnAttente)}</p>
        </CarteMboa>
      </div>

      {/* Boutons */}
      <div className="flex-1 p-4 space-y-3">
        <BoutonMboa variant="primary" className="w-full !text-titre" onClick={() => router.push("/fournisseur/proposer")}>
          {t("fourn.vendre")}
        </BoutonMboa>
        <BoutonMboa variant="surface" className="w-full !text-titre" onClick={() => router.push("/fournisseur/achats")}>
          {t("fourn.ventes")} ({achats.length})
        </BoutonMboa>
        <BoutonMboa variant="surface" className="w-full !text-titre" onClick={() => router.push("/fournisseur/stock")}>
          {t("fourn.stock")}
        </BoutonMboa>
      </div>

      {/* Ventes récentes */}
      {achats.length > 0 && (
        <div className="p-4">
          <h2 className="text-titre titre-section mb-2">{t("fourn.ventesRecentes")}</h2>
          {achats.slice(0, 3).map((a) => (
            <CarteMboa key={a.id} className="mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-corps font-bold">{a.nom}</span>
                  <p className="text-aide text-[var(--mboa-text-doux)]">{STATUT_ACHAT_INFO[a.statut].libelle}</p>
                </div>
                <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(achatMontant(a))}</span>
              </div>
            </CarteMboa>
          ))}
        </div>
      )}
    </FondMboa>
  );
}
