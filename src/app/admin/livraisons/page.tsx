"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toutesCommandes, payerLivreur } from "@/core/data/depots";
import { etatLire, etatEcrire } from "@/core/data/base_locale";
import { lireParametre, ecrireParametre } from "@/core/data/parametres";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { STATUT_COMMANDE_INFO, StatutCommande } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { resumerQuantites } from "@/core/types/commande";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

const CLE_PAYES = "livreurs_payes";
const CLE_FRAIS = "frais_livraison";
const FRAIS_LIVRAISON_DEFAUT = 500;

export default function LivraisonsPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [payes, setPayes] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState<string | null>(null);
  const [fraisSaisie, setFraisSaisie] = useState("");
  const [fraisSauve, setFraisSauve] = useState(false);

  async function charger() {
    const [c, p, f] = await Promise.all([
      toutesCommandes(),
      etatLire<string[]>(CLE_PAYES),
      lireParametre<number>(CLE_FRAIS, FRAIS_LIVRAISON_DEFAUT),
    ]);
    setCommandes(c);
    setPayes(new Set(p ?? []));
    setFraisSaisie(String(f ?? FRAIS_LIVRAISON_DEFAUT));
  }

  async function sauverFrais() {
    const n = parseInt(fraisSaisie, 10);
    if (!Number.isFinite(n) || n < 0) return;
    await ecrireParametre(CLE_FRAIS, n);
    setFraisSauve(true);
    setTimeout(() => setFraisSauve(false), 2000);
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
        {/* Tarif de livraison : fixé par l'admin, lu par le panier client */}
        <CarteMboa>
          <p className="text-corps font-bold mb-2">🛵 {t("adm.liv.frais")}</p>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={fraisSaisie}
              onChange={(e) => setFraisSaisie(e.target.value)}
              placeholder="500"
              className="flex-1 p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
              style={{ fontSize: 18 }}
            />
            <BoutonMboa variant="primary" onClick={sauverFrais}>
              {fraisSauve ? "✓" : t("adm.liv.fraisSauve")}
            </BoutonMboa>
          </div>
          <p className="text-aide text-[var(--mboa-text-doux)] mt-1">{t("adm.liv.fraisHint")}</p>
        </CarteMboa>
        <h2 className="text-titre titre-section">{t("adm.liv.aPayer")} ({aPayer.length})</h2>
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
              {(c.livraisonQuartier || c.livraisonDetail) && (
                <p className="text-aide mt-1" style={{ color: "var(--mboa-primary)" }}>
                  📍 {c.livraisonQuartier}
                  {c.livraisonDetail ? ` - ${c.livraisonDetail}` : ""}
                </p>
              )}
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
            <h2 className="text-titre titre-section">{t("adm.liv.enCours")} ({enCours2.length})</h2>
            {enCours2.map((c) => (
              <CarteMboa key={c.id}>
                <div className="flex justify-between items-start mb-2">
                  <BadgeStatut statut={c.statut} libelle={STATUT_COMMANDE_INFO[c.statut].libelle} />
                  <span className="text-chiffre text-[var(--mboa-primary)]">
                    {formaterFcfa(commandeMontantAPayer(c))}
                  </span>
                </div>
                <p className="text-corps">{resumerQuantites(c.lignes)}</p>
                {(c.livraisonQuartier || c.livraisonDetail) && (
                  <p className="text-aide mt-1" style={{ color: "var(--mboa-primary)" }}>
                    📍 {c.livraisonQuartier}
                    {c.livraisonDetail ? ` - ${c.livraisonDetail}` : ""}
                  </p>
                )}
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
