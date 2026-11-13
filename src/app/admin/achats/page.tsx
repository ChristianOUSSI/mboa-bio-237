"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toutesAchats, validerAchat, refuserAchat, payerAchat, profilParId } from "@/core/data/depots";
import { Profil } from "@/core/types/profil";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Achat, achatMontant, achatResume, achatEstPrise } from "@/core/types/achat";
import { STATUT_ACHAT_INFO } from "@/core/types/achat";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

export default function AchatsAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [profils, setProfils] = useState<Map<string, Profil>>(new Map());
  const [prixConvenance, setPrixConvenance] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);

  async function charger() {
    const liste = await toutesAchats();
    setAchats(liste);
    // Résout les noms des fournisseurs déclarants
    const map = new Map<string, Profil>();
    for (const a of liste) {
      if (a.fournisseurId && !map.has(a.fournisseurId) && !a.fournisseurId.startsWith("tel_")) {
        const p = await profilParId(a.fournisseurId);
        if (p) map.set(a.fournisseurId, p);
      }
    }
    setProfils(map);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, []);

  /** Mboa achète chez le fournisseur : la marchandise entre au stock. */
  async function signer(a: Achat) {
    const prix = parseInt(prixConvenance[a.id] ?? "") || a.prixDemande;
    setEnCours(a.id);
    try {
      await validerAchat(a.id, prix);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  function nomFournisseur(a: Achat): string {
    if (a.fournisseurId.startsWith("tel_")) {
      return `+${a.fournisseurId.slice(4)}`;
    }
    const p = profils.get(a.fournisseurId);
    return p ? `${p.nom}${p.village ? `, ${p.village}` : ""}` : a.fournisseurId;
  }

  async function refuser(a: Achat) {
    setEnCours(a.id);
    try {
      await refuserAchat(a.id);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  async function payer(a: Achat) {
    setEnCours(a.id);
    try {
      await payerAchat(a.id);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  const enAttente = achats.filter((a) => !achatEstPrise(a.statut) && a.statut !== "annule");
  const aPayer = achats.filter((a) => a.statut === "valide");

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
      <EnTetePage titre={t("adm.ach.titre")} sousTitre={t("adm.ach.sousTitre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-4">
        {/* Propositions en attente */}
        <h2 className="text-titre">{t("adm.ach.enAttente")} ({enAttente.length})</h2>
        {enAttente.length === 0 && (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">{t("adm.ach.vide")}</p>
          </CarteMboa>
        )}
        {enAttente.map((a) => (
          <CarteMboa key={a.id}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <BoutonVoix texte={achatResume(a)} />
                <div>
                  <span className="text-corps font-bold">{a.nom}</span>
                  <p className="text-aide text-[var(--mboa-text-doux)]">{a.quantite} {a.unite}</p>
                </div>
              </div>
              <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(achatMontant(a))}</span>
            </div>
            <BadgeStatut statut={a.statut} libelle={STATUT_ACHAT_INFO[a.statut].libelle} />
            <p className="text-aide text-[var(--mboa-text-doux)] mt-1">
              {t("adm.ach.vendeur")} : {nomFournisseur(a)}
            </p>
            {a.photoUrl && (
              <img src={a.photoUrl} alt={a.nom} className="w-full h-32 object-cover rounded-xl my-2" />
            )}
            {/* Prix d'achat négocié : Mboa achète à prix réduit en quantité */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-aide text-[var(--mboa-text-doux)] whitespace-nowrap">{t("adm.ach.prixConvenance")}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(a.prixDemande)}
                value={prixConvenance[a.id] ?? ""}
                onChange={(e) => setPrixConvenance({ ...prixConvenance, [a.id]: e.target.value })}
                className="flex-1 p-2 border-2 border-[var(--mboa-primary)] rounded-xl text-center"
                style={{ fontSize: 18 }}
              />
              <span className="text-aide text-[var(--mboa-text-doux)]">F / {a.unite}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <BoutonMboa
                variant="primary"
                className="flex-1"
                disabled={enCours === a.id}
                onClick={() => signer(a)}
              >
                {t("adm.ach.acheter")}
              </BoutonMboa>
              <BoutonMboa
                variant="error"
                className="flex-1"
                disabled={enCours === a.id}
                onClick={() => refuser(a)}
              >
                {t("adm.ach.refuser")}
              </BoutonMboa>
            </div>
          </CarteMboa>
        ))}

        {/* Marchandise achetée, à payer au fournisseur */}
        {aPayer.length > 0 && (
          <>
            <h2 className="text-titre">{t("adm.ach.aPayer")} ({aPayer.length})</h2>
            {aPayer.map((a) => (
              <CarteMboa key={a.id}>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-corps font-bold">{a.nom}</span>
                    <p className="text-aide text-[var(--mboa-text-doux)]">
                      {a.quantite} {a.unite} · {STATUT_ACHAT_INFO[a.statut].libelle} · {nomFournisseur(a)}
                    </p>
                  </div>
                  <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(achatMontant(a))}</span>
                </div>
                <BoutonMboa
                  variant="primary"
                  className="w-full"
                  disabled={enCours === a.id}
                  onClick={() => payer(a)}
                >
                  {enCours === a.id ? t("adm.ach.paiement") : t("adm.ach.payer")}
                </BoutonMboa>
              </CarteMboa>
            ))}
          </>
        )}
      </div>
    </FondMboa>
  );
}
