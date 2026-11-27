/** Langue de lecture choisie au profil. Table `public.profiles.langue`. */
export enum Langue {
  en = "en",
  fr = "fr",
  bassa = "bassa",
  bamoun = "bamoun",
  pidgin = "pidgin",
}

export function langueResolve(slug?: string | null): Langue {
  if (!slug) return Langue.en;
  const found = (Object.values(Langue) as string[]).includes(slug);
  return found ? (slug as Langue) : Langue.en;
}
