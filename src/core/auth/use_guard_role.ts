"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { AppRole } from "@/core/config/app_env";
import { Profil } from "@/core/types/profil";

/**
 * Garde de rôle côté client.
 *
 * Vérifie que l'utilisateur a une session active ET le bon rôle.
 * Si non, redirige vers /connexion ou son espace.
 *
 * IMPORTANT : on attend la fin de l'hydratation du store persisté
 * (localStorage) avant de conclure - sinon une ancienne session peut
 * écraser la nouvelle et provoquer une déconnexion fantôme.
 *
 * Usage : `const { pret, profil } = useGuardRole("admin");`
 * Si `!pret`, afficher un loader jusqu'à la redirection.
 */
export function useGuardRole(roleAttendu: AppRole): { pret: boolean; profil: Profil | null } {
  const router = useRouter();
  const { profil, role } = useSession();
  // `hasHydrated()` n'est pas réactif : on le suit via onFinishHydration
  // pour que `pret` passe à true dès que le store est restauré.
  const [hydrate, setHydrate] = useState(() =>
    typeof useSession.persist?.hasHydrated === "function"
      ? useSession.persist.hasHydrated()
      : true,
  );

  useEffect(() => {
    if (hydrate) return;
    // setState différé : la règle react-hooks interdit le setState
    // synchrone dans le corps d'un effet.
    const verif = setTimeout(() => {
      if (typeof useSession.persist?.hasHydrated === "function" && useSession.persist.hasHydrated()) {
        setHydrate(true);
      }
    }, 0);
    const off = useSession.persist?.onFinishHydration?.(() => setHydrate(true));
    return () => {
      clearTimeout(verif);
      off?.();
    };
  }, [hydrate]);

  useEffect(() => {
    if (!hydrate) return; // Attend la restauration de la session persistée.
    if (!profil) {
      router.replace("/connexion");
      return;
    }
    if (role !== roleAttendu) {
      router.replace(`/${role}`);
    }
  }, [hydrate, profil, role, roleAttendu, router]);

  return { pret: hydrate && !!profil && role === roleAttendu, profil };
}
