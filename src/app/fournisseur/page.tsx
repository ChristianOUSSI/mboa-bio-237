"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, useReseau } from "@/core/etat/store";
import { mesAchats } from "@/core/data/depots";
import { CarteMboa, BoutonMboa, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Achat, achatMontant, achatEstPayee, achatEstDu } from "@/core/types/achat";
import { STATUT_ACHAT_INFO } from "@/core/types/achat";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";

export default function AccueilFournisseur() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const { deconnexion } = useSession();
  const { enLigne } = useReseau();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [gainsPaye, setGainsPaye] = useState(0);
  const [gainsEnAttente, setGainsEnAttente] = useState(0);

  useEffect(() => {
    async function charger() {
      if (!profil) return;
      const a = await mesAchats(profil.id);
      setAchats(a);
      const paye = a.filter((x) => achatEstPayee(x.statut)).reduce((s, x) => s + achatMontant(x), 0);
      const enAttente = a.filter((x) => achatEstDu(x.statut)).reduce((s, x) => s + achatMontant(x), 0);
      setGainsPaye(paye);
      setGainsEnAttente(enAttente);
    }
    charger();
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
  return (
    <FondMboa>
      <EnTetePage
        titre="MBOA SUPPLIER"
        sousTitre={profil ? profil.village : ""}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
      />

      <div className="px-4 py-1 text-center text-aide">
        {enLigne ? "● Online" : "● Offline"}
      </div>

      {/* Gains */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <CarteMboa>
          <p className="text-aide text-[var(--mboa-text-doux)]">Already paid by Mboa</p>
          <p className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(gainsPaye)}</p>
        </CarteMboa>
        <CarteMboa>
          <p className="text-aide text-[var(--mboa-text-doux)]">To receive</p>
          <p className="text-chiffre text-[var(--mboa-error)]">{formaterFcfa(gainsEnAttente)}</p>
        </CarteMboa>
      </div>

      {/* Boutons */}
      <div className="flex-1 p-4 space-y-3">
        <BoutonMboa variant="primary" className="w-full !text-titre" onClick={() => router.push("/fournisseur/proposer")}>
          🏷️ Sell my harvest to Mboa
        </BoutonMboa>
        <BoutonMboa variant="surface" className="w-full !text-titre" onClick={() => router.push("/fournisseur/achats")}>
          📋 My sales to Mboa ({achats.length})
        </BoutonMboa>
        <BoutonMboa variant="surface" className="w-full !text-titre" onClick={() => router.push("/fournisseur/stock")}>
          📦 My stock at the counter
        </BoutonMboa>
      </div>

      {/* Ventes récentes */}
      {achats.length > 0 && (
        <div className="p-4">
          <h2 className="text-titre mb-2">Recent sales to Mboa</h2>
          {achats.slice(0, 3).map((a) => (
            <CarteMboa key={a.id} className="mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-corps font-bold">{a.nom}</span>
                  <p className="text-aide text-[var(--mboa-text-doux)]">{STATUT_ACHAT_INFO[a.statut].libelle}</p>
                </div>
                <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(achatMontant(a))}</span>
              </div>
            </CarteMboa>
          ))}
        </div>
      )}
    </FondMboa>
  );
}
