"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toutesCommandes, payerLivreur } from "@/core/data/depots";
import { etatLire, etatEcrire } from "@/core/data/base_locale";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { STATUT_COMMANDE_INFO, StatutCommande } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { resumerQuantites } from "@/core/types/commande";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

const CLE_PAYES = "livreurs_payes";

export default function LivraisonsPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [payes, setPayes] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState<string | null>(null);

  async function charger() {
    const [c, p] = await Promise.all([toutesCommandes(), etatLire<string[]>(CLE_PAYES)]);
    setCommandes(c);
    setPayes(new Set(p ?? []));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, []);

  /** Le livreur est payé uniquement après réception confirmée par la cliente. */
  async function payer(c: Commande) {
    setEnCours(c.id);
    try {
      const tarif = c.livreurTarif ?? 0;
      await payerLivreur(c.id, tarif);
      const nouveau = new Set(payes);
      nouveau.add(c.id);
      setPayes(nouveau);
      await etatEcrire(CLE_PAYES, Array.from(nouveau));
    } finally {
      setEnCours(null);
    }
  }

  // Réception confirmée par la cliente, livreur pas encore payé
  const aPayer = commandes.filter(
    (c) => c.statut === StatutCommande.recue && !payes.has(c.id),
  );
  const enCours2 = commandes.filter(
    (c) => c.statut === StatutCommande.enLivraison || c.statut === StatutCommande.valideeAdmin,
  );

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
      <EnTetePage titre={t("adm.liv.titre")} sousTitre={t("adm.liv.sousTitre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-3">
        <h2 className="text-titre">{t("adm.liv.aPayer")} ({aPayer.length})</h2>
        {aPayer.length === 0 ? (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">
              {t("adm.liv.rienAPayer")}
            </p>
          </CarteMboa>
        ) : (
          aPayer.map((c) => (
            <CarteMboa key={c.id}>
              <div className="flex justify-between items-start mb-2">
                <BadgeStatut statut={c.statut} libelle={STATUT_COMMANDE_INFO[c.statut].libelle} />
                <BoutonVoix texte={`${t("adm.liv.voixFin")} ${c.livreurTarif ?? 0} francs`} />
              </div>
              <p className="text-corps mb-1">{resumerQuantites(c.lignes)}</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-aide text-[var(--mboa-text-doux)]">
                  {c.livreurNom ?? t("adm.liv.livreur")}
                </span>
                <span className="text-chiffre text-[var(--mboa-primary)]">
                  {formaterFcfa(c.livreurTarif ?? 0)}
                </span>
              </div>
              <BoutonMboa
                variant="primary"
                className="w-full"
                disabled={enCours === c.id}
                onClick={() => payer(c)}
              >
                {enCours === c.id ? t("adm.liv.paiement") : t("adm.liv.payer")}
              </BoutonMboa>
            </CarteMboa>
          ))
        )}

        {enCours2.length > 0 && (
          <>
            <h2 className="text-titre">{t("adm.liv.enCours")} ({enCours2.length})</h2>
            {enCours2.map((c) => (
              <CarteMboa key={c.id}>
                <div className="flex justify-between items-start mb-2">
                  <BadgeStatut statut={c.statut} libelle={STATUT_COMMANDE_INFO[c.statut].libelle} />
                  <span className="text-chiffre text-[var(--mboa-primary)]">
                    {formaterFcfa(commandeMontantAPayer(c))}
                  </span>
                </div>
                <p className="text-corps">{resumerQuantites(c.lignes)}</p>
                {c.livreurNom && (
                  <p className="text-aide text-[var(--mboa-text-doux)] mt-1">{t("adm.liv.livreur2")} : {c.livreurNom}</p>
                )}
              </CarteMboa>
            ))}
          </>
        )}
      </div>
    </FondMboa>
  );
}
