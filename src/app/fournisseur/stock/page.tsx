"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { chargerStock } from "@/core/data/depots";
import { CarteMboa, EnTetePage, JaugeMboa, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Produit, produitJauge, produitDisponibilite } from "@/core/types/produit";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";

export default function StockFournisseurPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const [stock, setStock] = useState<Produit[]>([]);

  useEffect(() => {
    async function charger() {
      setStock(await chargerStock());
    }
    charger();
  }, []);

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
      <EnTetePage titre="My stock at the counter" onRetour={() => router.back()} />
      <p className="px-4 py-2 text-aide text-[var(--mboa-text-doux)]">
        Read-only: quantity enters through the counter&apos;s signature.
      </p>
      <div className="flex-1 p-4 space-y-2">
        {stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-corps text-[var(--mboa-text-doux)]">No stock yet</p>
          </div>
        ) : (
          stock.map((p) => (
            <CarteMboa key={p.id}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <BoutonVoix texte={`${p.nom}, ${produitDisponibilite(p)}`} />
                  <span className="text-corps font-bold">{p.nom}</span>
                </div>
                <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(p.prix)}</span>
              </div>
              <p className="text-aide text-[var(--mboa-text-doux)] mb-1">{produitDisponibilite(p)}</p>
              <JaugeMboa valeur={produitJauge(p)} />
            </CarteMboa>
          ))
        )}
      </div>
    </FondMboa>
  );
}
