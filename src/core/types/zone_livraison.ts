/** Zones de livraison paramétrables par l'admin : prix par quartier. */
export interface ZoneLivraison {
  id: string;
  nom: string;
  prix: number;
  /** Tarif par course pour le livreur (optionnel). Si null, utilise le tarif par défaut du livreur. */
  tarifCourse?: number | null;
  actif: boolean;
  createdLe?: string;
}

export function zoneFromMap(map: Record<string, unknown>): ZoneLivraison {
  return {
    id: (map.id as string) ?? "",
    nom: (map.nom as string) ?? "",
    prix: Math.round(Number(map.prix) || 0),
    tarifCourse: map.tarif_course != null ? Math.round(Number(map.tarif_course)) : null,
    actif: (map.actif as boolean) ?? true,
    createdLe: (map.created_le as string) ?? null,
  };
}

export function zonesParDefaut(): ZoneLivraison[] {
  return [
    { id: "akwa", nom: "Akwa", prix: 1000, tarifCourse: 800, actif: true },
    { id: "bali", nom: "Bali", prix: 1000, tarifCourse: 800, actif: true },
    { id: "bepanda", nom: "Bépanda", prix: 1000, tarifCourse: 800, actif: true },
    { id: "bonaberi", nom: "Bonabéri", prix: 1000, tarifCourse: 800, actif: true },
    { id: "bonamoussadi", nom: "Bonamoussadi", prix: 1000, tarifCourse: 800, actif: true },
    { id: "bonanjo", nom: "Bonanjo", prix: 1000, tarifCourse: 800, actif: true },
    { id: "bonapriso", nom: "Bonapriso", prix: 1000, tarifCourse: 800, actif: true },
    { id: "deido", nom: "Deïdo", prix: 1000, tarifCourse: 800, actif: true },
  ];
}
