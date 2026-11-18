// Test des utilitaires promo : compile promos.ts en CJS puis vérifie la logique.
// Usage : node scripts/test_promos.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const out = mkdtempSync(join(tmpdir(), "promo_test_"));
execFileSync(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "src/core/utils/promos.ts",
  "--outDir", out,
  "--module", "commonjs",
  "--target", "es2021",
  "--skipLibCheck",
  "--esModuleInterop",
  "--moduleResolution", "node",
], { stdio: "pipe" });

const require = createRequire(import.meta.url);
const { annonceEstPhare, annoncePromoPct, codePromoPct, annonceExpiree } =
  require(join(out, "utils", "promos.js"));

const produit = { id: "1", slug: "tomate", nom: "Tomate", categorie: "legume", photoReelle: "", quantite: 10, prix: 500, perissable: true, actif: true, composants: [] };
const base = { id: "a1", type: "promo", titre: "", texte: "", actif: true, createdLe: "" };

let ok = 0, ko = 0;
const check = (nom, cond) => { if (cond) ok++; else { ko++; console.error("FAIL:", nom); } };

check("phare slug", annonceEstPhare([{ ...base, type: "phare", produitSlug: "tomate" }], produit));
check("phare autre slug", !annonceEstPhare([{ ...base, type: "phare", produitSlug: "riz" }], produit));
check("phare titre", annonceEstPhare([{ ...base, type: "phare", titre: "Tomate du jour" }], produit));
check("phare inactif ignore", !annonceEstPhare([{ ...base, type: "phare", titre: "Tomate", actif: false }], produit));
check("promo 20%", annoncePromoPct([{ ...base, titre: "Tomate", texte: "-20 % ce jour" }], produit) === 20);
check("promo slug+%", annoncePromoPct([{ ...base, titre: "Promo", texte: "20%", produitSlug: "tomate" }], produit) === 20);
check("promo sans %", annoncePromoPct([{ ...base, titre: "Tomate pas cher" }], produit) === null);
check("promo autre produit", annoncePromoPct([{ ...base, titre: "Promo riz", texte: "-50 %" }], produit) === null);
check("code 15%", codePromoPct([{ ...base, titre: "Code", texte: "-15 %", code: "FETE15" }], "fete15") === 15);
check("code sans % = 10", codePromoPct([{ ...base, titre: "Code", code: "VIP" }], "VIP") === 10);
check("code inconnu", codePromoPct([{ ...base, titre: "x", code: "ABC", texte: "-5 %" }], "XYZ") === null);
check("code expire", codePromoPct([{ ...base, titre: "x", code: "OLD", texte: "-5 %", expireLe: "2000-01-01" }], "OLD") === null);
check("code inactif", codePromoPct([{ ...base, titre: "x", code: "OFF", texte: "-5 %", actif: false }], "OFF") === null);
check("expire passe", annonceExpiree({ ...base, expireLe: "2000-01-01" }));
check("expire future", !annonceExpiree({ ...base, expireLe: "2999-01-01" }));
check("pas de date", !annonceExpiree(base));

console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
