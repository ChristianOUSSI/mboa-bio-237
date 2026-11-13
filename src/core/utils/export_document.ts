import { LigneCommande } from "../types/commande";
import { Commande } from "../types/commande_full";
import { formaterFcfa } from "../utils/format_monnaie";
import { UNITE_INFO, Unite } from "../types/unite";

/**
 * Export d'une liste de marché ou d'un devis.
 * Trois canaux : impression (=> PDF via le navigateur), WhatsApp, copie texte.
 */

export type ExportType = "liste" | "devis";

export interface ExportOptions {
  type: ExportType;
  titre: string;
  lignes: LigneCommande[];
  /** Numéro du destinataire au format international, sans "+". */
  telephone?: string | null;
  /** Nom du destinataire pour le message. */
  destinataire?: string | null;
  /** Code de la liste (pour la liste de marché). */
  code?: string | null;
  /** Frais de livraison additionnels. */
  fraisLivraison?: number;
  /** Numéro de devis / commande. */
  reference?: string | null;
  /** Date du document. */
  date?: string;
}

/** Libellé d'unité lisible. */
function libelleUnite(unite: string): string {
  const info = UNITE_INFO[unite as Unite];
  return info ? info.pluriel : unite;
}

/** Construit le corps du document en texte simple, aligné pour impression. */
export function construireTexteDocument(opts: ExportOptions): string {
  const lignes = opts.lignes;
  const sousTotal = lignes.reduce((s, l) => s + Math.round(l.quantite * l.prix), 0);
  const frais = opts.fraisLivraison ?? 0;
  const total = sousTotal + frais;
  const date = opts.date ?? new Date().toLocaleDateString("fr-CM", { day: "2-digit", month: "long", year: "numeric" });

  const lignesDetail = lignes.map((l, i) => {
    const unite = libelleUnite(String(l.unite ?? "kg"));
    const quantite = `${l.quantite % 1 === 0 ? l.quantite : l.quantite.toFixed(1)} ${unite}`;
    return `${String(i + 1).padStart(2, " ")}. ${l.nom}\n    ${quantite} × ${formaterFcfa(l.prix)} = ${formaterFcfa(Math.round(l.quantite * l.prix))}`;
  });

  const entete =
    opts.type === "devis"
      ? `DEVIS MBOA BIO 237\nRéférence : ${opts.reference ?? "-"}`
      : `LISTE DE MARCHÉ MBOA BIO 237`;

  const pied =
    opts.type === "devis"
      ? `\nDevis valable 24 heures. Le stock est réservé après validation par Mboa Bio.`
      : `\nCette liste n'est pas encore un devis. Envoyez-la au comptoir pour en faire un devis.`;

  return [
    "🌿 MBOA BIO 237",
    "La terre nous nourrit, la qualité nous distingue",
    "",
    entete,
    opts.code ? `Code de la liste : ${opts.code}` : "",
    `Date : ${date}`,
    "",
    "ARTICLES",
    ...lignesDetail,
    "",
    `Sous-total : ${formaterFcfa(sousTotal)}`,
    ...(frais > 0 ? [`Livraison moto : ${formaterFcfa(frais)}`] : []),
    `TOTAL : ${formaterFcfa(total)}`,
    "",
    ...(opts.destinataire ? [`Pour : ${opts.destinataire}`] : []),
    pied,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** Construit le message WhatsApp (texte court, adapté au mobile). */
export function construireMessageWhatsApp(opts: ExportOptions): string {
  const sousTotal = opts.lignes.reduce((s, l) => s + Math.round(l.quantite * l.prix), 0);
  const frais = opts.fraisLivraison ?? 0;
  const total = sousTotal + frais;

  const articles = opts.lignes
    .map((l) => {
      const unite = libelleUnite(String(l.unite ?? "kg"));
      return `• ${l.quantite} ${unite} ${l.nom} · ${formaterFcfa(Math.round(l.quantite * l.prix))}`;
    })
    .join("\n");

  const titre = opts.type === "devis" ? "Mon devis MBOA BIO 237" : "Ma liste de marché MBOA BIO 237";

  return [
    `🌿 ${titre}`,
    "",
    articles,
    "",
    `Total : ${formaterFcfa(total)}`,
    ...(opts.code ? [`Code : ${opts.code}`] : []),
    "",
    "Envoyé depuis MBOA BIO 237",
  ].join("\n");
}

/** Ouvre WhatsApp avec le message pré-rempli. */
export function partagerWhatsApp(opts: ExportOptions): boolean {
  const message = construireMessageWhatsApp(opts);
  const telephone = (opts.telephone ?? "").replace(/\D/g, "");
  const url = telephone
    ? `https://wa.me/${telephone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  if (typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/** Copie le document dans le presse-papiers. */
export async function copierDocument(opts: ExportOptions): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(construireTexteDocument(opts));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ouvre la boîte d'impression du navigateur.
 * Sur mobile et desktop, "Enregistrer au format PDF" donne un vrai fichier.
 */
export function imprimerDocument(): void {
  if (typeof window === "undefined") return;
  window.print();
}

/**
 * Export PDF sans dépendance externe.
 * On construit un document HTML minimal dans une fenêtre séparée,
 * puis on déclenche l'impression - l'utilisateur choisit "Enregistrer en PDF".
 */
export function exporterPdf(opts: ExportOptions): void {
  if (typeof window === "undefined") return;

  const texte = construireTexteDocument(opts).split("\n");
  const corps = texte
    .map((l) => {
      if (l.trim() === "") return "<div style='height:10px'></div>";
      if (l.startsWith("•") || l.includes("×")) {
        return `<div style='white-space:pre-wrap;margin:2px 0'>${echapper(l)}</div>`;
      }
      if (l.startsWith("TOTAL") || l.startsWith("Sous-total") || l.startsWith("Livraison moto")) {
        return `<div style='white-space:pre-wrap;margin:2px 0;font-weight:700'>${echapper(l)}</div>`;
      }
      return `<div style='white-space:pre-wrap;margin:2px 0'>${echapper(l)}</div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${opts.type === "devis" ? "Devis" : "Liste de marché"} - MBOA BIO 237</title>
<style>
  body { font-family: 'Nunito', Arial, sans-serif; color: #212121; padding: 24px; max-width: 720px; margin: 0 auto; }
  h1 { color: #1E5128; font-size: 24px; margin: 0 0 4px; }
  .filet { height: 4px; background: linear-gradient(90deg,#1E5128,#8BC34A); border-radius: 3px; margin: 14px 0 18px; }
  div { font-size: 15px; line-height: 1.5; }
  .pied { margin-top: 24px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
</style>
</head>
<body>
<h1>🌿 MBOA BIO 237</h1>
<div style="font-size:13px;color:#666">La terre nous nourrit, la qualité nous distingue</div>
<div class="filet"></div>
${corps}
<div class="pied">Document généré par MBOA BIO 237, le comptoir du marché frais au Cameroun</div>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 350); };</script>
</body>
</html>`;

  const fenetre = window.open("", "_blank", "width=820,height=1000");
  if (!fenetre) {
    imprimerDocument();
    return;
  }
  fenetre.document.write(html);
  fenetre.document.close();
}

/** Échappe les caractères HTML pour l'export PDF. */
function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Construit les options d'export depuis une commande. */
export function optionsDepuisCommande(c: Commande, telephone?: string | null): ExportOptions {
  return {
    type: "devis",
    titre: "Devis MBOA BIO 237",
    lignes: c.lignes,
    telephone,
    code: null,
    fraisLivraison: c.livreurTarif ?? 0,
    reference: c.id.slice(0, 8).toUpperCase(),
    date: new Date(c.createdLe).toLocaleDateString("fr-CM", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
}
