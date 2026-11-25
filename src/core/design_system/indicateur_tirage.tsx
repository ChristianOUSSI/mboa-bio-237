"use client";

import { useTr } from "../i18n";

/** Indicateur visuel du pull-to-refresh : flèche qui pivote avec la
 *  traction, puis mention « Actualisation… » pendant le rechargement.
 *  Rendu en fixed en haut de l'écran - ne bouge pas la mise en page. */
export function IndicateurTirage({ distance, enCours, cleTexte = "march.rafraichit" }: {
  distance: number;
  enCours: boolean;
  cleTexte?: string;
}) {
  const t = useTr();
  if (distance <= 4 && !enCours) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-corps font-bold"
      style={{
        top: "calc(0.75rem + env(safe-area-inset-top, 0px))",
        background: "var(--mboa-surface)",
        color: "var(--mboa-primary)",
        border: "1px solid var(--mboa-border)",
        opacity: Math.min(1, distance / 50),
        transition: enCours ? "none" : "opacity 0.15s ease",
      }}
      aria-live="polite"
    >
      <span
        className={enCours ? "anim-pulsation" : ""}
        style={{
          display: "inline-block",
          transform: enCours ? "none" : `rotate(${Math.min(distance * 2.4, 180)}deg)`,
          transition: "transform 0.1s linear",
        }}
        aria-hidden
      >
        {enCours ? "🔄" : "↓"}
      </span>
      {enCours ? t(cleTexte) : ""}
    </div>
  );
}
