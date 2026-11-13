"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { commandesCliente, confirmerReception, suiviCommande } from "@/core/data/depots";
import { cacheEcrire } from "@/core/data/base_locale";
import { CarteColis } from "@/core/design_system/carte_colis";
import { CarteMboa, BoutonMboa, EnTetePage, BadgeStatut, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { Commande, commandeMontantAPayer, commandeAttendConfirmation, commandeEstAnnule } from "@/core/types/commande_full";
import { STATUT_COMMANDE_INFO, StatutCommande, Satisfaction, SATISFACTION_INFO, MotifReception, MOTIF_RECEPTION_INFO } from "@/core/types/statuts";
import { SuiviColis, suiviTimeline, JALON_SUIVI_INFO, PositionGps } from "@/core/types/suivi_colis";
import { resumerQuantites } from "@/core/types/commande";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

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

  async function recharger(profilId: string) {
    const cmds = await commandesCliente(profilId);
    setCommandes(cmds);
    const sMap = new Map<string, SuiviColis>();
    for (const c of cmds) {
      const s = await suiviCommande(c.id);
      // Shares the customer's position once per active delivery
      const active =
        c.statut === StatutCommande.valideeAdmin ||
        c.statut === StatutCommande.enLivraison ||
        c.statut === StatutCommande.livree;
      if (active && !positionsPartagees.current.has(c.id)) {
        const pos = await demandePosition();
        if (pos) {
          await cacheEcrire("gps_client", c.id, pos);
          s.positionDestination = pos;
          positionsPartagees.current.add(c.id);
        }
      }
      sMap.set(c.id, s);
    }
    setSuivis(sMap);
  }

  useEffect(() => {
    if (!profil) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recharger(profil.id);
    // Real-time map: re-poll tracking every 5 seconds
    const timer = setInterval(() => recharger(profil.id), 5000);
    return () => clearInterval(timer);
  }, [profil]);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
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
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📦</div>
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
                <CarteMboa key={c.id}>
                  {/* Status */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <BadgeStatut statut={c.statut} libelle={info.libelle} />
                      <p className="text-aide text-[var(--mboa-text-doux)] mt-1">{info.actionRestante}</p>
                    </div>
                    <BoutonVoix texte={info.annonce} />
                  </div>

                  {/* Summary */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-corps">{resumerQuantites(c.lignes)}</span>
                    <span className="text-chiffre text-[var(--mboa-primary)]">
                      {formaterFcfa(commandeMontantAPayer(c))}
                    </span>
                  </div>

                  {/* Who is coming */}
                  {c.livreurNom && (
                    <div className="bg-[var(--mboa-primary-doux)] rounded-xl p-2 mb-2">
                      <p className="text-aide text-[var(--mboa-text-doux)]">{t("suivi.enRoute")}</p>
                      <p className="text-corps font-bold">
                        {c.livreurNom}
                        {c.livreurPlaque ? ` · ${t("suivi.plaque")} ${c.livreurPlaque}` : ""}
                      </p>
                    </div>
                  )}

                  {/* Real-time map */}
                  {suivi &&
                    (c.statut === StatutCommande.valideeAdmin ||
                      c.statut === StatutCommande.enLivraison ||
                      c.statut === StatutCommande.livree) && (
                      <div className="mt-3">
                        <CarteColis suivi={suivi} />
                      </div>
                    )}

                  {/* Timeline */}
                  {timeline.length > 0 && (
                    <div className="flex justify-between items-center mt-3 mb-2">
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
