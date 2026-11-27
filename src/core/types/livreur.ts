/** Un moto qui porte les paniers. Table `public.livreurs`. */
export interface Livreur {
  id: string;
  nom: string;
  telephone: string;
  zone: string;
  profilId?: string | null;
  photo?: string | null;
  moto?: string | null;
  plaque?: string | null;
  tarifCourse: number;
  actif: boolean;
}

export function livreurRepere(l: Livreur): string {
  const p = l.plaque?.trim();
  if (p && p.length > 0) return p;
  const m = l.moto?.trim();
  if (m && m.length > 0) return m;
  return l.nom;
}

export function livreurFromMap(map: Record<string, unknown>): Livreur {
  return {
    id: map.id as string,
    nom: (map.nom as string) ?? "Livreur",
    telephone: (map.telephone_237 as string) ?? "",
    zone: (map.zone as string) ?? "",
    profilId: (map.profil_id as string) ?? null,
    photo: (map.photo as string) ?? null,
    moto: (map.moto as string) ?? null,
    plaque: (map.plaque as string) ?? null,
    tarifCourse: Math.round(Number(map.tarif_course ?? 0)),
    actif: (map.actif as boolean) ?? true,
  };
}

