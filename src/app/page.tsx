"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SplashMboa, FondMboa } from "@/core/design_system/composants";
import { useSession } from "@/core/etat/store";
import { useTr } from "@/core/i18n";
import { profilActuel, ouvrirSessionLocale } from "@/core/data/depots";

export default function PageAccueil() {
  const router = useRouter();
  const { profil, setSession } = useSession();
  const t = useTr();
  const [enChargement, setEnChargement] = useState(true);

  useEffect(() => {
    async function demarrer() {
      // Laisse le splash s'animer avant de basculer
      await new Promise((r) => setTimeout(r, 1600));
      // Priorité à la session persistée (localStorage Zustand) : elle
      // survit même si IndexedDB a été réparé/vidé. `profilActuel`
      // (IndexedDB) ne sert que de repli.
      const p = profil ?? (await profilActuel());
      if (p) {
        setSession(p, (p.role as never) ?? "consommateur");
        // Repare `session_id` si IndexedDB l'avait perdu.
        ouvrirSessionLocale(p).catch(() => {});
        router.push(`/${p.role}`);
      } else {
        router.push("/connexion");
      }
      setEnChargement(false);
    }
    demarrer();
  }, [router, setSession, profil]);

  if (enChargement) {
    return <SplashMboa />;
  }

  return (
    <FondMboa>
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <p className="text-corps text-[var(--mboa-text-doux)]">
          {t("app.slogan")}
        </p>
      </div>
    </FondMboa>
  );
}
