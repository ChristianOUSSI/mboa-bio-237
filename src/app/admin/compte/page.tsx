"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CarteMboa, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import {
  assurerCompteAdmin,
  changerMotDePasse,
  effacerTousComptes,
  reinitialiserAdmin,
  tousComptes,
  verifierMotDePasse,
} from "@/core/auth/auth_service";
import { CompteAuth, estMotDePasseInitial, validerMotDePasse } from "@/core/auth/auth_local";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

export default function AdminComptePage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [compte, setCompte] = useState<CompteAuth | null>(null);
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [nbComptes, setNbComptes] = useState(0);

  async function charger() {
    const admin = await assurerCompteAdmin();
    setCompte(admin);
    const comptes = await tousComptes();
    setNbComptes(comptes.filter((c) => c.actif).length);
  }

  useEffect(() => {
    // Ne crée/lit le compte admin que si la session admin est confirmée.
    if (pret) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      charger();
    }
  }, [pret]);

  async function enregistrerMdp() {
    setErreur(null);
    setSucces(null);
    if (!compte) return;

    const err = validerMotDePasse(nouveau);
    if (!err.ok) {
      setErreur(err.message);
      return;
    }
    if (nouveau !== confirmation) {
      setErreur(t("adm.cpt.erreurNonCorrespond"));
      return;
    }
    if (estMotDePasseInitial(nouveau)) {
      setErreur(t("adm.cpt.erreurInitial"));
      return;
    }
    setEnCours(true);
    try {
      const bon = await verifierMotDePasse(compte, actuel);
      if (!bon) {
        setErreur(t("adm.cpt.erreurActuel"));
        return;
      }
      const maj = await changerMotDePasse(compte, nouveau);
      setCompte(maj);
      setActuel("");
      setNouveau("");
      setConfirmation("");
      setSucces(t("adm.cpt.succes"));
    } catch (e) {
      console.error(e);
      setErreur(t("adm.cpt.erreur"));
    } finally {
      setEnCours(false);
    }
  }

  async function purger() {
    setEnCours(true);
    try {
      const n = await effacerTousComptes();
      const admin = await reinitialiserAdmin();
      setCompte(admin);
      setConfirmPurge(false);
      setSucces(
        t("adm.cpt.purge").replace("{n}", String(n))
      );
      await charger();
    } finally {
      setEnCours(false);
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
      <EnTetePage titre={t("adm.compte")} onRetour={() => router.back()} />

      <div className="flex-1 p-4 space-y-3">
        {/* État du compte */}
        <CarteMboa className="card-accent">
          <h2 className="text-titre mb-2">{t("adm.cpt.titre")}</h2>
          {compte ? (
            <>
              <p className="text-corps">{t("adm.cpt.nom")} : {compte.nom}</p>
              <p className="text-aide text-[var(--mboa-text-doux)]">
                {t("adm.cpt.mdpInitial")}
              </p>
              <p className="text-aide text-[var(--mboa-text-doux)]">
                {t("adm.cpt.toujoursDefaut")} : {compte.motDePasseParDefaut ? t("adm.cpt.oui") : t("adm.cpt.non")}
              </p>
              <p className="text-aide text-[var(--mboa-text-doux)]">
                {t("adm.cpt.comptesActifs")} : {nbComptes}
              </p>
            </>
          ) : (
            <p className="text-corps">{t("chargement")}</p>
          )}
        </CarteMboa>

        {compte?.motDePasseParDefaut && (
          <CarteMboa className="bg-[var(--mboa-error-doux)] anim-apparition">
            <p className="text-corps font-bold text-[var(--mboa-error)]">
              {t("adm.cpt.alerte")}
            </p>
            <p className="text-aide text-[var(--mboa-error)] mt-1">
              {t("adm.cpt.alerte2")}
            </p>
          </CarteMboa>
        )}

        {/* Changement de mot de passe */}
        <CarteMboa>
          <h2 className="text-titre mb-3">{t("adm.cpt.changerTitre")}</h2>

          <label className="text-aide block mb-1">{t("adm.cpt.actuel")}</label>
          <input
            type="password"
            placeholder="••••••"
            value={actuel}
            onChange={(e) => setActuel(e.target.value)}
            className="champ-mboa mb-3"
            style={{ fontSize: 20 }}
          />

          <label className="text-aide block mb-1">{t("adm.cpt.nouveau")}</label>
          <input
            type="password"
            placeholder={t("adm.cpt.nouveauHint")}
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            className="champ-mboa mb-3"
            style={{ fontSize: 20 }}
          />

          <label className="text-aide block mb-1">{t("adm.cpt.confirm")}</label>
          <input
            type="password"
            placeholder={t("adm.cpt.confirmHint")}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="champ-mboa mb-3"
            style={{ fontSize: 20 }}
          />

          {erreur && (
            <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse">{erreur}</p>
          )}
          {succes && (
            <p className="text-[var(--mboa-primary)] text-aide mb-2 text-center anim-apparition">
              ✅ {succes}
            </p>
          )}

          <BoutonMboa onClick={enregistrerMdp} disabled={enCours} className="w-full">
            {enCours ? t("adm.cpt.sauvegarde") : t("adm.cpt.enregistrer")}
          </BoutonMboa>
        </CarteMboa>

        {/* Zone sensible */}
        <CarteMboa className="border-2 border-dashed border-[var(--mboa-error)]">
          <h2 className="text-titre mb-1">{t("adm.cpt.zone")}</h2>
          <p className="text-aide text-[var(--mboa-text-doux)] mb-3">
            {t("adm.cpt.zoneTexte")}
          </p>
          {confirmPurge ? (
            <div className="flex gap-2">
              <BoutonMboa
                variant="error"
                onClick={purger}
                disabled={enCours}
                className="flex-1"
              >
                {enCours ? t("adm.cpt.suppression") : t("adm.cpt.confirmer")}
              </BoutonMboa>
              <BoutonMboa variant="surface" onClick={() => setConfirmPurge(false)} className="flex-1">
                {t("adm.cpt.annuler")}
              </BoutonMboa>
            </div>
          ) : (
            <BoutonMboa
              variant="error"
              onClick={() => setConfirmPurge(true)}
              className="w-full"
            >
              {t("adm.cpt.toutEffacer")}
            </BoutonMboa>
          )}
        </CarteMboa>
      </div>
    </FondMboa>
  );
}
