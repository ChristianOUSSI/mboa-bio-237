// Edge Function « notifier-push » — envoie les notifications Web Push.
//
// Déclenchée par les webhooks Supabase (Database → Webhooks) :
//   - INSERT sur public.messages   → notifie le destinataire
//     (destinataire_id null = tous les admins)
//   - UPDATE sur public.commandes  → notifie le client (changement de
//     statut) ou le livreur (assignation livreur_id / statut livré)
//
// Secrets requis (supabase secrets set) :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Déploiement : supabase functions deploy notifier-push
// Voir supabase/push.sql pour la marche complète.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@mboa237.cm";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Rôles considérés « équipe » : un message sans destinataire leur va.
const ROLES_ADMIN = ["admin", "superadmin"];

type Payload = {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

type Notification = { titre: string; corps: string; url?: string; tag?: string };

/** Abonnements filtrés par profil OU par rôle. */
async function abonnementsPour(profilId?: string | null, role?: string | null) {
  let q = admin.from("push_subscriptions").select("endpoint,p256dh,auth");
  if (profilId) q = q.eq("profil_id", profilId);
  else if (role) q = q.eq("role", role);
  const { data, error } = await q;
  if (error) {
    console.error("push: lecture abonnements", error.message);
    return [];
  }
  return data ?? [];
}

async function envoyer(profilId: string | null, role: string | null, notif: Notification) {
  // Destinataire précis → son profil ; sinon le rôle ; sinon (broadcast)
  // tous les rôles admin.
  let cibles;
  if (profilId) {
    cibles = await abonnementsPour(profilId);
  } else {
    const roles = role ? [role] : ROLES_ADMIN;
    const listes = await Promise.all(roles.map((r) => abonnementsPour(null, r)));
    cibles = listes.flat();
  }

  const corps = JSON.stringify({
    title: notif.titre,
    body: notif.corps,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: notif.tag,
    data: { url: notif.url ?? "/" },
  });

  await Promise.all(
    cibles.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          corps,
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Abonnement mort (404/410) : on le purge.
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        } else {
          console.error("push: envoi", s.endpoint.slice(-24), status ?? e);
        }
      }
    }),
  );
}

/** Message entrant → destinataire direct ou toute l'équipe admin. */
async function notifMessage(r: Record<string, unknown>) {
  const expediteur = String(r.expediteur_nom ?? "");
  const destinataireId = (r.destinataire_id as string) ?? null;
  const destinataireRole = (r.destinataire_role as string) ?? null;
  const texte = String(r.texte ?? "").slice(0, 140) || "🎤 Message vocal";

  await envoyer(destinataireId, destinataireRole, {
    titre: "💬 MBOA BIO",
    corps: `${expediteur || "Nouveau"} : ${texte}`,
    url: "/messages",
    tag: `msg-${String(r.id ?? Date.now())}`,
  });
}

/** Commande : changement de statut → client ; assignation → livreur. */
async function notifCommande(r: Record<string, unknown>, old?: Record<string, unknown>) {
  const statut = String(r.statut_enum ?? r.statut ?? "");
  const ancienStatut = String(old?.statut_enum ?? old?.statut ?? "");
  const consommateurId = String(r.consommateur_id ?? "");

  const libelles: Record<string, string> = {
    nouvelle: "Nouvelle commande",
    validee_admin: "Votre panier est préparé",
    en_livraison: "La moto est partie",
    livree: "Colis livré — confirmez la réception",
    recue: "Réception confirmée",
    annulee: "Commande annulée",
  };

  // Changement de statut → le client.
  if (statut && statut !== ancienStatut && consommateurId) {
    await envoyer(consommateurId, null, {
      titre: "📦 MBOA BIO",
      corps: libelles[statut] ?? `Statut : ${statut}`,
      url: "/consommateur/suivi",
      tag: `cmd-${String(r.id ?? "")}-${statut}`,
    });
  }

  // Assignation livreur (livreur_id fiche → profil via table livreurs).
  const livreurId = (r.livreur_id as string) ?? null;
  const ancienLivreur = (old?.livreur_id as string) ?? null;
  if (livreurId && livreurId !== ancienLivreur) {
    const { data: fiche } = await admin
      .from("livreurs")
      .select("profil_id, nom")
      .eq("id", livreurId)
      .maybeSingle();
    const profilId = (fiche?.profil_id as string) ?? null;
    if (profilId) {
      await envoyer(profilId, "livreur", {
        titre: "🏍️ MBOA BIO",
        corps: `Nouvelle course assignée${fiche?.nom ? ` — ${String(r.id ?? "").slice(0, 8)}` : ""}`,
        url: "/livreur",
        tag: `liv-${String(r.id ?? "")}`,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const record = payload.record ?? {};
  try {
    if (payload.table === "messages" && payload.type === "INSERT") {
      await notifMessage(record);
    } else if (payload.table === "commandes" && payload.type === "UPDATE") {
      await notifCommande(record, payload.old_record);
    }
  } catch (e) {
    console.error("notifier-push:", e);
    return new Response("error", { status: 500 });
  }
  return new Response("ok");
});
