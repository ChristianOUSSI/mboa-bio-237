// Test unitaire : regroupement des messages en conversations.
// Vérifie cleConversation, grouperPourUtilisateur (livreur) et
// grouperConversations (admin) — le routage direct client↔livreur.
// Usage : node scripts/test_conversations.mjs
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const out = mkdtempSync(join(tmpdir(), "mboa-test-"));
let ok = 0;
let ko = 0;
function verifie(nom, cond) {
  if (cond) { ok++; console.log(`  OK  ${nom}`); }
  else { ko++; console.log(`  KO  ${nom}`); }
}

function msg(partiel) {
  return {
    id: partiel.id ?? Math.random().toString(36).slice(2),
    expediteurId: "",
    expediteurRole: "consommateur",
    expediteurNom: "",
    destinataireId: null,
    destinataireRole: null,
    texte: " salut ",
    audio: null,
    lu: false,
    createdLe: "2026-01-01T10:00:00.000Z",
    ...partiel,
  };
}

try {
  execSync(
    `npx tsc src/core/utils/conversations.ts --outDir "${out}" --module commonjs --target es2021 --esModuleInterop --skipLibCheck`,
    { stdio: "pipe" },
  );
  const c = await import(pathToFileURL(join(out, "utils/conversations.js")).href);
  const { CLE_EQUIPE } = c;

  // Identifiants : client C, livreur L, admin A.
  const CLIENT = "client-1", LIVREUR = "liv-1", ADMIN = "admin-1";

  const msgs = [
    // Client → livreur (conversation directe)
    msg({ id: "m1", expediteurId: CLIENT, expediteurRole: "consommateur", expediteurNom: "Amina",
      destinataireId: LIVREUR, destinataireRole: "livreur", createdLe: "2026-01-01T10:00:00Z" }),
    // Livreur → client
    msg({ id: "m2", expediteurId: LIVREUR, expediteurRole: "livreur", expediteurNom: "Jean",
      destinataireId: CLIENT, destinataireRole: "consommateur", createdLe: "2026-01-01T10:01:00Z" }),
    // Client → équipe admin (broadcast)
    msg({ id: "m3", expediteurId: CLIENT, expediteurRole: "consommateur", expediteurNom: "Amina",
      createdLe: "2026-01-01T10:02:00Z" }),
    // Admin → client (réponse directe)
    msg({ id: "m4", expediteurId: ADMIN, expediteurRole: "admin", expediteurNom: "Comptoir",
      destinataireId: CLIENT, destinataireRole: "consommateur", createdLe: "2026-01-01T10:03:00Z" }),
  ];

  console.log("— cleConversation : vue livreur —");
  verifie("client→livreur : clé = client",
    c.cleConversation(msgs[0], LIVREUR) === CLIENT);
  verifie("livreur→client : clé = client",
    c.cleConversation(msgs[1], LIVREUR) === CLIENT);
  // m3 est un broadcast client→admins : invisible pour le livreur
  // (messagesPour le filtre), mais si lu, sa clé serait le client.
  verifie("broadcast client→admins : clé = client (invisible anyway)",
    c.cleConversation(msgs[2], LIVREUR) === CLIENT);
  verifie("message admin : clé = équipe",
    c.cleConversation(msgs[3], LIVREUR) === CLE_EQUIPE);

  console.log("— cleConversation : vue client —");
  verifie("client→livreur : clé = livreur",
    c.cleConversation(msgs[0], CLIENT) === LIVREUR);
  verifie("livreur→client : clé = livreur",
    c.cleConversation(msgs[1], CLIENT) === LIVREUR);
  verifie("broadcast : clé = équipe",
    c.cleConversation(msgs[2], CLIENT) === CLE_EQUIPE);
  verifie("admin→client : clé = équipe",
    c.cleConversation(msgs[3], CLIENT) === CLE_EQUIPE);

  // messagesPour ne donne au livreur que ses messages + ceux des admins :
  // le broadcast m3 (client → admins) ne le concerne pas.
  const visiblesLivreur = [msgs[0], msgs[1], msgs[3]];
  console.log("— grouperPourUtilisateur (livreur) —");
  const convsL = c.grouperPourUtilisateur(visiblesLivreur, LIVREUR);
  verifie("2 conversations : client + équipe",
    convsL.length === 2);
  const convClient = convsL.find((x) => x.cle === CLIENT);
  verifie("fil client : 2 messages (aller-retour)",
    convClient?.messages.length === 2);
  verifie("fil client : nom = Amina, rôle consommateur",
    convClient?.nom === "Amina" && convClient?.role === "consommateur");
  const convEquipe = convsL.find((x) => x.cle === CLE_EQUIPE);
  verifie("fil équipe : 1 message (réponse admin)",
    convEquipe?.messages.length === 1);

  console.log("— grouperConversations (admin) —");
  const convsA = c.grouperConversations(msgs);
  verifie("2 conversations : client + livreur",
    convsA.length === 2);
  const convAdminClient = convsA.find((x) => x.cle === CLIENT);
  verifie("fil client : 3 messages (direct livreur + broadcast + admin)",
    convAdminClient?.messages.length === 3);
  const convAdminLivreur = convsA.find((x) => x.cle === LIVREUR);
  verifie("fil livreur : 1 message (sa réponse au client)",
    convAdminLivreur?.messages.length === 1);

  console.log("— ordre : dernier message le plus récent d'abord —");
  // équipe : dernier msg 10:03 ; client : 10:01 → équipe en premier.
  verifie("première conv = équipe (dernier msg 10:03)",
    convsL[0]?.cle === CLE_EQUIPE);

  console.log(`— ${ok} OK, ${ko} KO —`);
  if (ko > 0) process.exit(1);
} catch (e) {
  console.error("ERREUR", e);
  process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
