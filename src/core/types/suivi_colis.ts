/** Les cinq étapes du suivi de colis, dans l'ordre du voyage. */
export enum JalonSuivi {
  panierPrepare = "panier_prepare",
  motoPartie = "moto_partie",
  enApproche = "en_approche",
  arrive = "arrive",
  remis = "remis",
}

export const JALON_SUIVI_INFO: Record<
  JalonSuivi,
  { libelle: string; description: string }
> = {
  [JalonSuivi.panierPrepare]: { libelle: "Basket prepared", description: "The counter packed the goods" },
  [JalonSuivi.motoPartie]: { libelle: "The bike left", description: "The driver loaded and left the depot" },
  [JalonSuivi.enApproche]: { libelle: "Driver approaching", description: "He is close, get ready" },
  [JalonSuivi.arrive]: { libelle: "Arrived at yours", description: "The bike is at your door" },
  [JalonSuivi.remis]: { libelle: "Handed over", description: "You confirmed reception" },
};

export const JALON_SUIVI_ORDRE: JalonSuivi[] = [
  JalonSuivi.panierPrepare,
  JalonSuivi.motoPartie,
  JalonSuivi.enApproche,
  JalonSuivi.arrive,
  JalonSuivi.remis,
];

export function jalonRang(j: JalonSuivi): number {
  return JALON_SUIVI_ORDRE.indexOf(j);
}

export function jalonResolve(slug?: string | null): JalonSuivi {
  if (!slug) return JalonSuivi.panierPrepare;
  const found = (Object.values(JalonSuivi) as string[]).includes(slug);
  return found ? (slug as JalonSuivi) : JalonSuivi.panierPrepare;
}

export function jalonEstAutomatique(j: JalonSuivi): boolean {
  return (
    j === JalonSuivi.panierPrepare ||
    j === JalonSuivi.motoPartie ||
    j === JalonSuivi.arrive ||
    j === JalonSuivi.remis
  );
}

/** Position GPS d'un point du trajet. */
export interface PositionGps {
  latitude: number;
  longitude: number;
  horodatage: string;
}

/** Le comptoir Mboa, point de départ de toutes les courses (Mbouda). */
export const DEPOT_MBOA: PositionGps = {
  latitude: 5.777,
  longitude: 10.671,
  horodatage: "",
};

/** Une ligne du journal de bord : un jalon, son horodatage, qui l'a posé, et sa position GPS. */
export interface EtapeSuivi {
  jalon: JalonSuivi;
  horodatage: string;
  auteur: string;
  position?: PositionGps | null;
}

export function etapeFromMap(map: Record<string, unknown>): EtapeSuivi {
  const pos = map.position as Record<string, unknown> | undefined;
  const lat = map.latitude ?? pos?.latitude;
  const lng = map.longitude ?? pos?.longitude;
  return {
    jalon: jalonResolve(map.jalon as string),
    horodatage: (map.horodatage as string) ?? new Date().toISOString(),
    auteur: (map.auteur as string) ?? "auto",
    position:
      lat != null && lng != null
        ? {
            latitude: Number(lat),
            longitude: Number(lng),
            horodatage: (map.horodatage as string) ?? new Date().toISOString(),
          }
        : null,
  };
}

/** La timeline complète d'une commande : les jalons posés, dans l'ordre, avec leurs positions GPS. */
export interface SuiviColis {
  commandeId: string;
  etapes: EtapeSuivi[];
  /** Position temps réel du livreur, mise à jour en continu pendant la course. */
  positionActuelle?: PositionGps | null;
  /** Position du dépôt (point de départ). */
  positionDepart?: PositionGps | null;
  /** Position de la cliente (destination). */
  positionDestination?: PositionGps | null;
}

export function suiviDerniereEtape(s: SuiviColis): EtapeSuivi | null {
  return s.etapes.length === 0 ? null : s.etapes[s.etapes.length - 1];
}

export function suiviDernierRang(s: SuiviColis): number {
  const derniere = suiviDerniereEtape(s);
  return derniere ? jalonRang(derniere.jalon) : -1;
}

export function suiviEnApproche(s: SuiviColis): boolean {
  return s.etapes.some((e) => e.jalon === JalonSuivi.enApproche);
}

export function suiviArrive(s: SuiviColis): boolean {
  return s.etapes.some((e) => e.jalon === JalonSuivi.arrive);
}

export function suiviRemis(s: SuiviColis): boolean {
  return s.etapes.some((e) => e.jalon === JalonSuivi.remis);
}

/** Une étape de la timeline, posée ou non. */
export interface EtapeTimeline {
  jalon: JalonSuivi;
  etape?: EtapeSuivi | null;
}

export function suiviTimeline(s: SuiviColis): EtapeTimeline[] {
  const parJalon = new Map<JalonSuivi, EtapeSuivi>();
  for (const e of s.etapes) {
    parJalon.set(e.jalon, e);
  }
  return JALON_SUIVI_ORDRE.map((jalon) => ({
    jalon,
    etape: parJalon.get(jalon) ?? null,
  }));
}

export function suiviVide(commandeId: string): SuiviColis {
  return { commandeId, etapes: [], positionActuelle: null, positionDepart: null, positionDestination: null };
}

export function suiviFromMaps(commandeId: string, maps: Record<string, unknown>[]): SuiviColis {
  const etapes = maps.map(etapeFromMap).sort(
    (a, b) => new Date(a.horodatage).getTime() - new Date(b.horodatage).getTime(),
  );
  return { commandeId, etapes, positionActuelle: null, positionDepart: null, positionDestination: null };
}

/** Reconstruit les jalons du suivi depuis le statut de la commande (mode hors-ligne). */
export function etapesDepuisStatut(statut: string, depuis: string): EtapeSuivi[] {
  const base = new Date(depuis).toISOString();
  const jalons: JalonSuivi[] = [];
  if (statut === "validee_admin") jalons.push(JalonSuivi.panierPrepare, JalonSuivi.motoPartie);
  else if (statut === "en_livraison") jalons.push(JalonSuivi.panierPrepare, JalonSuivi.motoPartie, JalonSuivi.enApproche);
  else if (statut === "livree") jalons.push(JalonSuivi.panierPrepare, JalonSuivi.motoPartie, JalonSuivi.enApproche, JalonSuivi.arrive);
  else if (statut === "recue") jalons.push(...JALON_SUIVI_ORDRE);
  return jalons.map((jalon) => ({ jalon, horodatage: base, auteur: "auto" }));
}

/** Distance en mètres entre deux coordonnées GPS (formule de Haversine). */
export function distanceGps(a: PositionGps, b: PositionGps): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Estime la distance restante en km, arrondie. */
export function distanceRestante(s: SuiviColis): string {
  if (!s.positionActuelle || !s.positionDestination) return "—";
  const d = distanceGps(s.positionActuelle, s.positionDestination);
  if (d < 1000) return `${d} m`;
  return `${(d / 1000).toFixed(1)} km`;
}

/** Estime le temps restant en minutes, à 30 km/h moyen en ville. */
export function tempsRestant(s: SuiviColis): string {
  if (!s.positionActuelle || !s.positionDestination) return "—";
  const d = distanceGps(s.positionActuelle, s.positionDestination);
  const minutes = Math.round((d / 30000) * 60);
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}
