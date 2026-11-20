"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toutesAchats, validerAchat, refuserAchat, payerAchat, profilParId, chargerFournisseurs, sauverFournisseur, envoyerMessageChat } from "@/core/data/depots";
import { creerCompte, compteParIdentifiant, changerMotDePasse, majCompte, validerMotDePasse } from "@/core/auth/auth_service";
import { toast } from "@/core/etat/store";
import { Profil } from "@/core/types/profil";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Achat, achatMontant, achatResume, achatEstPrise } from "@/core/types/achat";
import { STATUT_ACHAT_INFO } from "@/core/types/achat";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";

export default function AchatsAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [profils, setProfils] = useState<Map<string, Profil>>(new Map());
  const [prixConvenance, setPrixConvenance] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  // Compte fournisseur créé depuis un achat : identifiants à communiquer.
  const [accesCree, setAccesCree] = useState<{ nom: string; identifiant: string; mdp: string; tel: string } | null>(null);
  const [accesFaits, setAccesFaits] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Pré-calcule quels achats ont déjà un accès fournisseur.
    chargerFournisseurs()
      .then((fs) => {
        const faits = new Set<string>();
        for (const f of fs) {
          if (!f.profilId) continue;
          faits.add(f.id);
          // Les achats référencent la fiche par son id (tel_...) ou par profilId.
          faits.add(`profil:${f.profilId}`);
        }
        setAccesFaits(faits);
      })
      .catch(() => {});
  }, [achats]);

  async function charger() {
    const liste = await toutesAchats();
    setAchats(liste);
    // Résout les noms des fournisseurs déclarants
    const map = new Map<string, Profil>();
    // Résolution des noms en parallèle : séquentiel, chaque achat
    // ajoutait un aller-retour réseau au chargement de la page.
    const ids = [...new Set(liste.map((a) => a.fournisseurId).filter((id) => id && !id.startsWith("tel_")))];
    await Promise.all(
      ids.map(async (id) => {
        const p = await profilParId(id);
        if (p) map.set(id, p);
      }),
    );
    setProfils(map);
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);

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

  /** Crée (ou réactive) le compte fournisseur lié à cet achat :
   *  identifiant = téléphone de la fiche, mot de passe provisoire
   *  communiqué ensuite via WhatsApp ou le chat intégré. */
  async function creerAccesDepuisAchat(a: Achat) {
    setEnCours(a.id);
    try {
      const fiches = await chargerFournisseurs();
      // Le fournisseurId d'un achat est `tel_<numéro>` ou un id de compte :
      // on retrouve la fiche par id, par compte lié, ou par téléphone
      // (9 derniers chiffres) — les formats ne sont jamais garantis.
      const digits = a.fournisseurId.replace(/^tel_/, "").replace(/\D/g, "");
      const fin = digits.slice(-9);
      let f = fiches.find(
        (x) =>
          x.id === a.fournisseurId ||
          x.profilId === a.fournisseurId ||
          (fin.length >= 9 && x.telephone.replace(/\D/g, "").slice(-9) === fin),
      );
      if (!f) {
        // Repli : le fournisseur s'est connecté sans fiche (ou id ≠ tel_) —
        // on résout le compte puis on crée la fiche à la volée.
        const profilVendeur = a.fournisseurId.startsWith("tel_")
          ? null
          : await profilParId(a.fournisseurId);
        const telVendeur = digits || (profilVendeur?.telephone ?? "").replace(/\D/g, "");
        const compteExistant = telVendeur
          ? await compteParIdentifiant(telVendeur)
          : null;
        const nomVendeur = profilVendeur?.nom ?? compteExistant?.nom ?? "Fournisseur";
        if (!telVendeur && !compteExistant) {
          toast(t("adm.ach.accesIntrouvable"));
          return;
        }
        f = (await sauverFournisseur({
          nom: nomVendeur,
          telephone: telVendeur || digits,
          village: profilVendeur?.village ?? compteExistant?.village ?? "",
          actif: true,
        })) ?? undefined;
        if (!f) {
          toast(t("adm.ach.accesIntrouvable"));
          return;
        }
      }
      if (!f) return;
      if (f.profilId) {
        toast(t("adm.ach.accesExistant"));
        return;
      }
      const mdp = `mboa${Math.floor(1000 + Math.random() * 9000)}`;
      if (!validerMotDePasse(mdp).ok) return;
      const identifiant = f.telephone.replace(/\D/g, "");
      let compte = await compteParIdentifiant(identifiant);
      if (compte) {
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
      setAccesFaits((s) => new Set(s).add(f.id).add(`profil:${compte.id}`));
      setAccesCree({ nom: f.nom, identifiant, mdp, tel: f.whatsapp || f.telephone });
      // Envoie aussi les identifiants par le chat intégré : le fournisseur
      // les retrouvera dans /messages dès sa première connexion.
      if (profil) {
        void envoyerMessageChat({
          expediteur: profil,
          destinataireId: compte.id,
          destinataireRole: "fournisseur",
          texte: `Bonjour ${f.nom}, votre espace fournisseur MBOA BIO 237 est prêt ! Identifiant : ${identifiant} — Mot de passe provisoire : ${mdp} (vous devrez en choisir un nouveau à la première connexion). À bientôt !`,
        }).catch(() => {});
      }
      toast(t("adm.ach.accesCree"));
    } catch (e) {
      console.error("création accès fournisseur", e);
      toast(t("adm.ach.accesErreur"));
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
        {/* Identifiants du compte fournisseur qui vient d'être créé :
            à communiquer au vendeur (WhatsApp ou chat intégré). */}
        {accesCree && (
          <CarteMboa className="border-2" style={{ borderColor: "var(--mboa-primary)" }}>
            <p className="text-corps font-bold">✅ {t("adm.ach.accesCreeTitre")} — {accesCree.nom}</p>
            <p className="text-aide mt-1">
              {t("adm.ach.identifiant")} : <b>{accesCree.identifiant}</b><br />
              {t("adm.ach.mdpProvisoire")} : <b>{accesCree.mdp}</b>
            </p>
            <a
              className="btn-mboa btn-secondary mt-2 inline-block"
              href={`https://wa.me/${accesCree.tel.replace(/\D/g, "").replace(/^237/, "237")}?text=${encodeURIComponent(`Bonjour ${accesCree.nom}, votre espace fournisseur MBOA BIO 237 est prêt ! Identifiant : ${accesCree.identifiant} — Mot de passe provisoire : ${accesCree.mdp} (à changer à la première connexion).`)}`}
              target="_blank"
              rel="noreferrer"
            >
              📲 {t("adm.ach.envoyerWhatsapp")}
            </a>
            <button className="text-aide underline ml-3" onClick={() => setAccesCree(null)}>
              {t("adm.ach.fermer")}
            </button>
          </CarteMboa>
        )}

        {/* Propositions en attente */}
        <h2 className="text-titre titre-section">{t("adm.ach.enAttente")} ({enAttente.length})</h2>
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
            {/* Accès fournisseur : crée le compte de connexion du
                vendeur une fois la marchandise achetée. */}
            {!accesFaits.has(a.fournisseurId) && !accesFaits.has(`profil:${a.fournisseurId}`) && (
              <BoutonMboa
                variant="surface"
                className="w-full mt-2"
                disabled={enCours === a.id}
                onClick={() => void creerAccesDepuisAchat(a)}
              >
                🔑 {t("adm.ach.creerAcces")}
              </BoutonMboa>
            )}
          </CarteMboa>
        ))}

        {/* Marchandise achetée, à payer au fournisseur */}
        {aPayer.length > 0 && (
          <>
            <h2 className="text-titre titre-section">{t("adm.ach.aPayer")} ({aPayer.length})</h2>
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
