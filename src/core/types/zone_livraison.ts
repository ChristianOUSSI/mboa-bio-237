/** Zones de livraison paramétrables par l'admin : prix par quartier. */
export interface ZoneLivraison {
  id: string;
  nom: string;
  prix: number;
  actif: boolean;
  createdLe?: string;
}

export function zoneFromMap(map: Record<string, unknown>): ZoneLivraison {
  return {
    id: (map.id as string) ?? "",
    nom: (map.nom as string) ?? "",
    prix: Math.round(Number(map.prix) || 0),
    actif: (map.actif as boolean) ?? true,
    createdLe: (map.created_le as string) ?? null,
  };
}

export function zonesParDefaut(): ZoneLivraison[] {
  return [
    { id: "akwa", nom: "Akwa", prix: 1000, actif: true },
    { id: "bali", nom: "Bali", prix: 1000, actif: true },
    { id: "bepanda", nom: "Bépanda", prix: 1000, actif: true },
    { id: "bonaberi", nom: "Bonabéri", prix: 1000, actif: true },
    { id: "bonamoussadi", nom: "Bonamoussadi", prix: 1000, actif: true },
    { id: "bonanjo", nom: "Bonanjo", prix: 1000, actif: true },
    { id: "bonapriso", nom: "Bonapriso", prix: 1000, actif: true },
    { id: "deido", nom: "Deïdo", prix: 1000, actif: true },
  ];
}
