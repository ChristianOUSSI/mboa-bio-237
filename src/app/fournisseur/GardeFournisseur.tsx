"use client";

import { useEffect, useState } from "react";
import { chargerFournisseurs } from "@/core/data/depots";
import { useSession } from "@/core/etat/store";
import { useTr } from "@/core/i18n";

/**
 * Bloque l'espace fournisseur tant que la candidature (fiche) n'est pas
 * validée par l'admin. La fiche est retrouvée par numéro de téléphone.
 */
export function GardeFournisseur({ children }: { children: React.ReactNode }) {
  const t = useTr();
  const profil = useSession((s) => s.profil);
  const [etat, setEtat] = useState<"chargement" | "autorise" | "attente">("chargement");

  useEffect(() => {
    let vivant = true;
    async function verifier() {
      if (!profil?.telephone) {
        if (vivant) setEtat("autorise");
        return;
      }
      const tel = profil.telephone.replace(/\D/g, "").slice(-9);
      const fiches = await chargerFournisseurs();
      const fiche = fiches.find(
        (f) => f.telephone.replace(/\D/g, "").slice(-9) === tel
      );
      if (!vivant) return;
      // Pas de fiche trouvée : on laisse passer (fiche peut ne pas encore synchroniser).
      setEtat(fiche && !fiche.actif ? "attente" : "autorise");
    }
    verifier();
    return () => {
      vivant = false;
    };
  }, [profil?.telephone]);

  if (etat === "chargement") {
    return <div className="min-h-screen bg-[var(--mboa-background)]" />;
  }
  if (etat === "attente") {
    return (
      <div className="min-h-screen bg-[var(--mboa-background)] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-ecran text-[var(--mboa-primary)]">{t("four.attente.titre")}</h1>
          <p className="text-corps text-[var(--mboa-text-doux)] mt-3 italic">
            {t("four.attente.texte")}
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
