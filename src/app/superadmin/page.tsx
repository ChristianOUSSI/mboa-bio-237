"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CarteMboa, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { tousComptes, majCompte, desactiverCompte, changerMotDePasse, verifierMotDePasse } from "@/core/auth/auth_service";
import { CompteAuth, validerMotDePasse } from "@/core/auth/auth_local";
import { synchroniserComptesAdmin } from "@/core/auth/synchro_admin";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useSession } from "@/core/etat/store";
import { useTr } from "@/core/i18n";

function roleLibelle(role: string, t: (k: string) => string): string {
  if (role === "admin") return t("super.roleAdmin");
  if (role === "superadmin") return t("super.roleSuper");
  return t("super.roleAutre");
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("superadmin");
  const { deconnexion } = useSession();
  const t = useTr();
  const [comptes, setComptes] = useState<CompteAuth[]>([]);
  const [edition, setEdition] = useState<string | null>(null);
  const [nomEdit, setNomEdit] = useState("");
  const [mdpEdit, setMdpEdit] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    await synchroniserComptesAdmin().catch(() => 0);
    setComptes(await tousComptes());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pret) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  async function enregistrer(c: CompteAuth) {
    setErreur(null);
    setSucces(null);
    if (mdpEdit.trim()) {
      const err = validerMotDePasse(mdpEdit);
      if (!err.ok) {
        setErreur(t("super.erreurMdp"));
        return;
      }
    }
    setEnCours(true);
    try {
      let maj: CompteAuth = c;
      if (nomEdit.trim() && nomEdit.trim() !== c.nom) {
        maj = await majCompte(maj, { nom: nomEdit.trim() });
      }
      if (mdpEdit.trim()) {
        maj = await changerMotDePasse(maj, mdpEdit);
      }
      setEdition(null);
      setNomEdit("");
      setMdpEdit("");
      setSucces(t("super.confirme"));
      await charger();
    } catch (e) {
      console.error(e);
      setErreur(t("connex.erreurGenerique"));
    } finally {
      setEnCours(false);
    }
  }

  async function basculerActif(c: CompteAuth) {
    setEnCours(true);
    try {
      if (c.actif) {
        await desactiverCompte(c);
      } else {
        await majCompte(c, { actif: true });
      }
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

  const tries = comptes.filter((c) => c.actif);

  return (
    <FondMboa>
      <EnTetePage
        titre={`👑 ${t("super.titrePage")}`}
        sousTitre={t("super.sousTitrePage")}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
      />

      <div className="flex-1 p-4 space-y-2">
        <p className="text-aide text-[var(--mboa-text-doux)]">
          {t("super.comptes")} : {tries.length} {t("super.actif")} / {comptes.length}
        </p>
        {comptes.length === 0 && (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">{t("super.vide")}</p>
          </CarteMboa>
        )}
        {comptes.map((c) => {
          const estSuper = c.role === "superadmin";
          const estMoi = profil?.id === c.id;
          const enEdition = edition === c.id;
          return (
            <CarteMboa key={c.id}>
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="text-corps font-bold">
                    {estSuper ? "👑 " : ""}{c.nom}
                    {estMoi ? " (vous)" : ""}
                  </span>
                  <p className="text-aide text-[var(--mboa-text-doux)]">
                    {roleLibelle(c.role, t)} · {c.email ?? (c.telephone ? `+${c.telephone}` : "-")}
                  </p>
                </div>
                <span
                  className={`text-aide px-2 py-1 rounded-full ${
                    c.actif
                      ? "bg-[var(--mboa-secondary-doux)] text-[var(--mboa-primary)]"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {c.actif ? t("super.actif") : t("super.inactif")}
                  {c.motDePasseParDefaut ? " · mdp défaut" : ""}
                </span>
              </div>

              {erreur && enEdition && <p className="text-[var(--mboa-error)] text-aide">{erreur}</p>}

              {enEdition ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder={`${t("super.nouveauNom")} (${c.nom})`}
                    value={nomEdit}
                    onChange={(e) => setNomEdit(e.target.value)}
                    className="champ-mboa"
                    style={{ fontSize: 18 }}
                  />
                  <input
                    type="password"
                    placeholder={t("super.nouveauMdp")}
                    value={mdpEdit}
                    onChange={(e) => setMdpEdit(e.target.value)}
                    className="champ-mboa"
                    style={{ fontSize: 18 }}
                  />
                  <div className="flex gap-2">
                    <BoutonMboa variant="primary" className="flex-1" disabled={enCours} onClick={() => enregistrer(c)}>
                      {t("super.appliquer")}
                    </BoutonMboa>
                    <BoutonMboa variant="surface" className="flex-1" onClick={() => { setEdition(null); setErreur(null); setSucces(null); }}>
                      {t("adm.cpt.annuler")}
                    </BoutonMboa>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <BoutonMboa
                    variant="surface"
                    className="flex-1"
                    onClick={() => {
                      setEdition(c.id);
                      setNomEdit(c.nom);
                      setMdpEdit("");
                      setErreur(null);
                      setSucces(null);
                    }}
                  >
                    ✏️ {t("super.renommer")}
                  </BoutonMboa>
                  {!estSuper && (
                    <BoutonMboa
                      variant={c.actif ? "error" : "primary"}
                      className="flex-1"
                      disabled={enCours}
                      onClick={() => basculerActif(c)}
                    >
                      {c.actif ? `⛔ ${t("super.revoquer")}` : `✓ ${t("super.reactiver")}`}
                    </BoutonMboa>
                  )}
                </div>
              )}
            </CarteMboa>
          );
        })}
        {succes && <p className="text-[var(--mboa-primary)] text-center font-bold">✅ {succes}</p>}
      </div>
    </FondMboa>
  );
}
