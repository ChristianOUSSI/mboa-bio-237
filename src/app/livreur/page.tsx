"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { toutesCommandes, chargerLivreurs, demarrerLivraison, marquerLivree, partagerPositionGps } from "@/core/data/depots";
import { cacheEcrire } from "@/core/data/base_locale";
import { CarteMboa, EnTetePage, BadgeStatut, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { STATUT_COMMANDE_INFO, StatutCommande, ModePaiement, MODE_PAIEMENT_INFO } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { resumerQuantites } from "@/core/types/commande";
import { PositionGps, distanceGps } from "@/core/types/suivi_colis";
import { suiviCommande } from "@/core/data/depots";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
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
  // Position live du client par commande : distance restante +
  // destination réelle pour l'itinéraire (pas seulement l'adresse).
  const [clientsGps, setClientsGps] = useState<Map<string, { position: PositionGps; metres: number }>>(new Map());

  async function charger() {
    const [toutes, livreurs] = await Promise.all([toutesCommandes(), chargerLivreurs()]);
    // `livreur_id` porte l'id de la FICHE livreur, pas celui du compte :
    // on matche la fiche dont le téléphone (ou l'id direct) correspond
    // à la session, sinon le livreur ne verrait jamais ses courses.
    const telSession = (profil?.telephone ?? "").replace(/\D/g, "").slice(-9);
    const mesFiches = new Set(
      livreurs
        .filter(
          (l) =>
            l.profilId === profil?.id ||
            l.id === profil?.id ||
            (telSession.length >= 9 && (l.telephone ?? "").replace(/\D/g, "").slice(-9) === telSession),
        )
        .map((l) => l.id),
    );
    // Le livreur ne voit que SES courses : ni les nouvelles (pas encore
    // assignées), ni les annulées.
    const miennes = profil
      ? toutes.filter(
          (c) =>
            c.livreurId != null &&
            mesFiches.has(c.livreurId) &&
            c.statut !== StatutCommande.nouvelle &&
            c.statut !== StatutCommande.annulee,
        )
      : [];
    setCourses(miennes);
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet :
  // une course assignée par l'admin apparaît sans recharger la page.
  useActualisation(charger);

  // Automatic GPS sharing every 15 s while a delivery is on the way.
  // Une seule position lue par cycle, partagee entre les courses ;
  // le tick est ignore onglet cache (la batterie compte sur moto).
  useEffect(() => {
    const enRoute = courses.filter((c) => c.statut === StatutCommande.enLivraison);
    if (enRoute.length === 0) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const pos = await positionActuelle();
      if (!pos) return;
      await Promise.all(
        enRoute.map(async (c) => {
          await cacheEcrire("gps_livreur", c.id, pos);
          partagerPositionGps("livreur", c.id, pos);
        }),
      );
      // Position live du client : le livreur voit la distance réelle
      // restante et navigue vers là où le client est vraiment.
      const entrees = await Promise.all(
        enRoute.map(async (c) => {
          const s = await suiviCommande(c.id);
          const dest = s.positionDestination;
          // Position client exploitable seulement si fraîche (partagée
          // toutes les 3 min) - testé ici, pas au render (pureté React).
          const fraiche =
            dest?.horodatage &&
            Date.now() - new Date(dest.horodatage).getTime() < 10 * 60 * 1000;
          if (!dest || !fraiche) return null;
          return [c.id, { position: dest, metres: distanceGps(pos, dest) }] as const;
        }),
      );
      setClientsGps(
        new Map(entrees.filter((e): e is NonNullable<typeof e> => e !== null)),
      );
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
    partagerPositionGps("livreur", c.id, pos);
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
        <h2 className="text-titre titre-section mb-2">{t("liv.mesLivraisons")}</h2>
        {courses.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">🏍️</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("liv.aucune")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map((c) => {
              const info = STATUT_COMMANDE_INFO[c.statut];
              const aCharger = c.statut === StatutCommande.valideeAdmin;
              const enRoute = c.statut === StatutCommande.enLivraison;
              const livree = c.statut === StatutCommande.livree;
              const clientLive = clientsGps.get(c.id);
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

                  {(c.livraisonQuartier || c.livraisonDetail) && (
                    <p className="text-aide mt-2" style={{ color: "var(--mboa-primary)" }}>
                      📍 {c.livraisonQuartier}
                      {c.livraisonDetail ? ` - ${c.livraisonDetail}` : ""}
                    </p>
                  )}
                  {enRoute && clientLive && (
                    <p className="text-aide mt-1 font-bold" style={{ color: "var(--mboa-secondary)" }}>
                      📡 {t("liv.clientALaDistance")} :{" "}
                      {clientLive.metres < 1000
                        ? `${clientLive.metres} m`
                        : `${(clientLive.metres / 1000).toFixed(1)} km`}
                    </p>
                  )}
                  {(c.livraisonLat != null && c.livraisonLng != null) || clientLive ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${
                        clientLive
                          ? `${clientLive.position.latitude},${clientLive.position.longitude}`
                          : `${c.livraisonLat},${c.livraisonLng}`
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-aide mt-1 inline-block font-bold underline"
                      style={{ color: "var(--mboa-primary)" }}
                    >
                      🗺️ {t("liv.itineraire")}
                      {clientLive ? ` (${t("liv.positionLive")})` : ""}
                    </a>
                  ) : null}

                  {(c.clientNom || c.clientVillage) && (
                    <p className="text-aide mt-1 text-[var(--mboa-text-doux)]">
                      👤 {c.clientNom}
                      {c.clientVillage ? ` · ${c.clientVillage}` : ""}
                      {c.clientTel ? ` · ${c.clientTel}` : ""}
                    </p>
                  )}

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
