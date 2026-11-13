"use client";

import { useEffect } from "react";
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
 * Usage : `const { pret, profil } = useGuardRole("admin");`
 * Si `!pret`, afficher un loader jusqu'à la redirection.
 */
export function useGuardRole(roleAttendu: AppRole): { pret: boolean; profil: Profil | null } {
  const router = useRouter();
  const { profil, role } = useSession();

  useEffect(() => {
    if (!profil) {
      router.replace("/connexion");
      return;
    }
    if (role !== roleAttendu) {
      router.replace(`/${role}`);
    }
  }, [profil, role, roleAttendu, router]);

  return { pret: !!profil && role === roleAttendu, profil };
}
