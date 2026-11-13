import { Langue, langueResolve } from "./langue";

/** Un humain inscrit : producteur, admin ou cliente. Table `public.profiles`. */
export interface Profil {
  id: string;
  role: string;
  nom: string;
  village: string;
  telephone: string;
  langue: Langue;
  photoVisage?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  actif: boolean;
}

export function profilPrenom(p: Profil): string {
  const parties = p.nom.trim().split(/\s+/);
  if (parties.length === 0 || parties[0] === "") return "Producteur";
  if (parties.length === 1) return capitalise(parties[0]);
  return `${capitalise(parties[0])} ${parties.slice(1).join(" ").toUpperCase()}`;
}

function capitalise(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.substring(1).toLowerCase();
}

export function profilVitrine(p: Profil): string {
  return `${profilPrenom(p)} de ${p.village}`;
}

export function profilEstFournisseur(p: Profil): boolean {
  return p.role === "fournisseur";
}

export function profilEstAdmin(p: Profil): boolean {
  return p.role === "admin";
}

export function profilFromMap(map: Record<string, unknown>): Profil {
  return {
    id: map.id as string,
    role: (map.role as string) ?? "consommateur",
    nom: (map.nom as string) ?? "Nouveau",
    village: (map.village as string) ?? "Inconnu",
    telephone: (map.telephone_237 as string) ?? "",
    langue: langueResolve(map.langue as string),
    photoVisage: (map.photo_visage as string) ?? null,
    latitude: map.latitude != null ? Number(map.latitude) : null,
    longitude: map.longitude != null ? Number(map.longitude) : null,
    actif: (map.actif as boolean) ?? true,
  };
}
