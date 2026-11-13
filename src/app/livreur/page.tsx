"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { toutesCommandes, demarrerLivraison, marquerLivree, majPositionLivreur } from "@/core/data/depots";
import { cacheEcrire } from "@/core/data/base_locale";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { STATUT_COMMANDE_INFO, StatutCommande, ModePaiement, MODE_PAIEMENT_INFO } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { resumerQuantites } from "@/core/types/commande";
import { PositionGps } from "@/core/types/suivi_colis";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

function positionActuelle(): Promise<PositionGps | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          horodatage: new Date().toISOString(),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export default function AccueilLivreur() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("livreur");
  const t = useTr();
  const { deconnexion } = useSession();
  const [courses, setCourses] = useState<Commande[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);

  async function charger() {
    const toutes = await toutesCommandes();
    // The driver only sees their own assigned deliveries
    const miennes = profil
      ? toutes.filter(
          (c) =>
            c.livreurId === profil.id &&
            c.statut !== StatutCommande.nouvelle &&
            c.statut !== StatutCommande.annulee,
        )
      : [];
    setCourses(miennes);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil]);

  // Automatic GPS sharing every 15 s while a delivery is on the way
  useEffect(() => {
    const enRoute = courses.filter((c) => c.statut === StatutCommande.enLivraison);
    if (enRoute.length === 0) return;
    const timer = setInterval(async () => {
      for (const c of enRoute) {
        const pos = await positionActuelle();
        if (pos) {
          await cacheEcrire("gps_livreur", c.id, pos);
          await majPositionLivreur(c.id, pos.latitude, pos.longitude);
        }
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [courses]);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  async function demarrer(c: Commande) {
    setEnCours(c.id);
    try {
      await demarrerLivraison(c.id);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  /** Shares the GPS position: visible to the customer on the real-time map. */
  async function partagerPosition(c: Commande) {
    const pos = await positionActuelle();
    if (!pos) return;
    await cacheEcrire("gps_livreur", c.id, pos);
    await majPositionLivreur(c.id, pos.latitude, pos.longitude);
  }

  async function livrer(c: Commande) {
    setEnCours(c.id);
    try {
      await marquerLivree(c.id);
      await charger();
    } finally {
      setEnCours(null);
    }
  }

  return (
    <FondMboa>
      <EnTetePage
        titre="MBOA DRIVER"
        sousTitre={profil ? profil.nom : ""}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
      />

      {/* Driver card */}
      {profil && (
        <div className="p-4">
          <CarteMboa className="bg-[var(--mboa-primary-doux)]">
            <p className="text-aide text-[var(--mboa-text-doux)]">{t("liv.maCarte")}</p>
            <p className="text-titre">{profil.nom}</p>
            <p className="text-aide">{profil.village}</p>
            <p className="text-aide mt-1 italic">{t("liv.payeAlaRecette")}</p>
          </CarteMboa>
        </div>
      )}

      <div className="flex-1 p-4">
        <h2 className="text-titre mb-2">{t("liv.mesLivraisons")}</h2>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">🏍️</div>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("liv.aucune")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => {
              const info = STATUT_COMMANDE_INFO[c.statut];
              const aCharger = c.statut === StatutCommande.valideeAdmin;
              const enRoute = c.statut === StatutCommande.enLivraison;
              const livree = c.statut === StatutCommande.livree;
              return (
                <CarteMboa key={c.id}>
                  <div className="flex justify-between items-start mb-2">
                    <BadgeStatut statut={c.statut} libelle={info.libelle} />
                    <BoutonVoix texte={`Livraison pour ${c.lignes.map((l) => l.nom).join(", ")}. À encaisser : ${commandeMontantAPayer(c)} francs`} />
                  </div>
                  <p className="text-corps font-bold">{resumerQuantites(c.lignes)}</p>

                  {/* Product detail to deliver */}
                  <div className="mt-2 bg-[var(--mboa-background)] rounded-xl p-2">
                    {c.lignes.map((l, i) => (
                      <div key={i} className="flex justify-between text-aide py-0.5">
                        <span>{l.quantite} × {l.nom}</span>
                        <span className="text-[var(--mboa-text-doux)]">{formaterFcfa(Math.round(l.quantite * l.prix))}</span>
                      </div>
                    ))}
                  </div>

                  {c.appelSouhaite && (
                    <p className="text-aide mt-2 font-bold" style={{ color: "var(--mboa-primary)" }}>
                      📞 {t("liv.appelerAvant")}
                      {c.numeroContact ? ` : ${c.numeroContact}` : ""}
                    </p>
                  )}

                  {/* Payment info */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-aide text-[var(--mboa-text-doux)]">{t("liv.aEncaisser")}</span>
                    <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(commandeMontantAPayer(c))}</span>
                  </div>
                  {c.paiement && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-aide text-[var(--mboa-text-doux)]">{t("liv.paiement")}</span>
                      <BadgeStatut statut="valide" libelle={MODE_PAIEMENT_INFO[c.paiement as ModePaiement]?.libelle ?? t("liv.especes")} />
                    </div>
                  )}

                  {c.livreurTarif != null && c.livreurTarif > 0 && (
                    <p className="text-aide text-[var(--mboa-text-doux)] mt-1">
                      {t("liv.monTarif")} {formaterFcfa(c.livreurTarif)} {t("liv.payeAlaRecette2")}
                    </p>
                  )}

                  {aCharger && (
                    <BoutonMboa
                      variant="primary"
                      className="w-full mt-2"
                      disabled={enCours === c.id}
                      onClick={() => demarrer(c)}
                    >
                      {enCours === c.id ? t("liv.chargement") : t("liv.charger")}
                    </BoutonMboa>
                  )}

                  {enRoute && (
                    <div className="flex gap-2 mt-2">
                      <BoutonMboa variant="surface" className="flex-1" onClick={() => partagerPosition(c)}>
                        {t("liv.partagerPos")}
                      </BoutonMboa>
                      <BoutonMboa
                        variant="primary"
                        className="flex-1"
                        disabled={enCours === c.id}
                        onClick={() => livrer(c)}
                      >
                        {enCours === c.id ? "..." : t("liv.livre")}
                      </BoutonMboa>
                    </div>
                  )}

                  {livree && (
                    <p className="text-aide text-[var(--mboa-text-doux)] mt-2">
                      {t("liv.attenteClient")}
                    </p>
                  )}
                </CarteMboa>
              );
            })}
          </div>
        )}
      </div>
    </FondMboa>
  );
}
