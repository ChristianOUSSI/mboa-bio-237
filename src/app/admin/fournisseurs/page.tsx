"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chargerFournisseurs, basculerFournisseurActif, supprimerFournisseur, refuserFournisseur, sauverFournisseur, envoyerMessageChat } from "@/core/data/depots";
import { creerCompte, compteParIdentifiant, changerMotDePasse, majCompte } from "@/core/auth/auth_service";
import { validerMotDePasse } from "@/core/auth/auth_local";
import { CarteMboa, EnTetePage, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { Fournisseur, fournisseurProduction, fournisseurLie } from "@/core/types/fournisseur";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

export default function FournisseursAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [confirmSuppr, setConfirmSuppr] = useState<string | null>(null);
  const [aNotifier, setANotifier] = useState<{ f: Fournisseur; valide: boolean; identifiant?: string; mdp?: string } | null>(null);

  async function charger() { setFournisseurs(await chargerFournisseurs()); }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);
  // Tirer vers le bas depuis le haut = recharger la page.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

  async function supprimer(f: Fournisseur) {
    await supprimerFournisseur(f.id);
    setConfirmSuppr(null);
    await charger();
  }

  /** À l'approbation, crée (ou réinitialise) le compte fournisseur :
   *  identifiant = téléphone, mot de passe provisoire à changer à la
   *  première connexion. Renvoie les identifiants pour WhatsApp. */
  async function creerAccesFournisseur(f: Fournisseur): Promise<{ identifiant: string; mdp: string } | null> {
    try {
      const mdp = `mboa${Math.floor(1000 + Math.random() * 9000)}`;
      if (!validerMotDePasse(mdp).ok) return null;
      const identifiant = f.telephone.replace(/\D/g, "");
      let compte = await compteParIdentifiant(identifiant);
      if (compte) {
        // Compte existant (ex. consumer avec le même numéro) : on lui
        // donne un mot de passe provisoire et on le passe en fournisseur.
        await changerMotDePasse(compte, mdp);
        compte = await majCompte(compte, { role: "fournisseur", motDePasseParDefaut: true });
      } else {
        compte = await creerCompte({
          role: "fournisseur",
          nom: f.nom,
          telephone: identifiant,
          email: null,
          village: f.village,
          motDePasse: mdp,
          motDePasseParDefaut: true,
        });
      }
      // Lie la fiche fournisseur au compte : sans ce lien, l'espace
      // fournisseur reste bloqué même après approbation.
      await sauverFournisseur({
        id: f.id,
        nom: f.nom,
        telephone: f.telephone,
        whatsapp: f.whatsapp ?? null,
        village: f.village,
        productionCategorie: f.productionCategorie ?? null,
        productionLibre: f.productionLibre,
        unite: f.unite,
        photo: f.photo ?? null,
        actif: true,
        lienCompteId: compte.id,
      });
      // Identifiants aussi envoyés par le chat : visibles dans /messages
      // dès la première connexion du fournisseur.
      if (profil) {
        void envoyerMessageChat({
          expediteur: profil,
          destinataireId: compte.id,
          destinataireRole: "fournisseur",
          texte: `Bonjour ${f.nom}, votre espace fournisseur MBOA BIO 237 est prêt ! Identifiant : ${identifiant} - Mot de passe provisoire : ${mdp} (vous devrez en choisir un nouveau à la première connexion). À bientôt !`,
        }).catch(() => {});
      }
      return { identifiant, mdp };
    } catch (e) {
      console.error("création accès fournisseur", e);
      return null;
    }
  }

  async function basculer(f: Fournisseur, actif: boolean) {
    await basculerFournisseurActif(f.id, actif);
    let creds: { identifiant: string; mdp: string } | null = null;
    if (actif && !f.profilId) creds = await creerAccesFournisseur(f);
    setANotifier({ f, valide: actif, identifiant: creds?.identifiant, mdp: creds?.mdp });
    await charger();
  }

  async function refuser(f: Fournisseur) {
    await refuserFournisseur(f.id);
    setANotifier({ f, valide: false });
    await charger();
  }

  /** Lien WhatsApp pré-rempli vers le numéro du candidat (whatsapp dédié
   *  ou téléphone principal). Format international 237 par défaut. */
  function lienWhatsapp(f: Fournisseur, valide: boolean, identifiant?: string, mdp?: string): string | null {
    const brut = (f.whatsapp || f.telephone || "").replace(/\D/g, "");
    if (brut.length < 9) return null;
    const inter = brut.startsWith("237") ? brut : `237${brut}`;
    let msg: string;
    if (valide && identifiant && mdp) {
      msg = `Bonjour ${f.nom}, votre candidature fournisseur MBOA BIO 237 a été validée ! Votre espace fournisseur est prêt. Identifiant : ${identifiant} - Mot de passe provisoire : ${mdp} (à changer à la première connexion). Connectez-vous sur l'application. À bientôt !`;
    } else if (valide) {
      msg = `Bonjour ${f.nom}, votre candidature fournisseur MBOA BIO 237 a été validée ! Vous pouvez dès maintenant proposer vos récoltes depuis l'application. À bientôt !`;
    } else {
      msg = `Bonjour ${f.nom}, merci pour votre candidature fournisseur MBOA BIO 237. Après examen, nous ne pouvons pas la retenir pour le moment. Merci de votre compréhension.`;
    }
    return `https://wa.me/${inter}?text=${encodeURIComponent(msg)}`;
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
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
      <EnTetePage titre={t("adm.fourn.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-2">
        {fournisseurs.map((f) => (
          <CarteMboa key={f.id}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-corps font-bold">{f.nom}</span>
                <p className="text-aide text-[var(--mboa-text-doux)]">{f.village}</p>
                <p className="text-aide text-[var(--mboa-text-doux)]">{fournisseurProduction(f)}</p>
              </div>
              <div className="flex items-center gap-2">
                <BoutonVoix texte={`${f.nom}, ${f.village}. ${fournisseurProduction(f)}`} />
                <span className={`text-aide px-2 py-1 rounded-full ${f.actif ? "bg-[var(--mboa-secondary-doux)] text-[var(--mboa-primary)]" : f.refuseLe ? "bg-[var(--mboa-error-doux)] text-[var(--mboa-error)]" : "bg-amber-100 text-amber-800"}`}>
                  {f.actif ? (fournisseurLie(f) ? t("adm.fourn.compteLie") : t("adm.fourn.sansCompte")) : f.refuseLe ? t("adm.fourn.refuseBadge") : t("adm.fourn.enAttente")}
                </span>
              </div>
            </div>
            {confirmSuppr === f.id ? (
              <div className="flex gap-2 mt-2">
                <BoutonMboa variant="error" className="flex-1 !min-h-[44px]" onClick={() => supprimer(f)}>{t("adm.stk.confirmer")}</BoutonMboa>
                <BoutonMboa variant="surface" className="flex-1 !min-h-[44px]" onClick={() => setConfirmSuppr(null)}>{t("adm.stk.annuler")}</BoutonMboa>
              </div>
            ) : (
              <button
                onClick={() => setConfirmSuppr(f.id)}
                className="text-aide text-[var(--mboa-error)] font-bold mt-2"
              >
                {t("adm.fourn.supprimer")}
              </button>
            )}
            {!f.actif && !f.refuseLe && (
              <div className="flex gap-2 mt-2">
                <BoutonMboa variant="primary" className="flex-1 !min-h-[44px]" onClick={() => basculer(f, true)}>
                  ✓ {t("adm.fourn.valider")}
                </BoutonMboa>
                <BoutonMboa variant="error" className="flex-1 !min-h-[44px]" onClick={() => refuser(f)}>
                  {t("adm.fourn.refuser")}
                </BoutonMboa>
              </div>
            )}
            {/* Après validation ou refus : envoi du message WhatsApp au candidat. */}
            {aNotifier?.f.id === f.id && lienWhatsapp(f, aNotifier.valide, aNotifier.identifiant, aNotifier.mdp) && (
              <a
                href={lienWhatsapp(f, aNotifier.valide, aNotifier.identifiant, aNotifier.mdp)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 w-full p-3 rounded-xl text-corps font-bold text-white"
                style={{ background: "#25D366" }}
                onClick={() => setANotifier(null)}
              >
                📲 {aNotifier.valide ? t("adm.fourn.whatsappValide") : t("adm.fourn.whatsappRefuse")}
              </a>
            )}
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}
