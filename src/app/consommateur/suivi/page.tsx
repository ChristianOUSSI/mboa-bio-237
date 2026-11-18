"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { commandesCliente, confirmerReception, suiviCommande, partagerPositionGps } from "@/core/data/depots";
import { cacheEcrire } from "@/core/data/base_locale";
import { CarteColis } from "@/core/design_system/carte_colis";
import { CarteMboa, BoutonMboa, EnTetePage, BadgeStatut, BoutonVoix, FondMboa, SkeletonMboa, ChargementMboa } from "@/core/design_system/composants";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { Commande, commandeMontantAPayer, commandeAttendConfirmation, commandeEstAnnule } from "@/core/types/commande_full";
import { STATUT_COMMANDE_INFO, StatutCommande, Satisfaction, SATISFACTION_INFO, MotifReception, MOTIF_RECEPTION_INFO } from "@/core/types/statuts";
import { SuiviColis, suiviTimeline, JALON_SUIVI_INFO, PositionGps } from "@/core/types/suivi_colis";
import { resumerQuantites } from "@/core/types/commande";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

/** Vraie carte OpenStreetMap (iframe publique, sans clé API). */
function CarteOsm({ livreur, destination }: { livreur: PositionGps; destination: PositionGps }) {
  const lats = [livreur.latitude, destination.latitude];
  const lngs = [livreur.longitude, destination.longitude];
  const minLat = Math.min(...lats) - 0.01;
  const maxLat = Math.max(...lats) + 0.01;
  const minLng = Math.min(...lngs) - 0.01;
  const maxLng = Math.max(...lngs) + 0.01;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${destination.latitude},${destination.longitude}`;
  return (
    <iframe
      src={src}
      title="Carte de livraison"
      className="w-full h-56 rounded-xl mt-2 border-0"
      loading="lazy"
    />
  );
}

function demandePosition(): Promise<PositionGps | null> {
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

export default function SuiviPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("consommateur");
  const t = useTr();

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [suivis, setSuivis] = useState<Map<string, SuiviColis>>(new Map());
  const [confirmationCmd, setConfirmationCmd] = useState<string | null>(null);
  const [satisfactionChoisie, setSatisfactionChoisie] = useState<Satisfaction | null>(null);
  const [motifChoisi, setMotifChoisi] = useState<MotifReception | null>(null);
  const positionsPartagees = useRef<Set<string>>(new Set());
  const statutsPrec = useRef<Map<string, StatutCommande>>(new Map());
  const notifDemandee = useRef(false);

  async function recharger(profilId: string) {
    const cmds = await commandesCliente(profilId);
    // Notification locale quand le statut change (ex. livreur arrivé).
    for (const c of cmds) {
      const avant = statutsPrec.current.get(c.id);
      if (avant && avant !== c.statut && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const titre = c.statut === StatutCommande.livree ? "📦 MBOA BIO" : "🔔 MBOA BIO";
        const texte = STATUT_COMMANDE_INFO[c.statut]?.annonce ?? c.statut;
        try {
          new Notification(titre, { body: texte, icon: "/logo-mboa.jpeg" });
        } catch {
          /* notification indisponible */
        }
      }
      statutsPrec.current.set(c.id, c.statut);
    }
    setCommandes(cmds);
    // Suivis en parallele : un await sequentiel par commande rendait
    // la page lente des qu'il y avait plusieurs livraisons.
    const entrees = await Promise.all(cmds.map(async (c) => [c.id, await suiviCommande(c.id)] as const));
    const sMap = new Map<string, SuiviColis>(entrees);
    // Une seule position GPS lue pour toutes les livraisons actives.
    const actives = cmds.filter(
      (c) =>
        (c.statut === StatutCommande.valideeAdmin ||
          c.statut === StatutCommande.enLivraison ||
          c.statut === StatutCommande.livree) &&
        !positionsPartagees.current.has(c.id),
    );
    if (actives.length > 0 && typeof Notification !== "undefined" && Notification.permission === "default" && !notifDemandee.current) {
      notifDemandee.current = true;
      Notification.requestPermission().catch(() => {});
    }
    if (actives.length > 0) {
      const pos = await demandePosition();
      if (pos) {
        await Promise.all(
          actives.map(async (c) => {
            await cacheEcrire("gps_client", c.id, pos);
            partagerPositionGps("client", c.id, pos);
            const s = sMap.get(c.id);
            if (s) s.positionDestination = pos;
            positionsPartagees.current.add(c.id);
          }),
        );
      }
    }
    setSuivis(sMap);
  }

  useEffect(() => {
    if (!profil) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recharger(profil.id);
    // Real-time map: re-poll tracking every 15 seconds
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") recharger(profil.id);
    }, 15000);
    return () => clearInterval(timer);
  }, [profil]);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <ChargementMboa />
        </div>
      </FondMboa>
    );
  }

  async function confirmer(cmdId: string, sat: Satisfaction, motif?: MotifReception) {
    await confirmerReception(cmdId, sat, motif ?? undefined);
    setConfirmationCmd(null);
    setSatisfactionChoisie(null);
    setMotifChoisi(null);
    // Reload
    if (profil) {
      await recharger(profil.id);
    }
  }

  return (
    <FondMboa>
      <EnTetePage titre={t("march.mesCommandes")} onRetour={() => router.push("/consommateur")} />

      <div className="flex-1 p-4">
        {commandes.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">📦</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("suivi.vide")}</p>
            <BoutonMboa variant="primary" onClick={() => router.push("/consommateur")} className="mt-4">{t("panier.allerMarche")}</BoutonMboa>
          </div>
        ) : (
          <div className="space-y-3">
            {commandes.map((c) => {
              const suivi = suivis.get(c.id);
              const timeline = suivi ? suiviTimeline(suivi) : [];
              const info = STATUT_COMMANDE_INFO[c.statut];
              return (
                <CarteMboa key={c.id} className="carte-suivi">
                  {/* Status */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <BadgeStatut statut={c.statut} libelle={info.libelle} />
                      <p className="text-aide text-[var(--mboa-text-doux)] mt-1">{info.actionRestante}</p>
                    </div>
                    <BoutonVoix texte={info.annonce} />
                  </div>

                  {/* Summary */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-corps">{resumerQuantites(c.lignes)}</span>
                    <span className="text-chiffre text-[var(--mboa-primary)]">
                      {formaterFcfa(commandeMontantAPayer(c))}
                    </span>
                  </div>
                  {(c.fraisLivraison ?? 0) > 0 && (
                    <p className="text-aide text-[var(--mboa-text-doux)]">
                      {t("panier.produits")} {formaterFcfa(c.montantTotal)} + {t("panier.livraison").toLowerCase()} {formaterFcfa(c.fraisLivraison ?? 0)}
                    </p>
                  )}

                  {/* Détail des articles commandés */}
                  <div className="bg-[var(--mboa-background)] rounded-xl p-2 mt-1">
                    {c.lignes.map((l, i) => (
                      <div key={i} className="flex justify-between items-center text-aide py-0.5 gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg overflow-hidden bg-[var(--mboa-secondary-doux)] flex items-center justify-center shrink-0 text-sm">
                            {l.photo ? <img src={l.photo} alt="" className="w-full h-full object-cover" /> : "🥬"}
                          </span>
                          <span className="truncate">{l.quantite} × {l.nom}</span>
                        </span>
                        <span className="text-[var(--mboa-text-doux)] shrink-0">{formaterFcfa(Math.round(l.quantite * l.prix))}</span>
                      </div>
                    ))}
                  </div>

                  {/* Adresse de livraison */}
                  {(c.livraisonQuartier || c.livraisonDetail) && (
                    <p className="text-aide text-[var(--mboa-text-doux)] mt-1">
                      📍 {c.livraisonQuartier}
                      {c.livraisonDetail ? ` - ${c.livraisonDetail}` : ""}
                    </p>
                  )}

                  {/* Who is coming */}
                  {c.livreurNom && (
                    <div className="encart-livreur mb-2">
                      {c.livreurPhoto ? (
                        <img src={c.livreurPhoto} alt="" className="avatar-livreur object-cover" />
                      ) : (
                        <span className="avatar-livreur" aria-hidden>
                          {c.livreurNom ? c.livreurNom.trim().charAt(0).toUpperCase() : "🏍️"}
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="text-aide text-[var(--mboa-text-doux)]">{t("suivi.enRoute")}</p>
                        <p className="text-corps font-bold">
                          {c.livreurNom}
                          {c.livreurPlaque ? ` · ${t("suivi.plaque")} ${c.livreurPlaque}` : ""}
                          {c.livreurMoto ? ` · ${c.livreurMoto}` : ""}
                        </p>
                      </div>
                      {c.livreurTelephone && (
                        <a
                          href={`tel:${c.livreurTelephone}`}
                          className="btn-mboa btn-primary !min-h-[44px] !min-w-[44px] !rounded-xl text-xl"
                          aria-label={`Appeler ${c.livreurNom}`}
                        >
                          📞
                        </a>
                      )}
                    </div>
                  )}

                  {/* Real-time map */}
                  {suivi &&
                    (c.statut === StatutCommande.valideeAdmin ||
                      c.statut === StatutCommande.enLivraison ||
                      c.statut === StatutCommande.livree) && (
                      <div className="mt-3">
                        <CarteColis suivi={suivi} />
                        {suivi.positionActuelle && suivi.positionDestination && (
                          <CarteOsm
                            livreur={suivi.positionActuelle}
                            destination={suivi.positionDestination}
                          />
                        )}
                      </div>
                    )}

                  {/* Timeline */}
                  {timeline.length > 0 && (
                    <div className="timeline-suivi flex justify-between items-center mt-4 mb-2">
                      {timeline.map((etape, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                            style={{
                              background: etape.etape
                                ? "var(--mboa-secondary)"
                                : "var(--mboa-trait)",
                            }}
                          >
                            {etape.etape ? "✓" : ""}
                          </div>
                          <span className="text-aide text-center mt-1 text-[var(--mboa-text-doux)]" style={{ fontSize: 12 }}>
                            {JALON_SUIVI_INFO[etape.jalon].libelle}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmation */}
                  {commandeAttendConfirmation(c) && (
                    <div className="mt-3">
                      {confirmationCmd === c.id ? (
                        <div className="space-y-2">
                          <p className="text-corps text-center">{t("suivi.toutOk")}</p>
                          {satisfactionChoisie === Satisfaction.probleme ? (
                            <>
                              <p className="text-aide text-[var(--mboa-text-doux)] text-center">{t("suivi.problemeQ")}</p>
                              <div className="space-y-2">
                                {Object.values(MotifReception).map((m) => (
                                  <button
                                    key={m}
                                    onClick={() => setMotifChoisi(m)}
                                    className="w-full p-3 rounded-xl text-corps"
                                    style={{
                                      background: motifChoisi === m ? "var(--mboa-error-doux)" : "var(--mboa-background)",
                                      border: `2px solid ${motifChoisi === m ? "var(--mboa-error)" : "transparent"}`,
                                    }}
                                  >
                                    {MOTIF_RECEPTION_INFO[m]}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <BoutonMboa variant="surface" onClick={() => { setSatisfactionChoisie(null); setMotifChoisi(null); }} className="flex-1">
                                  {t("suivi.retour")}
                                </BoutonMboa>
                                <BoutonMboa
                                  variant="error"
                                  onClick={() => confirmer(c.id, Satisfaction.probleme, motifChoisi ?? undefined)}
                                  disabled={!motifChoisi}
                                  className="flex-1"
                                >
                                  {t("suivi.signaler")}
                                </BoutonMboa>
                              </div>
                            </>
                          ) : (
                            <div className="flex gap-2">
                              <BoutonMboa variant="primary" onClick={() => confirmer(c.id, Satisfaction.bon)} className="flex-1">
                                👍 {SATISFACTION_INFO[Satisfaction.bon].libelle}
                              </BoutonMboa>
                              <BoutonMboa variant="error" onClick={() => setSatisfactionChoisie(Satisfaction.probleme)} className="flex-1">
                                {t("suivi.probleme")}
                              </BoutonMboa>
                            </div>
                          )}
                        </div>
                      ) : (
                        <BoutonMboa variant="primary" onClick={() => setConfirmationCmd(c.id)} className="w-full">
                          {t("suivi.confirmer")}
                        </BoutonMboa>
                      )}
                    </div>
                  )}

                  {commandeEstAnnule(c) && c.motifAnnulation && (
                    <p className="text-aide text-[var(--mboa-error)] mt-2">
                      {t("suivi.annule")} {c.motifAnnulation}
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
