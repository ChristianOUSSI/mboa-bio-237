"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toutesCommandes, chargerLivreurs, validerDevis, assignerLivreur, refuserDevis } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { Livreur } from "@/core/types/livreur";
import { STATUT_COMMANDE_INFO, StatutCommande } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { resumerQuantites } from "@/core/types/commande";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

export default function DevisAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [livreurChoisi, setLivreurChoisi] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);

  async function charger() {
    const [c, l] = await Promise.all([toutesCommandes(), chargerLivreurs()]);
    setCommandes(c);
    setLivreurs(l.filter((x) => x.actif));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, []);

  /** Validation du devis + envoi d'un livreur. */
  async function validerEtEnvoyer(c: Commande, livreurId?: string) {
    const id = livreurId ?? livreurChoisi[c.id] ?? livreurs[0]?.id;
    const livreur = livreurs.find((l) => l.id === id);
    if (!livreur) return;
    setEnCours(c.id);
    try {
      await validerDevis(c);
      await assignerLivreur(c.id, livreur.id, livreur.tarifCourse);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  /** Refuse le devis : la marchandise n'est pas prélevée. */
  async function refuser(c: Commande) {
    setEnCours(c.id);
    try {
      await refuserDevis(c.id);
      await charger();
    } finally {
      setEnCours(null);
    }
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
      <EnTetePage titre={t("adm.dev.titre")} sousTitre={t("adm.dev.sousTitre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {commandes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("adm.dev.vide")}</p>
          </div>
        )}
        {commandes.map((c) => {
          const info = STATUT_COMMANDE_INFO[c.statut];
          const estNouveau = c.statut === StatutCommande.nouvelle;
          const livreurSelectionne = livreurChoisi[c.id] ?? livreurs[0]?.id ?? "";
          return (
            <CarteMboa key={c.id}>
              <div className="flex justify-between items-start mb-2">
                <BadgeStatut statut={c.statut} libelle={info.libelle} />
                <BoutonVoix texte={`${resumerQuantites(c.lignes)}. ${formaterFcfa(commandeMontantAPayer(c))}`} />
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-corps">{resumerQuantites(c.lignes)}</span>
                <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(commandeMontantAPayer(c))}</span>
              </div>

              {/* Validation : choix du livreur puis envoi */}
              {estNouveau && livreurs.length > 0 && (
                <div className="mt-2 space-y-2">
                  <select
                    value={livreurSelectionne}
                    onChange={(e) => setLivreurChoisi({ ...livreurChoisi, [c.id]: e.target.value })}
                    className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
                    style={{ fontSize: 18 }}
                  >
                    {livreurs.map((l) => (
                      <option key={l.id} value={l.id}>
                        🏍️ {l.nom} — {l.zone} ({l.tarifCourse} F)
                      </option>
                    ))}
                  </select>
                  <BoutonMboa
                    variant="primary"
                    className="w-full"
                    disabled={enCours === c.id}
                    onClick={() => validerEtEnvoyer(c, livreurSelectionne)}
                  >
                    {enCours === c.id ? t("adm.dev.envoi") : t("adm.dev.valider")}
                  </BoutonMboa>
                  <BoutonMboa
                    variant="error"
                    className="w-full"
                    disabled={enCours === c.id}
                    onClick={() => refuser(c)}
                  >
                    {t("adm.dev.refuser")}
                  </BoutonMboa>
                </div>
              )}
              {estNouveau && livreurs.length === 0 && (
                <p className="text-aide text-[var(--mboa-error)] mt-2">{t("adm.dev.sansLivreur")}</p>
              )}

              {c.livreurNom && (
                <p className="text-aide text-[var(--mboa-text-doux)] mt-2">
                  {t("adm.dev.livreur")} : {c.livreurNom}
                  {c.livreurTarif ? ` · ${formaterFcfa(c.livreurTarif)}` : ""}
                </p>
              )}
            </CarteMboa>
          );
        })}
      </div>
    </FondMboa>
  );
}
