"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chargerLivreurs, sauverLivreur } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Livreur, livreurRepere } from "@/core/types/livreur";
import { creerCompte } from "@/core/auth/auth_service";
import { validerMotDePasse } from "@/core/auth/auth_local";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

interface FormulaireLivreur {
  nom: string;
  telephone: string;
  zone: string;
  moto: string;
  plaque: string;
  tarifCourse: string;
}

const FORMULAIRE_VIDE: FormulaireLivreur = {
  nom: "",
  telephone: "",
  zone: "",
  moto: "",
  plaque: "",
  tarifCourse: "500",
};

export default function LivreursAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [form, setForm] = useState<FormulaireLivreur>(FORMULAIRE_VIDE);
  const [mdpGenere, setMdpGenere] = useState<{ nom: string; telephone: string; mdp: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [modeCreation, setModeCreation] = useState(false);

  async function charger() {
    setLivreurs(await chargerLivreurs());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, []);

  /**
   * L'admin crée la fiche livreur ET son compte de connexion.
   * Le livreur n'a pas d'inscription libre : il reçoit ses identifiants.
   */
  async function creerLivreur() {
    setErreur(null);
    if (form.nom.trim().length === 0) {
      setErreur(t("adm.livr.erreurNom"));
      return;
    }
    if (form.telephone.replace(/\D/g, "").length < 9) {
      setErreur(t("adm.livr.erreurTel"));
      return;
    }
    if (form.zone.trim().length === 0) {
      setErreur(t("adm.livr.erreurZone"));
      return;
    }
    const tarif = parseInt(form.tarifCourse) || 0;

    setEnCours(true);
    try {
      await sauverLivreur({
        nom: form.nom.trim(),
        telephone: form.telephone.replace(/\D/g, ""),
        zone: form.zone.trim(),
        moto: form.moto.trim() || null,
        plaque: form.plaque.trim() || null,
        tarifCourse: tarif,
      });

      // Mot de passe provisoire, communiqué au livreur par le comptoir
      const mdp = `mboa${Math.floor(1000 + Math.random() * 9000)}`;
      const err = validerMotDePasse(mdp);
      if (err.ok) {
        const compte = await creerCompte({
          role: "livreur",
          nom: form.nom.trim(),
          telephone: form.telephone.replace(/\D/g, ""),
          email: null,
          village: form.zone.trim(),
          motDePasse: mdp,
        });
        setMdpGenere({
          nom: compte.nom,
          telephone: form.telephone.replace(/\D/g, ""),
          mdp,
        });
      }

      setForm(FORMULAIRE_VIDE);
      await charger();
    } catch (e) {
      console.error(e);
      setErreur(t("adm.livr.erreur"));
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
      <EnTetePage
        titre={t("adm.livr.titre")}
        sousTitre={t("adm.livr.sousTitre")}
        onRetour={() => router.back()}
      />

      <div className="flex-1 p-4 space-y-3">
        {/* Identifiants générés */}
        {mdpGenere && (
          <CarteMboa className="card-accent bg-[var(--mboa-secondary-doux)] anim-apparition">
            <p className="text-corps font-bold text-[var(--mboa-primary)] mb-1">
              🔑 {t("adm.livr.identifiants")} {mdpGenere.nom}
            </p>
            <p className="text-aide">{t("adm.livr.tel")} : +{mdpGenere.telephone}</p>
            <p className="text-aide">{t("adm.livr.mdp")} : {mdpGenere.mdp}</p>
            <p className="text-aide text-[var(--mboa-text-doux)] mt-1">
              {t("adm.livr.identifiantsNote")}
            </p>
            <button
              onClick={() => setMdpGenere(null)}
              className="text-aide text-[var(--mboa-primary)] underline mt-2"
            >
              {t("adm.livr.fermer")}
            </button>
          </CarteMboa>
        )}

        {/* Bouton création */}
        <BoutonMboa
          variant={modeCreation ? "surface" : "primary"}
          onClick={() => setModeCreation(!modeCreation)}
          className="w-full"
        >
          {modeCreation ? t("adm.livr.annulerCreation") : t("adm.livr.creer")}
        </BoutonMboa>

        {/* Formulaire de création */}
        {modeCreation && (
          <CarteMboa className="anim-apparition">
            <h2 className="text-titre mb-3">{t("adm.livr.nouveau")}</h2>

            <label className="text-aide block mb-1">{t("adm.livr.nom")}</label>
            <input
              type="text"
              placeholder={t("adm.livr.nomHint")}
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">{t("adm.livr.telLabel")}</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="6XX XXX XXX"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">{t("adm.livr.zone")}</label>
            <input
              type="text"
              placeholder="Douala et environs"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-aide block mb-1">{t("adm.livr.moto")}</label>
                <input
                  type="text"
                  placeholder={t("adm.livr.motoHint")}
                  value={form.moto}
                  onChange={(e) => setForm({ ...form, moto: e.target.value })}
                  className="champ-mboa"
                  style={{ fontSize: 18 }}
                />
              </div>
              <div>
                <label className="text-aide block mb-1">{t("adm.livr.plaque")}</label>
                <input
                  type="text"
                  placeholder={t("adm.livr.plaqueHint")}
                  value={form.plaque}
                  onChange={(e) => setForm({ ...form, plaque: e.target.value })}
                  className="champ-mboa"
                  style={{ fontSize: 18 }}
                />
              </div>
            </div>

            <label className="text-aide block mb-1">{t("adm.livr.tarif")}</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="500"
              value={form.tarifCourse}
              onChange={(e) => setForm({ ...form, tarifCourse: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse">
                {erreur}
              </p>
            )}

            <BoutonMboa onClick={creerLivreur} disabled={enCours} className="w-full">
              {enCours ? t("adm.livr.creation") : t("adm.livr.creerBtn")}
            </BoutonMboa>
          </CarteMboa>
        )}

        {/* Liste des livreurs */}
        {livreurs.length === 0 && !modeCreation && (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">
              {t("adm.livr.vide")}
            </p>
          </CarteMboa>
        )}
        {livreurs.map((l, i) => (
          <CarteMboa key={l.id} className="anim-apparition" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-corps font-bold">{l.nom}</span>
                <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.livr.zone2")} : {l.zone}</p>
                <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.livr.repere")} : {livreurRepere(l)}</p>
                {l.telephone && (
                  <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.livr.tel2")} : {l.telephone}</p>
                )}
                {l.plaque && (
                  <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.livr.plaque2")} : {l.plaque}</p>
                )}
                {l.tarifCourse > 0 && (
                  <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.livr.tarif2")} : {l.tarifCourse} F</p>
                )}
              </div>
              <BoutonVoix texte={`${l.nom}, ${t("adm.livr.zone2")} ${l.zone}. ${t("adm.livr.repere")} : ${livreurRepere(l)}`} />
            </div>
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}
