"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { chargerZonesLivraison, sauverZoneLivraison, supprimerZoneLivraison } from "@/core/data/depots";
import { ZoneLivraison, zonesParDefaut } from "@/core/types/zone_livraison";
import { CarteMboa, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";
import { formaterFcfa } from "@/core/utils/format_monnaie";

export default function ZonesLivraisonPage() {
  const router = useRouter();
  const { pret } = useGuardRole("admin");
  const t = useTr();
  const [zones, setZones] = useState<ZoneLivraison[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [nouvelle, setNouvelle] = useState<{ nom: string; prix: string; tarifCourse: string }>({ nom: "", prix: "1000", tarifCourse: "800" });

  async function charger() {
    setZones(await chargerZonesLivraison());
  }

  async function ajouter() {
    const prix = parseInt(nouvelle.prix) || 0;
    const tarif = parseInt(nouvelle.tarifCourse) || 0;
    if (!nouvelle.nom.trim() || prix < 0 || tarif < 0) return;
    setEnCours(true);
    try {
      const id = `zone_${Date.now()}`;
      await sauverZoneLivraison({ id, nom: nouvelle.nom.trim(), prix, tarifCourse: tarif, actif: true });
      setNouvelle({ nom: "", prix: "1000", tarifCourse: "800" });
      await charger();
    } finally {
      setEnCours(false);
    }
  }

  async function majPrix(zone: ZoneLivraison, nouveauPrix: string, nouveauTarif?: string) {
    const prix = parseInt(nouveauPrix) || 0;
    const tarif = nouveauTarif ? parseInt(nouveauTarif) : zone.tarifCourse;
    if (prix < 0 || (tarif != null && tarif < 0)) return;
    await sauverZoneLivraison({ ...zone, prix, tarifCourse: tarif });
    await charger();
  }

  async function basculerActif(zone: ZoneLivraison) {
    await sauverZoneLivraison({ ...zone, actif: !zone.actif });
    await charger();
  }

  async function supprimer(zone: ZoneLivraison) {
    await supprimerZoneLivraison(zone.id);
    await charger();
  }

  async function reinitialiserDefauts() {
    setEnCours(true);
    try {
      for (const z of zonesParDefaut()) await sauverZoneLivraison(z);
      await charger();
    } finally {
      setEnCours(false);
    }
  }
  // Tirer vers le bas depuis le haut = recharger la page.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  // Charger au montage
  charger();

  return (
    <FondMboa>
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
      <EnTetePage titre={t("adm.zones.titre")} onRetour={() => router.back()} />
      <div className="flex-1 p-4 space-y-3">
        {/* Nouvelle zone */}
        <CarteMboa>
          <h2 className="text-titre titre-section mb-2">{t("adm.zones.ajouter")}</h2>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder={t("adm.zones.nomPh")}
              value={nouvelle.nom}
              onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })}
              className="champ-mboa flex-1"
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Prix"
              value={nouvelle.prix}
              onChange={(e) => setNouvelle({ ...nouvelle, prix: e.target.value })}
              className="champ-mboa !w-24 text-chiffre"
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="Tarif livreur"
              value={nouvelle.tarifCourse}
              onChange={(e) => setNouvelle({ ...nouvelle, tarifCourse: e.target.value })}
              className="champ-mboa !w-24 text-chiffre"
            />
          </div>
          <BoutonMboa onClick={ajouter} disabled={enCours} className="w-full">
            {t("adm.zones.ajouterBtn")}
          </BoutonMboa>
        </CarteMboa>

        {/* Liste des zones */}
        {zones.map((z) => (
          <CarteMboa key={z.id}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-corps font-bold">{z.nom}</span>
              <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(z.prix)}</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                inputMode="numeric"
                value={z.prix}
                onChange={(e) => majPrix(z, e.target.value, String(z.tarifCourse ?? ""))}
                className="champ-mboa flex-1 text-chiffre"
                placeholder="Prix"
              />
              <input
                type="number"
                inputMode="numeric"
                value={z.tarifCourse ?? ""}
                onChange={(e) => majPrix(z, String(z.prix), e.target.value)}
                className="champ-mboa flex-1 text-chiffre"
                placeholder="Tarif livreur"
              />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-aide flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={z.actif}
                  onChange={() => basculerActif(z)}
                  className="w-4 h-4 accent-[var(--mboa-primary)]"
                />
                {z.actif ? t("adm.zones.actif") : t("adm.zones.inactif")}
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => supprimer(z)}
                className="text-aide text-[var(--mboa-error)] font-bold"
              >
                {t("adm.zones.supprimer")}
              </button>
            </div>
          </CarteMboa>
        ))}

        {zones.length === 0 && (
          <button onClick={reinitialiserDefauts} disabled={enCours} className="text-aide text-[var(--mboa-primary)] underline text-center w-full">
            {t("adm.zones.reinitialiser")}
          </button>
        )}
      </div>
    </FondMboa>
  );
}
