// Test unitaire : jalons de suivi déduits de l'état réel.
// Vérifie etapesDepuisEtat (statut + GPS) et fusionnerEtapes (priorités).
// Usage : node scripts/test_suivi.mjs
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

const CREATED = "2026-01-01T10:00:00.000Z";
const LIVREE = "2026-01-01T11:00:00.000Z";
const RECUE = "2026-01-01T11:30:00.000Z";
const MAINTENANT = new Date().toISOString();

// Position à ~100 m de la destination (dans le rayon « arrivé »).
const client = { latitude: 5.78, longitude: 10.67, horodatage: MAINTENANT };
const livreurProche = { latitude: 5.7805, longitude: 10.6705, horodatage: MAINTENANT };
// Position à ~5 km (hors rayon approche 3 km).
const livreurLoin = { latitude: 5.83, longitude: 10.72, horodatage: MAINTENANT };
// Position périmée (> 15 min).
const livreurVieux = { latitude: 5.7805, longitude: 10.6705, horodatage: "2026-01-01T08:00:00.000Z" };

try {
  execSync(
    `npx tsc src/core/types/suivi_colis.ts --outDir "${out}" --module commonjs --target es2021 --esModuleInterop --skipLibCheck`,
    { stdio: "pipe" },
  );
  const s = await import(pathToFileURL(join(out, "suivi_colis.js")).href);
  const { JalonSuivi } = s;
  const jalons = (etapes) => etapes.map((e) => e.jalon);

  console.log("— etapesDepuisEtat : statut seul —");
  verifie("nouvelle → aucun jalon",
    s.etapesDepuisEtat("nouvelle", CREATED).length === 0);
  verifie("annulee → aucun jalon",
    s.etapesDepuisEtat("annulee", CREATED).length === 0);
  verifie("validee_admin → panier_prepare seul",
    JSON.stringify(jalons(s.etapesDepuisEtat("validee_admin", CREATED))) ===
      JSON.stringify([JalonSuivi.panierPrepare]));
  verifie("en_livraison → préparation + moto partie, PAS approche sans GPS",
    JSON.stringify(jalons(s.etapesDepuisEtat("en_livraison", CREATED))) ===
      JSON.stringify([JalonSuivi.panierPrepare, JalonSuivi.motoPartie]));
  verifie("livree → + arrivé, horodaté livreeLe",
    (() => {
      const e = s.etapesDepuisEtat("livree", CREATED, LIVREE);
      const arrive = e.find((x) => x.jalon === JalonSuivi.arrive);
      return arrive?.horodatage === LIVREE;
    })());
  verifie("recue → les 5 jalons, remis horodaté recueLe",
    (() => {
      const e = s.etapesDepuisEtat("recue", CREATED, LIVREE, RECUE);
      const remis = e.find((x) => x.jalon === JalonSuivi.remis);
      return e.length === 5 && remis?.horodatage === RECUE;
    })());

  console.log("— etapesDepuisEtat : GPS réel —");
  verifie("livreur à ~100 m → approche + arrivé (auteur gps)",
    (() => {
      const e = s.etapesDepuisEtat("en_livraison", CREATED, null, null, livreurProche, client);
      const j = jalons(e);
      return j.includes(JalonSuivi.enApproche) && j.includes(JalonSuivi.arrive) &&
        e.find((x) => x.jalon === JalonSuivi.arrive)?.auteur === "gps";
    })());
  verifie("livreur à ~5 km → ni approche ni arrivé",
    !jalons(s.etapesDepuisEtat("en_livraison", CREATED, null, null, livreurLoin, client))
      .some((j) => j === JalonSuivi.enApproche || j === JalonSuivi.arrive));
  verifie("position périmée → ignorée",
    !jalons(s.etapesDepuisEtat("en_livraison", CREATED, null, null, livreurVieux, client))
      .includes(JalonSuivi.enApproche));
  verifie("sans destination → pas de déduction GPS",
    !jalons(s.etapesDepuisEtat("en_livraison", CREATED, null, null, livreurProche, null))
      .includes(JalonSuivi.enApproche));

  console.log("— fusionnerEtapes —");
  const stored = [
    { jalon: JalonSuivi.panierPrepare, horodatage: "2026-01-01T10:05:00Z", auteur: "admin" },
    { jalon: JalonSuivi.motoPartie, horodatage: "2026-01-01T10:20:00Z", auteur: "livreur" },
  ];
  const derivees = s.etapesDepuisEtat("en_livraison", CREATED, null, null, livreurProche, client);
  const fusion = s.fusionnerEtapes(stored, derivees);
  verifie("fusion : stored garde ses horodatages admin/livreur",
    fusion.find((e) => e.jalon === JalonSuivi.panierPrepare)?.auteur === "admin" &&
    fusion.find((e) => e.jalon === JalonSuivi.motoPartie)?.auteur === "livreur");
  verifie("fusion : GPS déduit comble les jalons manquants",
    jalons(fusion).includes(JalonSuivi.enApproche) && jalons(fusion).includes(JalonSuivi.arrive));
  verifie("fusion : ordre canonique respecté",
    JSON.stringify(jalons(fusion)) ===
      JSON.stringify([JalonSuivi.panierPrepare, JalonSuivi.motoPartie, JalonSuivi.enApproche, JalonSuivi.arrive]));

  console.log(`— ${ok} OK, ${ko} KO —`);
  if (ko > 0) process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
