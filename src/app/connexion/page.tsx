"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { useLangue, useTr, Lang } from "@/core/i18n";
import { CarteMboa, BoutonMboa, FondMboa } from "@/core/design_system/composants";
import type { AppRole } from "@/core/config/app_env";
import {
  compteParIdentifiant,
  creerCompte,
  verifierMotDePasse,
  changerMotDePasse,
  doitChangerMotDePasse,
  amorcerSiAucunCompte,
  assurerCompteSuperAdmin,
} from "@/core/auth/auth_service";
import { synchroniserComptesAdmin } from "@/core/auth/synchro_admin";
import {
  normaliserTel,
  normaliserEmail,
  validerMotDePasse,
  IDENTIFIANT_SUPERADMIN,
  EMAIL_SUPERADMIN,
} from "@/core/auth/auth_local";
import { Profil } from "@/core/types/profil";
import { ouvrirSessionLocale } from "@/core/data/depots";

type Etape = "choix" | "splash" | "identifiant" | "inscription" | "nouveauMdp" | "compteAdmin" | "superadmin";

/** Ordre d'affichage des espaces : le client d'abord. */
const ROLES_ORDRE: AppRole[] = ["consommateur", "fournisseur", "livreur", "admin"];

/** Aliments qui flottent en arrière-plan de l'écran de connexion. */
const ALIMENTS_FLOTTANTS = [
  { emoji: "🍌", top: "6%", left: "6%", taille: 44, delai: "0s" },
  { emoji: "🍅", top: "12%", right: "8%", taille: 38, delai: "-1.5s" },
  { emoji: "🐟", top: "38%", left: "3%", taille: 42, delai: "-3s" },
  { emoji: "🌽", top: "55%", right: "4%", taille: 40, delai: "-2s" },
  { emoji: "🥭", top: "72%", left: "8%", taille: 36, delai: "-4.5s" },
  { emoji: "🥬", top: "82%", right: "10%", taille: 38, delai: "-1s", cliquable: true },
];

/** Emoji illustrant chaque espace. */
const ROLE_EMOJI: Record<AppRole, string> = {
  consommateur: "🛒",
  fournisseur: "🌾",
  livreur: "🛵",
  admin: "🏪",
  superadmin: "🫑",
};

/** Thème visuel du splash de chaque espace. */
const ROLE_THEME: Record<AppRole, { fond: string; halo: string }> = {
  consommateur: {
    fond: "linear-gradient(150deg, #4E9B47 0%, #2E7D32 55%, #1E5128 100%)",
    halo: "rgba(174, 213, 129, 0.5)",
  },
  fournisseur: {
    fond: "linear-gradient(150deg, #B8860B 0%, #8D6E1F 55%, #5C430F 100%)",
    halo: "rgba(255, 214, 130, 0.5)",
  },
  livreur: {
    fond: "linear-gradient(150deg, #1565C0 0%, #0D47A1 55%, #082F66 100%)",
    halo: "rgba(120, 180, 255, 0.5)",
  },
  admin: {
    fond: "linear-gradient(150deg, #5D4037 0%, #3E2723 55%, #241612 100%)",
    halo: "rgba(200, 160, 120, 0.45)",
  },
  superadmin: {
    fond: "linear-gradient(150deg, #4A148C 0%, #311B52 55%, #1B0B33 100%)",
    halo: "rgba(206, 147, 216, 0.4)",
  },
};

/** Emojis décoratifs qui flottent sur le splash de chaque espace. */
const ROLE_DECOR: Record<AppRole, { emoji: string; top: string; left?: string; right?: string; taille: number; delai: string }[]> = {
  consommateur: [
    { emoji: "🍌", top: "8%", left: "8%", taille: 34, delai: "0s" },
    { emoji: "🍅", top: "14%", right: "10%", taille: 30, delai: "-1.2s" },
    { emoji: "🥬", top: "70%", left: "12%", taille: 30, delai: "-2.4s" },
    { emoji: "🥭", top: "76%", right: "14%", taille: 28, delai: "-0.8s" },
  ],
  fournisseur: [
    { emoji: "🌾", top: "8%", left: "10%", taille: 36, delai: "0s" },
    { emoji: "🍅", top: "16%", right: "8%", taille: 30, delai: "-1.5s" },
    { emoji: "🐟", top: "68%", left: "14%", taille: 32, delai: "-2.8s" },
    { emoji: "🌽", top: "74%", right: "12%", taille: 30, delai: "-1s" },
  ],
  livreur: [
    { emoji: "🛵", top: "8%", left: "9%", taille: 36, delai: "0s" },
    { emoji: "📦", top: "15%", right: "9%", taille: 32, delai: "-1.3s" },
    { emoji: "🛣️", top: "70%", left: "12%", taille: 30, delai: "-2.2s" },
    { emoji: "⏱️", top: "76%", right: "13%", taille: 28, delai: "-0.6s" },
  ],
  admin: [
    { emoji: "🏪", top: "8%", left: "10%", taille: 34, delai: "0s" },
    { emoji: "📋", top: "15%", right: "9%", taille: 30, delai: "-1.4s" },
    { emoji: "✅", top: "70%", left: "13%", taille: 30, delai: "-2.5s" },
    { emoji: "🥬", top: "75%", right: "12%", taille: 28, delai: "-1s" },
  ],
  superadmin: [
    { emoji: "🫑", top: "8%", left: "10%", taille: 34, delai: "0s" },
    { emoji: "🔐", top: "16%", right: "9%", taille: 30, delai: "-1.3s" },
    { emoji: "👑", top: "70%", left: "13%", taille: 32, delai: "-2.4s" },
    { emoji: "🛡️", top: "76%", right: "12%", taille: 28, delai: "-0.9s" },
  ],
};

export default function PageConnexion() {
  const router = useRouter();
  const { setSession } = useSession();
  const { langue, setLangue } = useLangue();
  const t = useTr();
  const [etape, setEtape] = useState<Etape>("choix");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmationMdp, setConfirmationMdp] = useState("");
  const [nom, setNom] = useState("");
  const [village, setVillage] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [roleChoisi, setRoleChoisi] = useState<AppRole>("consommateur");
  const [modeInscription, setModeInscription] = useState<"telephone" | "email">("telephone");
  const [mdpParDefaut, setMdpParDefaut] = useState(false);

  // Bootstrap : sur une première installation (base vide), crée le compte admin
  // et le compte super admin caché.
  useEffect(() => {
    amorcerSiAucunCompte().catch((e) => console.error(e));
    assurerCompteSuperAdmin().catch((e) => console.error(e));
    // Récupère les comptes admin créés depuis d'autres appareils (PC/téléphone).
    synchroniserComptesAdmin().catch((e) => console.warn("[synchro]", e));
  }, []);

  /** Opens the local session from an authenticated account. */
  function ouvrirSession(compte: {
    id: string;
    role: string;
    nom: string;
    village: string;
    telephone: string | null;
  }): void {
    const profil: Profil = {
      id: compte.id,
      role: compte.role,
      nom: compte.nom,
      village: compte.village || "Douala",
      telephone: compte.telephone ?? "",
      langue: langue as never,
      actif: true,
    };
    ouvrirSessionLocale(profil).catch((e) => console.error(e));
    setSession(profil, compte.role as AppRole);
    router.push(`/${compte.role}`);
  }

  async function seConnecter() {
    const err = validerMotDePasse(motDePasse);
    if (!err.ok) {
      setErreur(err.message === "Password must be at least 6 characters" ? t("connex.erreurMdp") : t("connex.erreurMdpChiffre"));
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const compte = await compteParIdentifiant(identifiant);
      if (!compte) {
        setErreur(t("connex.erreurIntrouvable"));
        return;
      }
      if (!compte.actif) {
        setErreur(t("connex.erreurDesactive"));
        return;
      }
      const bon = await verifierMotDePasse(compte, motDePasse);
      if (!bon) {
        setErreur(t("connex.erreurMdpFaux"));
        return;
      }
      // Le compte admin de bootstrap (mdp par défaut) ne connecte jamais
      // directement : on force la création d'un compte admin personnel.
      if (compte.role === "admin" && compte.motDePasseParDefaut) {
        setMdpParDefaut(true);
        setEtape("compteAdmin");
        return;
      }
      // Nouveau mot de passe sur un autre appareil.
      if (doitChangerMotDePasse(compte)) {
        setEtape("nouveauMdp");
        return;
      }
      ouvrirSession(compte);
    } catch (e) {
      console.error(e);
      setErreur(t("connex.erreurGenerique"));
    } finally {
      setEnCours(false);
    }
  }

  async function enregistrer() {
    const err = validerMotDePasse(motDePasse);
    if (!err.ok) {
      setErreur(err.message === "Password must be at least 6 characters" ? t("connex.erreurMdp") : t("connex.erreurMdpChiffre"));
      return;
    }
    if (motDePasse !== confirmationMdp) {
      setErreur(t("connex.erreurMdpPaire"));
      return;
    }
    if (nom.trim().length === 0) {
      setErreur(t("insc.erreurNom"));
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const tel = modeInscription === "telephone" ? normaliserTel(identifiant) : null;
      const mail = modeInscription === "email" ? normaliserEmail(identifiant) : null;
      if (!tel && !mail) {
        setErreur(t("insc.erreurId"));
        return;
      }
      const compte = await creerCompte({
        role: roleChoisi,
        nom: nom.trim(),
        telephone: tel,
        email: mail,
        village: village.trim(),
        motDePasse,
      });
      ouvrirSession(compte);
    } catch (e) {
      console.error(e);
      setErreur(t("insc.erreurCreation"));
    } finally {
      setEnCours(false);
    }
  }

  async function appliquerNouveauMdp() {
    const err = validerMotDePasse(nouveauMdp);
    if (!err.ok) {
      setErreur(err.message === "Password must be at least 6 characters" ? t("connex.erreurMdp") : t("connex.erreurMdpChiffre"));
      return;
    }
    if (nouveauMdp !== confirmationMdp) {
      setErreur(t("connex.erreurMdpPaire"));
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const compte = await compteParIdentifiant(identifiant);
      if (!compte) {
        setErreur(t("mdp.compteIntrouvable"));
        return;
      }
      const maj = await changerMotDePasse(compte, nouveauMdp);
      ouvrirSession(maj);
    } catch (e) {
      console.error(e);
      setErreur(t("insc.erreurMdp"));
    } finally {
      setEnCours(false);
    }
  }

  /** Login avec le compte admin par défaut → crée un compte admin personnel. */
  async function creerCompteAdmin() {
    const mail = normaliserEmail(identifiant) ?? identifiant.trim().toLowerCase();
    if (nom.trim().length === 0 || !mail.includes("@")) {
      setErreur(t("adm.cpt.adminErreurMail"));
      return;
    }
    const err = validerMotDePasse(nouveauMdp);
    if (!err.ok) {
      setErreur(t("adm.cpt.adminErreurMdp"));
      return;
    }
    if (nouveauMdp !== confirmationMdp) {
      setErreur(t("connex.erreurMdpPaire"));
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const compte = await creerCompte({
        role: "admin",
        nom: nom.trim(),
        telephone: null,
        email: mail,
        village: village.trim() || "Douala",
        motDePasse: nouveauMdp,
      });
      ouvrirSession(compte);
    } catch (e) {
      console.error(e);
      setErreur(t("insc.erreurCreation"));
    } finally {
      setEnCours(false);
    }
  }

  /** Login super admin caché (chou 🥬 sur la page de connexion). */
  async function seConnecterSuper() {
    if (identifiant.trim().toUpperCase() !== IDENTIFIANT_SUPERADMIN) {
      setErreur(t("super.erreur"));
      return;
    }
    const err = validerMotDePasse(motDePasse);
    if (!err.ok) {
      setErreur(t("super.erreur"));
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const compte = await compteParIdentifiant(EMAIL_SUPERADMIN);
      if (!compte || compte.role !== "superadmin") {
        setErreur(t("super.erreur"));
        return;
      }
      const bon = await verifierMotDePasse(compte, motDePasse);
      if (!bon) {
        setErreur(t("super.erreur"));
        return;
      }
      ouvrirSession(compte);
    } catch (e) {
      console.error(e);
      setErreur(t("connex.erreurGenerique"));
    } finally {
      setEnCours(false);
    }
  }

  function allerConnexion() {
    setEtape("identifiant");
    setErreur(null);
    setMotDePasse("");
  }

  function allerInscription() {
    setEtape("inscription");
    setErreur(null);
    setMotDePasse("");
  }

  const labelIdentifiant =
    modeInscription === "email" ? t("insc.idLabel") : t("connex.idLabel");
  const placeholderIdentifiant =
    modeInscription === "email"
      ? "mama@example.com"
      : langue === "fr"
        ? "6XX XXX XXX ou email"
        : "6XX XXX XXX or email";

  return (
    <FondMboa>
      {/* Aliments flottants en arrière-plan */}
      {ALIMENTS_FLOTTANTS.map((a, i) => (
        <span
          key={i}
          className="aliment-flottant"
          style={{
            top: a.top,
            left: "left" in a ? a.left : undefined,
            right: "right" in a ? a.right : undefined,
            fontSize: a.taille,
            animationDelay: a.delai,
            ...("cliquable" in a && a.cliquable
              ? { pointerEvents: "auto", cursor: "pointer" }
              : {}),
          }}
          aria-hidden
          onClick={
            "cliquable" in a && a.cliquable
              ? () => {
                  setIdentifiant(IDENTIFIANT_SUPERADMIN);
                  setMotDePasse("");
                  setErreur(null);
                  setEtape("superadmin");
                }
              : undefined
          }
        >
          {a.emoji}
        </span>
      ))}

      {/* Header avec logo + sélecteur de langue */}
      <div className="entete-mboa flex flex-col items-center text-center p-6 relative overflow-hidden">
        <div
          className="halo-mboa"
          style={{ width: 200, height: 200, top: -50, right: -60, background: "rgba(174,213,129,0.35)" }}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mboa.jpeg"
          alt="MBOA BIO 237"
          className="w-24 h-24 object-contain rounded-2xl mb-3 relative z-10 anim-apparition-zoom"
          style={{ background: "white", padding: 6 }}
        />
        <h1 className="text-ecran text-white relative z-10">{t("app.nom")}</h1>
        <p className="text-aide text-white/90 relative z-10 italic">
          {t("app.slogan")}
        </p>
        <p className="text-aide text-white/70 relative z-10 mt-1">
          📍 {t("app.village")}
        </p>
        {/* Sélecteur de langue */}
        <div className="absolute top-4 right-4 z-20">
          <div className="selecteur-langue" role="group" aria-label={t("a11y.langue")}>
            {(["fr", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                className={langue === l ? "actif" : ""}
                onClick={() => setLangue(l)}
              >
                {l === "fr" ? "FR" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 pb-10 relative z-10">
        {etape === "choix" && (
          <div className="w-full max-w-md space-y-4 anim-apparition">
            <div className="text-center">
              <h2 className="text-titre">{t("choix.titre")}</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] italic mt-1">
                {t("choix.sousTitre")}
              </p>
            </div>

            {/* Grille des 4 espaces */}
            <div className="grid grid-cols-2 gap-3">
              {ROLES_ORDRE.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleChoisi(r);
                    setErreur(null);
                    setEtape("splash");
                  }}
                  className="carte-role"
                >
                  <div className="role-emojis-cercle">{ROLE_EMOJI[r]}</div>
                  <span className="block text-corps font-black text-[var(--mboa-primary)] leading-tight">
                    {t(`role.${r}.nom`)}
                  </span>
                </button>
              ))}
            </div>

            <Link href="/rejoindre" className="block">
              <BoutonMboa variant="secondary" className="w-full">
                👨‍🌾 {t("choix.rejoindre")}
              </BoutonMboa>
            </Link>

            {/* Puces rassurance */}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <span className="puce-info">📶 {t("plus.horsLigne")}</span>
              <span className="puce-info">🛵 {t("plus.livraison")}</span>
              <span className="puce-info">💵 {t("plus.paiement")}</span>
              <span className="puce-info">🌿 {t("plus.frais")}</span>
            </div>
          </div>
        )}

        {etape === "splash" && (
          <div
            className="splash-role anim-apparition-zoom w-full max-w-md"
            style={{ background: ROLE_THEME[roleChoisi].fond }}
          >
            <div
              className="halo-mboa"
              style={{
                width: 220,
                height: 220,
                top: -70,
                right: -70,
                background: ROLE_THEME[roleChoisi].halo,
              }}
              aria-hidden
            />
            {ROLE_DECOR[roleChoisi].map((d, i) => (
              <span
                key={i}
                className="aliment-flottant"
                style={{
                  top: d.top,
                  left: d.left,
                  right: d.right,
                  fontSize: d.taille,
                  animationDelay: d.delai,
                }}
                aria-hidden
              >
                {d.emoji}
              </span>
            ))}

            <div className="relative z-10 flex flex-col items-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-6xl mb-4"
                style={{ background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.45)" }}
              >
                {ROLE_EMOJI[roleChoisi]}
              </div>
              <h2 className="text-titre text-white">{t(`role.${roleChoisi}.nom`)}</h2>
              <p className="text-aide text-white/90 italic mt-2 leading-relaxed">
                {t(`role.${roleChoisi}.desc`)}
              </p>

              {roleChoisi === "livreur" && (
                <p className="alerte-splash mt-4">
                  🛵 {t("choix.note")}
                </p>
              )}

              <BoutonMboa variant="surface" onClick={allerConnexion} className="w-full mt-6">
                {t("choix.continuer")} →
              </BoutonMboa>
              <button
                onClick={() => setEtape("choix")}
                className="text-aide text-white/80 underline text-center w-full mt-3"
              >
                ← {t("connex.switch")}
              </button>
            </div>
          </div>
        )}

        {etape === "identifiant" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">{ROLE_EMOJI[roleChoisi]}</div>
              <h2 className="text-titre">{t(`role.${roleChoisi}.nom`)}</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] italic">
                {t("connex.sousTitre")}
              </p>
            </div>

            <label className="text-aide block mb-1 font-bold">{t("connex.idLabel")}</label>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder={placeholderIdentifiant}
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("connex.mdpLabel")}</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t("connex.mdpPlaceholder")}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse font-bold">{erreur}</p>
            )}

            <BoutonMboa onClick={seConnecter} disabled={enCours} className="w-full">
              {enCours ? t("connex.btnCours") : `→ ${t("connex.btn")}`}
            </BoutonMboa>

            {roleChoisi === "consommateur" && (
              <button
                onClick={allerInscription}
                className="text-aide text-[var(--mboa-primary)] underline text-center w-full mt-3 font-bold"
              >
                {t("connex.sansCompte")}
              </button>
            )}

            <button
              onClick={() => setEtape("choix")}
              className="text-aide text-[var(--mboa-text-doux)] underline text-center w-full mt-2"
            >
              ← {t("connex.switch")}
            </button>
          </CarteMboa>
        )}

        {etape === "inscription" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🛒</div>
              <h2 className="text-titre">{t("insc.titre")}</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] italic">
                {t("insc.sousTitre")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["telephone", "email"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModeInscription(m);
                    setIdentifiant("");
                  }}
                  className="p-3 rounded-xl text-aide font-bold transition-transform active:scale-95"
                  style={{
                    background: modeInscription === m ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                    border: `2px solid ${modeInscription === m ? "var(--mboa-primary)" : "transparent"}`,
                  }}
                >
                  {m === "telephone" ? `📱 ${t("insc.parTel")}` : `📧 ${t("insc.parMail")}`}
                </button>
              ))}
            </div>

            <label className="text-aide block mb-1 font-bold">{labelIdentifiant}</label>
            <input
              type="text"
              inputMode={modeInscription === "email" ? "email" : "tel"}
              autoComplete="username"
              placeholder={placeholderIdentifiant}
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.nomLabel")}</label>
            <input
              type="text"
              autoComplete="name"
              placeholder={t("insc.nomPlaceholder")}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.villageLabel")}</label>
            <input
              type="text"
              placeholder={t("insc.villagePlaceholder")}
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.mdpLabel")}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("insc.mdpPlaceholder")}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.mdpConfirmLabel")}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("insc.mdpConfirmPlaceholder")}
              value={confirmationMdp}
              onChange={(e) => setConfirmationMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse font-bold">{erreur}</p>
            )}

            <BoutonMboa onClick={enregistrer} disabled={enCours} className="w-full">
              {enCours ? t("insc.btnCours") : `✓ ${t("insc.btn")}`}
            </BoutonMboa>

            <button
              onClick={allerConnexion}
              className="text-aide text-[var(--mboa-primary)] underline text-center w-full mt-3 font-bold"
            >
              {t("insc.dejaCompte")}
            </button>
          </CarteMboa>
        )}

        {etape === "nouveauMdp" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🔐</div>
              <h2 className="text-titre">{t("mdp.titre")}</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] italic">
                {mdpParDefaut ? t("mdp.sousTitreDefaut") : t("mdp.sousTitreAppareil")}
              </p>
            </div>

            <label className="text-aide block mb-1 font-bold">{t("insc.mdpLabel")}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("insc.mdpPlaceholder")}
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.mdpConfirmLabel")}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("insc.mdpConfirmPlaceholder")}
              value={confirmationMdp}
              onChange={(e) => setConfirmationMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse font-bold">{erreur}</p>
            )}

            <BoutonMboa onClick={appliquerNouveauMdp} disabled={enCours} className="w-full">
              {enCours ? t("mdp.btnCours") : `🔒 ${t("mdp.btn")}`}
            </BoutonMboa>
          </CarteMboa>
        )}

        {etape === "compteAdmin" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🏪</div>
              <h2 className="text-titre">{t("adminCreate.titre")}</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] italic">
                {t("adminCreate.sousTitre")}
              </p>
            </div>

            <label className="text-aide block mb-1 font-bold">{t("insc.nomLabel")}</label>
            <input
              type="text"
              autoComplete="name"
              placeholder={t("insc.nomPlaceholder")}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("connex.idLabel")}</label>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="votre@email.com"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.mdpLabel")}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("insc.mdpPlaceholder")}
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1 font-bold">{t("insc.mdpConfirmLabel")}</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t("insc.mdpConfirmPlaceholder")}
              value={confirmationMdp}
              onChange={(e) => setConfirmationMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse font-bold">{erreur}</p>
            )}

            <BoutonMboa onClick={creerCompteAdmin} disabled={enCours} className="w-full">
              {enCours ? t("insc.btnCours") : `✓ ${t("adminCreate.btn")}`}
            </BoutonMboa>
          </CarteMboa>
        )}

        {etape === "superadmin" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🫑</div>
              <h2 className="text-titre">{t("super.titre")}</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] italic">
                {t("super.sousTitre")}
              </p>
            </div>

            <label className="text-aide block mb-1 font-bold">{t("super.idLabel")}</label>
            <input
              type="text"
              autoComplete="username"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value.toUpperCase())}
              className="champ-mboa mb-3"
              style={{ fontSize: 22, textTransform: "uppercase" }}
            />

            <label className="text-aide block mb-1 font-bold">{t("connex.mdpLabel")}</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t("connex.mdpPlaceholder")}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse font-bold">{erreur}</p>
            )}

            <BoutonMboa onClick={seConnecterSuper} disabled={enCours} className="w-full">
              {enCours ? t("connex.btnCours") : `→ ${t("super.btn")}`}
            </BoutonMboa>

            <button
              onClick={() => setEtape("choix")}
              className="text-aide text-[var(--mboa-text-doux)] underline text-center w-full mt-2"
            >
              ← {t("connex.switch")}
            </button>
          </CarteMboa>
        )}
      </div>
    </FondMboa>
  );
}
