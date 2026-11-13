"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SplashMboa, FondMboa } from "@/core/design_system/composants";
import { useSession } from "@/core/etat/store";
import { profilActuel } from "@/core/data/depots";

export default function PageAccueil() {
  const router = useRouter();
  const { profil, setSession } = useSession();
  const [enChargement, setEnChargement] = useState(true);

  useEffect(() => {
    async function demarrer() {
      // Laisse le splash s'animer avant de basculer
      await new Promise((r) => setTimeout(r, 1600));
      const p = await profilActuel();
      if (p) {
        setSession(p, (p.role as never) ?? "consommateur");
        router.push(`/${p.role}`);
      } else {
        router.push("/connexion");
      }
      setEnChargement(false);
    }
    demarrer();
  }, [router, setSession]);

  if (enChargement) {
    return <SplashMboa />;
  }

  return (
    <FondMboa>
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <p className="text-corps text-[var(--mboa-text-doux)]">
          The earth feeds us, quality sets us apart
        </p>
      </div>
    </FondMboa>
  );
}
