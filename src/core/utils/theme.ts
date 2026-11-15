/**
 * Thème clair / sombre.
 * Choix persisté dans localStorage ("mboa-theme") ; par défaut on suit
 * prefers-color-scheme. Appliqué via `data-theme` sur <html>.
 */

export type Theme = "clair" | "sombre";
const CLE = "mboa-theme";

export function themeActuel(): Theme {
  if (typeof window === "undefined") return "clair";
  try {
    const v = window.localStorage.getItem(CLE);
    if (v === "sombre" || v === "clair") return v;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "sombre" : "clair";
  } catch {
    return "clair";
  }
}

export function appliquerTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function basculerTheme(): Theme {
  const suivant: Theme = themeActuel() === "sombre" ? "clair" : "sombre";
  try {
    window.localStorage.setItem(CLE, suivant);
  } catch {
    /* stockage indisponible */
  }
  appliquerTheme(suivant);
  return suivant;
}
