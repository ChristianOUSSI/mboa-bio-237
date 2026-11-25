import { Annonce, TYPE_ANNONCE_INFO } from "../types/annonce";
import { annonceExpiree } from "./promos";

const CLE_VUES = "mboa_annonces_vues";

/**
 * Détecte les annonces actives jamais vues sur cet appareil et les
 * notifie (Notification système si permission accordée + son discret).
 * Appelé à chaque chargement du marché - la synchro fait le reste.
 */
export async function notifierNouvellesAnnonces(annonces: Annonce[]): Promise<void> {
  try {
    const vues = new Set(
      (JSON.parse(localStorage.getItem(CLE_VUES) ?? "[]") as string[]) ?? [],
    );
    const nouvelles = annonces.filter(
      (a) => a.actif && !annonceExpiree(a) && !vues.has(a.id),
    );
    // Mémorise tout ce qui est actif, même sans permission : on ne
    // notifie qu'une fois par appareil et par annonce.
    for (const a of annonces) if (a.actif) vues.add(a.id);
    localStorage.setItem(CLE_VUES, JSON.stringify([...vues].slice(-200)));

    if (nouvelles.length === 0) return;
    const { jouerNotificationSonore } = await import("./son");
    for (const a of nouvelles.slice(0, 3)) {
      const info = TYPE_ANNONCE_INFO[a.type] ?? TYPE_ANNONCE_INFO.info;
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(`MBOA BIO - ${info.libelle}`, {
          body: a.titre + (a.texte ? ` : ${a.texte}` : ""),
          icon: "/icon-192.png",
          tag: a.id,
        });
      }
    }
    jouerNotificationSonore();
  } catch {
    // Jamais bloquant pour l'affichage du marché.
  }
}
