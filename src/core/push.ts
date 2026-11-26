import { mboaReseau } from "./data/mboa_reseau";
import { Profil } from "./types/profil";

/**
 * Notifications push Web Push (PWA).
 *
 * Inactif tant que NEXT_PUBLIC_VAPID_PUBLIC_KEY n'est pas défini :
 * la souscription est simplement ignorée, l'app fonctionne en
 * notification locale (app ouverte) uniquement.
 *
 * La permission n'est demandée QUE si elle a déjà été accordée par
 * l'utilisateur ailleurs dans l'app (on ne harcèle pas au démarrage).
 */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64VersUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i);
  return out;
}

/** Vrai si le push est configuré côté client (clé VAPID + SW). */
export function pushDisponible(): boolean {
  return (
    VAPID_PUBLIC.length > 0 &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

/**
 * Abonne l'appareil courant aux notifications push pour ce profil.
 * Idempotent : un appel par session suffit, on vérifie l'abonnement
 * existant avant d'en créer un.
 */
export async function configurerPush(profil: Profil): Promise<void> {
  if (!pushDisponible() || Notification.permission !== "granted") return;
  const client = mboaReseau();
  if (!client) return;

  try {
    const enregistrement = await navigator.serviceWorker.ready;
    const existant = await enregistrement.pushManager.getSubscription();
    const cleServeur = urlBase64VersUint8(VAPID_PUBLIC);
    const abonnement =
      existant ??
      (await enregistrement.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cleServeur as BufferSource,
      }));

    const json = abonnement.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    const { error } = await client.from("push_subscriptions").upsert(
      {
        endpoint: json.endpoint,
        profil_id: profil.id,
        role: profil.role,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        created_le: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) console.warn("push: enregistrement abonnement", error.message);
  } catch (e) {
    // Navigateurs sans push ou permission révoquée : silencieux.
    console.warn("push: configuration impossible", e);
  }
}

/**
 * Demande la permission notifications PUIS abonne — à n'appeler
 * qu'au moment opportun (ex. fin de commande), jamais au démarrage.
 */
export async function activerPush(profil: Profil): Promise<boolean> {
  if (!pushDisponible()) return false;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    await configurerPush(profil);
    return true;
  } catch {
    return false;
  }
}
