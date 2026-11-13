/**
 * Notifications sonores de l'app (admin multi-postes).
 * Interrupteur persisté dans localStorage ; le bip est généré par
 * WebAudio (aucun fichier audio à embarquer).
 */

const CLE_ACTIF = "mboa-son-actif";
const CLE_DERNIER_VU = "mboa-activite-vue";

export function sonNotificationActif(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(CLE_ACTIF) !== "0";
}

export function basculerSonNotification(): boolean {
  const actif = !sonNotificationActif();
  try {
    localStorage.setItem(CLE_ACTIF, actif ? "1" : "0");
  } catch {
    /* stockage indisponible */
  }
  return actif;
}

/** Petit bip deux tons — joué uniquement si l'interrupteur est activé. */
export function jouerNotificationSonore(): void {
  if (!sonNotificationActif() || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const maintenant = ctx.currentTime;
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = maintenant + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
    window.setTimeout(() => void ctx.close(), 700);
  } catch {
    /* audio indisponible : silencieux */
  }
}

/**
 * À appeler quand le fil d'activité admin est (re)chargé : joue le bip
 * s'il y a des événements plus récents que la dernière visite.
 * Retourne le nombre de nouveaux événements.
 */
export function verifierNouvellesActivitesAdmin(nouveauxIds: string[]): number {
  if (typeof localStorage === "undefined" || nouveauxIds.length === 0) return 0;
  const dernier = localStorage.getItem(CLE_DERNIER_VU) ?? "";
  const frais = !dernier || nouveauxIds.includes(dernier) === false;
  // Le fil est trié du plus récent au plus ancien : le premier id est le plus récent.
  if (frais && nouveauxIds.length > 0) {
    const plusRecent = nouveauxIds[0];
    const connus = dernier ? nouveauxIds.indexOf(dernier) : -1;
    const nb = connus === -1 ? nouveauxIds.length : connus;
    if (nb > 0) jouerNotificationSonore();
    try {
      localStorage.setItem(CLE_DERNIER_VU, plusRecent);
    } catch {
      /* noop */
    }
    return nb;
  }
  try {
    localStorage.setItem(CLE_DERNIER_VU, nouveauxIds[0]);
  } catch {
    /* noop */
  }
  return 0;
}
