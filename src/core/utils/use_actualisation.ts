"use client";

import { useEffect, useRef } from "react";

/**
 * Recharge les données au montage, toutes les `ms` millisecondes et
 * chaque fois que l'onglet redevient visible. `charger` est lu via une
 * ref pour éviter de réinitialiser le minuteur à chaque rendu.
 */
export function useActualisation(charger: () => void | Promise<void>, ms = 30000) {
  const ref = useRef(charger);

  // La ref est mise à jour dans un effet (jamais pendant le render).
  useEffect(() => {
    ref.current = charger;
  });

  useEffect(() => {
    void ref.current();
    const timer = setInterval(() => {
      // Pas de requêtes quand l'onglet est caché : ça économise data et
      // batterie, et le retour sur l'onglet déclenche déjà un rechargement.
      if (document.visibilityState === "visible") void ref.current();
    }, ms);
    const auRetour = () => {
      if (document.visibilityState === "visible") void ref.current();
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [ms]);
}
