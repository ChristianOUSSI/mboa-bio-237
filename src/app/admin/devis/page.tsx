"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toutesCommandes, chargerLivreurs, validerDevis, assignerLivreur, refuserDevis } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { Livreur } from "@/core/types/livreur";
import { STATUT_COMMANDE_INFO, StatutCommande } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { resumerQuantites } from "@/core/types/commande";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

/** Exporte les commandes en CSV (Excel/LibreOffice) pour la compta. */
function exporterCsv(commandes: Commande[]) {
  const lignes = [
    ["id", "date", "client", "quartier", "livraison_detail", "telephone", "produits", "montant_fcfa", "frais_livraison_fcfa", "statut", "livreur", "paiement"].join(";"),
    ...commandes.map((c) =>
      [
        c.id,
        c.createdLe,
        `"${(c.clientNom ?? "").replace(/"/g, '""')}"`,
        `"${(c.livraisonQuartier ?? "").replace(/"/g, '""')}"`,
        `"${(c.livraisonDetail ?? "").replace(/"/g, '""')}"`,
        c.clientTel ?? c.numeroContact ?? "",
        `"${resumerQuantites(c.lignes).replace(/"/g, '""')}"`,
        commandeMontantAPayer(c),
        c.fraisLivraison ?? "",
        STATUT_COMMANDE_INFO[c.statut].libelle,
        `"${(c.livreurNom ?? "").replace(/"/g, '""')}"`,
        c.paiement ?? "",
      ].join(";"),
    ),
  ];
  const blob = new Blob(["﻿" + lignes.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commandes-mboa-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);

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
      <div className="px-4 pt-2">
        <BoutonMboa variant="surface" className="w-full !min-h-[44px]" onClick={() => exporterCsv(commandes)} disabled={commandes.length === 0}>
          📊 {t("adm.dev.exporter")}
        </BoutonMboa>
      </div>
      <div className="flex-1 p-4 space-y-2">
        {commandes.length === 0 && (
          <div className="etat-vide">
            <span className="emoji-vide">📝</span>
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
              {(c.fraisLivraison ?? 0) > 0 && (
                <p className="text-aide text-[var(--mboa-text-doux)]">
                  {t("panier.produits")} {formaterFcfa(c.montantTotal)} + {t("panier.livraison").toLowerCase()} {formaterFcfa(c.fraisLivraison ?? 0)}
                </p>
              )}

              {/* Validation : choix du livreur puis envoi */}
              {estNouveau && livreurs.length > 0 && (
                <div className="mt-2 space-y-2">
                  <select
                    value={livreurSelectionne}
                    onChange={(e) => setLivreurChoisi({ ...livreurChoisi, [c.id]: e.target.value })}
                    className="champ-mboa w-full"
                    style={{ fontSize: 18 }}
                  >
                    {livreurs.map((l) => (
                      <option key={l.id} value={l.id}>
                        🏍️ {l.nom} - {l.zone} ({l.tarifCourse} F)
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

              {(c.clientNom || c.clientVillage) && (
                <p className="text-aide mt-1 text-[var(--mboa-text-doux)]">
                  👤 {c.clientNom}
                  {c.clientVillage ? ` · ${c.clientVillage}` : ""}
                  {c.clientTel ? ` · ${c.clientTel}` : ""}
                </p>
              )}

              {(c.livraisonQuartier || c.livraisonDetail) && (
                <p className="text-aide mt-1" style={{ color: "var(--mboa-primary)" }}>
                  📍 {c.livraisonQuartier}
                  {c.livraisonDetail ? ` - ${c.livraisonDetail}` : ""}
                </p>
              )}

              {c.appelSouhaite && (
                <p className="text-aide mt-2 font-bold" style={{ color: "var(--mboa-primary)" }}>
                  📞 {t("adm.dev.appelAvant")}
                  {c.numeroContact ? ` : ${c.numeroContact}` : ""}
                </p>
              )}
            </CarteMboa>
          );
        })}
      </div>
    </FondMboa>
  );
}
