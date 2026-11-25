"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh mobile : tirer vers le bas depuis le haut de page
 * déclenche `onRefresh`. Retourne la distance de traction (0-90 px)
 * pour animer un indicateur, et `enCours` pendant le rechargement.
 *
 * Ne s'active que si la page est tout en haut (scrollY === 0) pour
 * ne jamais gêner le défilement normal.
 */
export function useTirageRafraichir(onRefresh: () => Promise<void> | void) {
  const [distance, setDistance] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const depart = useRef<number | null>(null);
  const declenche = useRef(false);

  useEffect(() => {
    const SEUIL = 70;
    const MAX = 90;

    function surDebut(e: TouchEvent) {
      if (window.scrollY <= 0 && !enCours) {
        depart.current = e.touches[0].clientY;
        declenche.current = false;
      } else {
        depart.current = null;
      }
    }

    function surMouvement(e: TouchEvent) {
      if (depart.current == null) return;
      const dy = e.touches[0].clientY - depart.current;
      if (dy <= 0 || window.scrollY > 0) {
        setDistance(0);
        return;
      }
      // Résistance progressive : la traction devient « dure ».
      const d = Math.min(MAX, dy * 0.55);
      setDistance(d);
      declenche.current = d >= SEUIL;
      // Empêche le rebond natif tant qu'on tire depuis le haut.
      if (window.scrollY <= 0 && dy > 0) e.preventDefault();
    }

    async function surFin() {
      if (depart.current == null) return;
      depart.current = null;
      if (declenche.current) {
        setEnCours(true);
        setDistance(MAX);
        try {
          await onRefresh();
        } finally {
          setEnCours(false);
          setDistance(0);
        }
      } else {
        setDistance(0);
      }
    }

    // `touchmove` en passif=false est requis pour preventDefault.
    window.addEventListener("touchstart", surDebut, { passive: true });
    window.addEventListener("touchmove", surMouvement, { passive: false });
    window.addEventListener("touchend", surFin);
    window.addEventListener("touchcancel", surFin);
    return () => {
      window.removeEventListener("touchstart", surDebut);
      window.removeEventListener("touchmove", surMouvement);
      window.removeEventListener("touchend", surFin);
      window.removeEventListener("touchcancel", surFin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enCours]);

  return { distance, enCours };
}
