"use client";

import { useState } from "react";
import { useTr } from "../i18n";

const CLE_VU = "mboa_onboarding_vu";

/**
 * Visite guidée 3 écrans affichée une seule fois au premier passage
 * sur le marché. Overlays fullscreen, dismissible.
 */
export function estOnboardingVu(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(CLE_VU) === "1";
}

export function marquerOnboardingVu(): void {
  try {
    localStorage.setItem(CLE_VU, "1");
  } catch {
    /* noop */
  }
}

const SLIDES = [
  { emoji: "🛒", cle: "ob.1.titre", sousCle: "ob.1.texte" },
  { emoji: "🚚", cle: "ob.2.titre", sousCle: "ob.2.texte" },
  { emoji: "🏷️", cle: "ob.3.titre", sousCle: "ob.3.texte" },
] as const;

export function OnboardingMboa({ onTermine }: { onTermine: () => void }) {
  const t = useTr();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const dernier = index === SLIDES.length - 1;

  function suivant() {
    if (dernier) {
      marquerOnboardingVu();
      onTermine();
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(20,40,22,0.55)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-label={t("ob.titre")}
    >
      <div className="bg-[var(--mboa-surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-8 anim-apparition">
        {/* pastilles de progression */}
        <div className="flex gap-2 justify-center mb-6">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 28 : 8,
                background: i <= index ? "var(--mboa-primary)" : "var(--mboa-border)",
              }}
            />
          ))}
        </div>

        <div className="text-center">
          <span className="text-7xl block anim-flottant" aria-hidden>{slide.emoji}</span>
          <h2 className="text-titre titre-section mt-4">{t(slide.cle)}</h2>
          <p className="text-corps text-[var(--mboa-text-doux)] mt-2">{t(slide.sousCle)}</p>
        </div>

        <div className="flex gap-3 mt-8">
          {!dernier && (
            <button
              onClick={() => { marquerOnboardingVu(); onTermine(); }}
              className="flex-1 py-3 rounded-xl text-aide font-bold"
              style={{ background: "var(--mboa-surface-doux)", border: "1px solid var(--mboa-border)" }}
            >
              {t("ob.passer")}
            </button>
          )}
          <button
            onClick={suivant}
            className="flex-1 py-3 rounded-xl text-corps font-bold text-white"
            style={{ background: "var(--mboa-primary)" }}
          >
            {dernier ? t("ob.commencer") : `${t("ob.suivant")} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
