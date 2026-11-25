// Test unitaire : unités de vente multiples (kg / sac / pièce…).
// Compile les modules TS purs vers un dossier temporaire puis vérifie
// le comportement : parsing jsonb, fallback, libellés, JSON roundtrip.
// Usage : node scripts/test_unites.mjs
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

try {
  execSync(
    `npx tsc src/core/types/commande.ts src/core/types/produit.ts --outDir "${out}" --module commonjs --target es2021 --esModuleInterop --skipLibCheck`,
    { stdio: "pipe" },
  );
  const c = await import(pathToFileURL(join(out, "commande.js")).href);
  const { produitUnites, produitFromMap } = await import(pathToFileURL(join(out, "produit.js")).href);

  const ligne = (extra = {}) => ({
    produitId: "p1", slug: "tomate", nom: "Tomate", categorie: "fruit",
    quantite: 3, prix: 3000, coutAchat: 0, photo: "", composants: [], ...extra,
  });

  console.log("— Unités libres (« sac ») —");
  verifie("affichage « 3 sac »", c.ligneQuantiteAffichee(ligne({ unite: "sac" })) === "3 sac");
  verifie("unité réelle interne = kg (fallback)", c.ligneUniteReelle(ligne({ unite: "sac" })) === "kg");
  verifie("ligneToJson préserve « sac »", c.ligneToJson(ligne({ unite: "sac" })).unite === "sac");
  verifie("roundtrip JSON conserve « sac »", c.ligneFromJson(c.ligneToJson(ligne({ unite: "sac" }))).unite === "sac");

  console.log("— Unités enum —");
  verifie("« 3 kilos » pour kg", c.ligneQuantiteAffichee(ligne({ unite: "kg" })) === "3 kilos");
  verifie("kg sérialisé tel quel", c.ligneToJson(ligne({ unite: "kg" })).unite === "kg");

  console.log("— Résumé panier mixte —");
  const resume = c.resumerQuantites([
    ligne({ unite: "sac", quantite: 3 }),
    ligne({ produitId: "p2", unite: "kg", quantite: 2 }),
    ligne({ produitId: "p3", unite: null, quantite: 1 }),
  ]);
  verifie("kg + sac + défaut fusionnés", resume === "3 sac · 3 kilos");
  verifie("panier vide → rien", c.resumerQuantites([]) === "rien");

  console.log("— produitUnites —");
  const p = produitFromMap({
    id: "1", nom: "Tomate", categorie: "fruit", prix: 500, quantite: 10, unite: "kg",
    unites: [{ unite: "kg", prix: 500 }, { unite: "sac", prix: 3000 }, { unite: "", prix: 0 }],
  });
  verifie("jsonb parsé + ligne invalide filtrée", JSON.stringify(produitUnites(p)) === JSON.stringify([{ unite: "kg", prix: 500 }, { unite: "sac", prix: 3000 }]));
  const p2 = produitFromMap({ id: "2", nom: "X", categorie: "fruit", prix: 100, quantite: 1, unite: "botte", unites: [{ unite: "", prix: 0 }] });
  verifie("unites invalides → fallback unité/prix", JSON.stringify(produitUnites(p2)) === JSON.stringify([{ unite: "botte", prix: 100 }]));
  const p3 = produitFromMap({ id: "3", nom: "Y", categorie: "fruit", prix: 100, quantite: 1, unite: "litre" });
  verifie("sans unites → défaut", JSON.stringify(produitUnites(p3)) === JSON.stringify([{ unite: "litre", prix: 100 }]));
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\n${ok} OK, ${ko} KO`);
process.exit(ko ? 1 : 0);
