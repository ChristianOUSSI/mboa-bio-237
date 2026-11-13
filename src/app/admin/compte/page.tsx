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

export default function AdminComptePage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
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
      setErreur("The two passwords do not match");
      return;
    }
    if (estMotDePasseInitial(nouveau)) {
      setErreur("The initial password cannot be reused");
      return;
    }
    setEnCours(true);
    try {
      const bon = await verifierMotDePasse(compte, actuel);
      if (!bon) {
        setErreur("Current password incorrect");
        return;
      }
      const maj = await changerMotDePasse(compte, nouveau);
      setCompte(maj);
      setActuel("");
      setNouveau("");
      setConfirmation("");
      setSucces("Password updated");
    } catch (e) {
      console.error(e);
      setErreur("Error while changing");
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
        `${n} account(s) deleted. The admin account was reset.`
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
      <EnTetePage titre="Account & security" onRetour={() => router.back()} />

      <div className="flex-1 p-4 space-y-3">
        {/* État du compte */}
        <CarteMboa className="card-accent">
          <h2 className="text-titre mb-2">Admin account</h2>
          {compte ? (
            <>
              <p className="text-corps">Name: {compte.nom}</p>
              <p className="text-aide text-[var(--mboa-text-doux)]">
                Initial password: to be changed
              </p>
              <p className="text-aide text-[var(--mboa-text-doux)]">
                Still default: {compte.motDePasseParDefaut ? "YES — change it now" : "no"}
              </p>
              <p className="text-aide text-[var(--mboa-text-doux)]">
                Active accounts: {nbComptes}
              </p>
            </>
          ) : (
            <p className="text-corps">Loading…</p>
          )}
        </CarteMboa>

        {compte?.motDePasseParDefaut && (
          <CarteMboa className="bg-[var(--mboa-error-doux)] anim-apparition">
            <p className="text-corps font-bold text-[var(--mboa-error)]">
              ⚠ Initial password never changed
            </p>
            <p className="text-aide text-[var(--mboa-error)] mt-1">
              Change it now to secure the counter.
            </p>
          </CarteMboa>
        )}

        {/* Changement de mot de passe */}
        <CarteMboa>
          <h2 className="text-titre mb-3">Change my password</h2>

          <label className="text-aide block mb-1">Current password</label>
          <input
            type="password"
            placeholder="••••••"
            value={actuel}
            onChange={(e) => setActuel(e.target.value)}
            className="champ-mboa mb-3"
            style={{ fontSize: 20 }}
          />

          <label className="text-aide block mb-1">New password</label>
          <input
            type="password"
            placeholder="6 characters minimum, with a digit"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            className="champ-mboa mb-3"
            style={{ fontSize: 20 }}
          />

          <label className="text-aide block mb-1">Confirm</label>
          <input
            type="password"
            placeholder="Re-type the password"
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
            {enCours ? "Saving..." : "Save"}
          </BoutonMboa>
        </CarteMboa>

        {/* Zone sensible */}
        <CarteMboa className="border-2 border-dashed border-[var(--mboa-error)]">
          <h2 className="text-titre mb-1">Zone sensible</h2>
          <p className="text-aide text-[var(--mboa-text-doux)] mb-3">
            Deletes all customer, supplier and driver accounts. The admin password
            goes back to its initial value.
          </p>
          {confirmPurge ? (
            <div className="flex gap-2">
              <BoutonMboa
                variant="error"
                onClick={purger}
                disabled={enCours}
                className="flex-1"
              >
                {enCours ? "Deleting..." : "Confirm"}
              </BoutonMboa>
              <BoutonMboa variant="surface" onClick={() => setConfirmPurge(false)} className="flex-1">
                Cancel
              </BoutonMboa>
            </div>
          ) : (
            <BoutonMboa
              variant="error"
              onClick={() => setConfirmPurge(true)}
              className="w-full"
            >
              🗑 Erase everything
            </BoutonMboa>
          )}
        </CarteMboa>
      </div>
    </FondMboa>
  );
}
