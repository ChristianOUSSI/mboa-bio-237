import { useLangue } from "../i18n";

/** Date courte localisée selon la langue de l'app (fr-FR / en-GB). */
export function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const langue = useLangue.getState().langue;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(langue === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Date + heure courte localisée. */
export function formaterDateHeure(iso: string | null | undefined): string {
  if (!iso) return "";
  const langue = useLangue.getState().langue;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(langue === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
