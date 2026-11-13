/** Langue de lecture choisie au profil. Table `public.profiles.langue`. */
export enum Langue {
  en = "en",
  fr = "fr",
  bassa = "bassa",
  bamoun = "bamoun",
  pidgin = "pidgin",
}

export const LANGUE_INFO: Record<Langue, { libelle: string; codeTts: string }> = {
  [Langue.en]: { libelle: "English", codeTts: "en-US" },
  [Langue.fr]: { libelle: "Français", codeTts: "fr-FR" },
  [Langue.bassa]: { libelle: "Bassa", codeTts: "fr-FR" },
  [Langue.bamoun]: { libelle: "Bamoun", codeTts: "fr-FR" },
  [Langue.pidgin]: { libelle: "Pidgin", codeTts: "en-US" },
};

export function langueResolve(slug?: string | null): Langue {
  if (!slug) return Langue.en;
  const found = (Object.values(Langue) as string[]).includes(slug);
  return found ? (slug as Langue) : Langue.en;
}
