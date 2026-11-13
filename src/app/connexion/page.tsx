"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { CarteMboa, BoutonMboa, FondMboa } from "@/core/design_system/composants";
import { APP_ROLE_INFO, AppRole } from "@/core/config/app_env";
import {
  compteParIdentifiant,
  creerCompte,
  verifierMotDePasse,
  changerMotDePasse,
  doitChangerMotDePasse,
  amorcerSiAucunCompte,
} from "@/core/auth/auth_service";
import {
  normaliserTel,
  normaliserEmail,
  validerMotDePasse,
} from "@/core/auth/auth_local";
import { Profil } from "@/core/types/profil";

type Etape = "choix" | "identifiant" | "inscription" | "nouveauMdp";

export default function PageConnexion() {
  const router = useRouter();
  const { setSession } = useSession();
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

  // Bootstrap : sur une première installation (base vide), crée le compte admin.
  useEffect(() => {
    amorcerSiAucunCompte().catch((e) => console.error(e));
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
      village: compte.village || "Mbouda",
      telephone: compte.telephone ?? "",
      langue: "en" as never,
      actif: true,
    };
    setSession(profil, compte.role as AppRole);
    router.push(`/${compte.role}`);
  }

  async function seConnecter() {
    const err = validerMotDePasse(motDePasse);
    if (!err.ok) {
      setErreur(err.message);
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const compte = await compteParIdentifiant(identifiant);
      if (!compte) {
        setErreur("No account with this ID. Create your account.");
        return;
      }
      if (!compte.actif) {
        setErreur("This account is disabled. Contact the MBOA counter.");
        return;
      }
      const bon = await verifierMotDePasse(compte, motDePasse);
      if (!bon) {
        setErreur("Incorrect password");
        return;
      }
      // Default password unchanged → forced change.
      // L'admin doit changer même sur l'appareil du comptoir (sinon admin123
      // resterait valide indéfiniment sur l'appareil principal).
      const forcerChangement =
        doitChangerMotDePasse(compte) ||
        (compte.role === "admin" && compte.motDePasseParDefaut);
      if (forcerChangement) {
        setMdpParDefaut(true);
        setEtape("nouveauMdp");
        return;
      }
      ouvrirSession(compte);
    } catch (e) {
      console.error(e);
      setErreur("Sign-in error");
    } finally {
      setEnCours(false);
    }
  }

  async function enregistrer() {
    const err = validerMotDePasse(motDePasse);
    if (!err.ok) {
      setErreur(err.message);
      return;
    }
    if (motDePasse !== confirmationMdp) {
      setErreur("The two passwords do not match");
      return;
    }
    if (nom.trim().length === 0) {
      setErreur("Your name is required");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const tel = modeInscription === "telephone" ? normaliserTel(identifiant) : null;
      const mail = modeInscription === "email" ? normaliserEmail(identifiant) : null;
      if (!tel && !mail) {
        setErreur("Invalid ID");
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
      setErreur("Error creating the account");
    } finally {
      setEnCours(false);
    }
  }

  async function appliquerNouveauMdp() {
    const err = validerMotDePasse(nouveauMdp);
    if (!err.ok) {
      setErreur(err.message);
      return;
    }
    if (nouveauMdp !== confirmationMdp) {
      setErreur("The two passwords do not match");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const compte = await compteParIdentifiant(identifiant);
      if (!compte) {
        setErreur("Account not found");
        return;
      }
      const maj = await changerMotDePasse(compte, nouveauMdp);
      ouvrirSession(maj);
    } catch (e) {
      console.error(e);
      setErreur("Error while changing password");
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
    modeInscription === "email" ? "Your email address" : "Your phone number";
  const placeholderIdentifiant =
    modeInscription === "email" ? "mama@example.com" : "6XX XXX XXX";

  return (
    <FondMboa>
      {/* Header with logo */}
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
        <h1 className="text-ecran text-white relative z-10">MBOA BIO 237</h1>
        <p className="text-aide text-white/80 relative z-10">
          The earth feeds us, quality sets us apart
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 pb-10">
        {etape === "choix" && (
          <div className="w-full max-w-md space-y-3 anim-apparition">
            <CarteMboa>
              <h2 className="text-titre text-center mb-1">Which space?</h2>
              <p className="text-aide text-[var(--mboa-text-doux)] text-center mb-4">
                The counter sells. The customer buys. The driver delivers.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(APP_ROLE_INFO) as AppRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRoleChoisi(r);
                      setEtape("identifiant");
                    }}
                    className="p-3 rounded-xl border-2 text-aide transition-transform active:scale-95"
                    style={{
                      borderColor: roleChoisi === r ? "var(--mboa-primary)" : "transparent",
                      background: roleChoisi === r ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                      color: "var(--mboa-text)",
                    }}
                  >
                    <span className="block font-bold">{APP_ROLE_INFO[r].appName}</span>
                    <span className="block text-[var(--mboa-text-doux)]">{APP_ROLE_INFO[r].description}</span>
                  </button>
                ))}
              </div>
            </CarteMboa>

            <Link href="/rejoindre" className="block text-center">
              <BoutonMboa variant="secondary" className="w-full">
                👨‍🌾 Selling? Become a supplier
              </BoutonMboa>
            </Link>
            <p className="text-aide text-center text-[var(--mboa-text-doux)]">
              The driver receives their account directly from the MBOA counter.
            </p>
          </div>
        )}

        {etape === "identifiant" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <h2 className="text-titre mb-1 text-center">{APP_ROLE_INFO[roleChoisi].appName}</h2>
            <p className="text-aide text-[var(--mboa-text-doux)] text-center mb-4">
              Sign in with your phone or email
            </p>

            <label className="text-aide block mb-1">Phone or email address</label>
            <input
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="6XX XXX XXX or email"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            <label className="text-aide block mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse">{erreur}</p>
            )}

            <BoutonMboa onClick={seConnecter} disabled={enCours} className="w-full">
              {enCours ? "Signing in..." : "Sign in"}
            </BoutonMboa>

            {roleChoisi === "consommateur" && (
              <button
                onClick={allerInscription}
                className="text-aide text-[var(--mboa-primary)] underline text-center w-full mt-3"
              >
                No account yet? Create my account
              </button>
            )}

            <button
              onClick={() => setEtape("choix")}
              className="text-aide text-[var(--mboa-text-doux)] underline text-center w-full mt-2"
            >
              Switch space
            </button>
          </CarteMboa>
        )}

        {etape === "inscription" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <h2 className="text-titre mb-1 text-center">Create my account</h2>
            <p className="text-aide text-[var(--mboa-text-doux)] text-center mb-4">
              MBOA BIO customer — quick sign-up
            </p>

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
                  {m === "telephone" ? "📱 Phone" : "📧 Email"}
                </button>
              ))}
            </div>

            <label className="text-aide block mb-1">{labelIdentifiant}</label>
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

            <label className="text-aide block mb-1">Your name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="E.g.: Mama Elise"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">Your village (optional)</label>
            <input
              type="text"
              placeholder="E.g.: Mbouda"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="6 characters minimum, with a digit"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">Confirm password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Re-type the password"
              value={confirmationMdp}
              onChange={(e) => setConfirmationMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse">{erreur}</p>
            )}

            <BoutonMboa onClick={enregistrer} disabled={enCours} className="w-full">
              {enCours ? "Creating..." : "Create my account"}
            </BoutonMboa>

            <button
              onClick={allerConnexion}
              className="text-aide text-[var(--mboa-primary)] underline text-center w-full mt-3"
            >
              I already have an account
            </button>
          </CarteMboa>
        )}

        {etape === "nouveauMdp" && (
          <CarteMboa className="w-full max-w-md anim-apparition">
            <div className="text-5xl text-center mb-2">🔐</div>
            <h2 className="text-titre text-center mb-1">New password</h2>
            <p className="text-aide text-[var(--mboa-text-doux)] text-center mb-4">
              {mdpParDefaut
                ? "First sign-in on this device. The initial password must be changed."
                : "You signed in on a new device. Confirm your password."}
            </p>

            <label className="text-aide block mb-1">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="6 characters minimum, with a digit"
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">Confirm password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Re-type the password"
              value={confirmationMdp}
              onChange={(e) => setConfirmationMdp(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse">{erreur}</p>
            )}

            <BoutonMboa onClick={appliquerNouveauMdp} disabled={enCours} className="w-full">
              {enCours ? "Saving..." : "Confirm"}
            </BoutonMboa>
          </CarteMboa>
        )}
      </div>
    </FondMboa>
  );
}
