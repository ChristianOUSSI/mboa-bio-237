import { StatutCommande, statutCommandeResolve } from "./statuts";

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
  [JalonSuivi.panierPrepare]: { libelle: "Panier préparé", description: "Le comptoir a emballé la marchandise" },
  [JalonSuivi.motoPartie]: { libelle: "La moto est partie", description: "Le livreur a chargé et quitté le dépôt" },
  [JalonSuivi.enApproche]: { libelle: "Livreur en approche", description: "Il est proche, préparez-vous" },
  [JalonSuivi.arrive]: { libelle: "Arrivé chez vous", description: "La moto est devant votre porte" },
  [JalonSuivi.remis]: { libelle: "Remis", description: "Vous avez confirmé la réception" },
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
  // Chaque statut ne coche que les jalons réellement atteints :
  // validé = panier en préparation, la moto ne part qu'à en_livraison.
  if (statut === "validee_admin") jalons.push(JalonSuivi.panierPrepare);
  else if (statut === "en_livraison") jalons.push(JalonSuivi.panierPrepare, JalonSuivi.motoPartie, JalonSuivi.enApproche);
  else if (statut === "livree") jalons.push(JalonSuivi.panierPrepare, JalonSuivi.motoPartie, JalonSuivi.enApproche, JalonSuivi.arrive);
  else if (statut === "recue") jalons.push(...JALON_SUIVI_ORDRE);
  return jalons.map((jalon) => ({ jalon, horodatage: base, auteur: "auto" }));
}

/** Rayon (mètres) auquel le livreur est « en approche » puis « arrivé ». */
export const RAYON_APPROCHE_M = 3000;
export const RAYON_ARRIVE_M = 400;
/** Au-delà, une position livreur est trop vieille pour déduire un jalon. */
const POSITION_FRAICHE_MS = 15 * 60 * 1000;

function positionFraiche(p?: PositionGps | null): p is PositionGps {
  if (!p?.horodatage) return false;
  const t = new Date(p.horodatage).getTime();
  return !isNaN(t) && Date.now() - t < POSITION_FRAICHE_MS;
}

/**
 * Reconstruit les jalons depuis l'état RÉEL : statut de la commande +
 * position GPS du livreur. « En approche » et « arrivé » ne sont cochés
 * que si le GPS le prouve - jamais sur la foi du seul statut.
 */
export function etapesDepuisEtat(
  statut: string,
  createdLe: string,
  livreeLe?: string | null,
  recueLe?: string | null,
  positionActuelle?: PositionGps | null,
  positionDestination?: PositionGps | null,
): EtapeSuivi[] {
  const s = statutCommandeResolve(statut);
  if (s === StatutCommande.nouvelle || s === StatutCommande.annulee) return [];
  const parJalon = new Map<JalonSuivi, EtapeSuivi>();
  const poser = (jalon: JalonSuivi, horodatage: string, auteur = "auto", position?: PositionGps | null) =>
    parJalon.set(jalon, { jalon, horodatage, auteur, position: position ?? null });

  // Jalons certains, déduits du statut.
  poser(JalonSuivi.panierPrepare, createdLe);
  if (s === StatutCommande.enLivraison || s === StatutCommande.livree || s === StatutCommande.recue) {
    poser(JalonSuivi.motoPartie, createdLe);
  }
  if (s === StatutCommande.livree || s === StatutCommande.recue) {
    poser(JalonSuivi.arrive, livreeLe ?? createdLe);
  }
  if (s === StatutCommande.recue) {
    poser(JalonSuivi.remis, recueLe ?? livreeLe ?? createdLe);
  }

  // Jalons déduits de la position RÉELLE du livreur (GPS frais uniquement).
  // « Arrivé » peut donc être coché pendant que le statut est encore
  // en_livraison : c'est la vraie position qui parle.
  if (positionFraiche(positionActuelle) && positionDestination && s !== StatutCommande.recue) {
    const d = distanceGps(positionActuelle, positionDestination);
    if (d <= RAYON_ARRIVE_M) {
      poser(JalonSuivi.enApproche, positionActuelle.horodatage, "gps", positionActuelle);
      if (!parJalon.has(JalonSuivi.arrive)) {
        poser(JalonSuivi.arrive, positionActuelle.horodatage, "gps", positionActuelle);
      }
    } else if (d <= RAYON_APPROCHE_M) {
      poser(JalonSuivi.enApproche, positionActuelle.horodatage, "gps", positionActuelle);
    }
  }
  return JALON_SUIVI_ORDRE.map((j) => parJalon.get(j)).filter((e): e is EtapeSuivi => !!e);
}

/**
 * Fusionne les jalons enregistrés (faits) avec ceux déduits de l'état
 * réel. Les jalons « en approche » / « arrivé » déduits du GPS temps
 * réel priment : ils reflètent la position actuelle du livreur.
 */
export function fusionnerEtapes(stored: EtapeSuivi[], derivees: EtapeSuivi[]): EtapeSuivi[] {
  const parJalon = new Map<JalonSuivi, EtapeSuivi>();
  for (const e of stored) parJalon.set(e.jalon, e);
  for (const e of derivees) {
    const existant = parJalon.get(e.jalon);
    if (!existant || e.jalon === JalonSuivi.enApproche || e.jalon === JalonSuivi.arrive) {
      parJalon.set(e.jalon, e);
    }
  }
  return JALON_SUIVI_ORDRE.map((j) => parJalon.get(j)).filter((e): e is EtapeSuivi => !!e);
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
  if (!s.positionActuelle || !s.positionDestination) return "N/A";
  const d = distanceGps(s.positionActuelle, s.positionDestination);
  if (d < 1000) return `${d} m`;
  return `${(d / 1000).toFixed(1)} km`;
}

/** Estime le temps restant en minutes, à 30 km/h moyen en ville. */
export function tempsRestant(s: SuiviColis): string {
  if (!s.positionActuelle || !s.positionDestination) return "N/A";
  const d = distanceGps(s.positionActuelle, s.positionDestination);
  const minutes = Math.round((d / 30000) * 60);
  if (minutes < 1) return "< 1 min";
  return `${minutes} min`;
}
