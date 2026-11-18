import { Annonce } from "../types/annonce";
import { Produit } from "../types/produit";

const norm = (x: string) =>
  x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Le produit est-il mis en avant par une annonce « phare » ? */
export function annonceEstPhare(annonces: Annonce[], produit: Produit): boolean {
  const titres = annonces.filter((a) => a.type === "phare").map((a) => norm(a.titre));
  const nom = norm(produit.nom);
  return titres.some((t) => t.includes(nom) || nom.includes(t));
}

/**
 * Pourcentage de réduction si une annonce « promo » nomme le produit
 * et contient un pourcentage (« -20 % », « 20% de réduction »).
 * Retourne null sinon.
 */
export function annoncePromoPct(annonces: Annonce[], produit: Produit): number | null {
  const nom = norm(produit.nom);
  for (const a of annonces) {
    if (a.type !== "promo") continue;
    const titre = norm(a.titre);
    const txt = norm(a.titre + " " + a.texte);
    if (!(txt.includes(nom) || nom.includes(titre))) continue;
    const m = txt.match(/(\d{1,2})\s*%/);
    if (m) {
      const pct = parseInt(m[1], 10);
      if (pct > 0 && pct < 90) return pct;
    }
  }
  return null;
}
