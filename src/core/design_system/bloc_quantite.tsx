"use client";

import { useState } from "react";
import { usePanier, clePanier, toast } from "../etat/store";
import { Produit, produitUnites } from "../types/produit";
import { formaterFcfa } from "../utils/format_monnaie";
import { vibrer } from "../utils/son";

/** Sélecteur de quantité sur la fiche produit : on tape la quantité
 *  souhaitée (ex. 30, 20) au lieu de taper + une par une.
 *  Partagé entre la grille du marché et la fiche produit. */
export function BlocQuantite({ produit, promoPct, t }: { produit: Produit; promoPct: (p: Produit) => number | null; t: (k: string) => string }) {
  const panier = usePanier();
  const [qte, setQte] = useState(1);
  // Multi-unités : le client choisit kg / pièce / sac… et voit le prix
  // de l'unité sélectionnée avant d'ajouter.
  const unites = produitUnites(produit);
  const [uniteIdx, setUniteIdx] = useState(0);
  const uniteChoisie = unites[Math.min(uniteIdx, unites.length - 1)];
  const enPanier = panier.lignes
    .filter((l) => l.produitId === produit.id && l.unite === uniteChoisie.unite)
    .reduce((s, l) => s + l.quantite, 0);
  const cle = clePanier(produit.id, uniteChoisie.unite);

  function ajouter() {
    const n = Math.max(1, Math.floor(qte) || 1);
    const pct = promoPct(produit) ?? 0;
    const prix = pct ? Math.round(uniteChoisie.prix * (1 - pct / 100)) : uniteChoisie.prix;
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: n,
      prix,
      coutAchat: produit.prixAchat ?? 0,
      photo: produit.photoReelle,
      unite: uniteChoisie.unite,
      composants: produit.composants,
    });
    vibrer();
    toast(`${produit.nom} ×${n} ${uniteChoisie.unite} ${t("toast.ajoute")}`);
    setQte(1);
  }

  const pucesUnites = unites.length > 1 && (
    <div className="flex flex-wrap gap-1.5 mb-1.5" role="radiogroup" aria-label={t("march.uniteChoisir")}>
      {unites.map((u, i) => {
        const actif = i === Math.min(uniteIdx, unites.length - 1);
        return (
          <button
            key={u.unite}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => { setUniteIdx(i); setQte(1); }}
            className="px-3 py-1.5 rounded-full text-aide font-bold border-2 transition-colors"
            style={{
              borderColor: actif ? "var(--mboa-primary)" : "var(--mboa-border)",
              background: actif ? "var(--mboa-secondary-doux)" : "var(--mboa-surface)",
              color: actif ? "var(--mboa-primary)" : "var(--mboa-text-doux)",
            }}
          >
            {u.unite} · {formaterFcfa(u.prix)}
          </button>
        );
      })}
    </div>
  );

  if (enPanier > 0) {
    return (
      <div className="mt-2">
        {pucesUnites}
        <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => panier.ajuster(cle, enPanier - 1)}
            className="btn-mboa btn-surface !min-h-[40px] !min-w-[40px] !rounded-xl text-xl"
            aria-label={`Moins de ${produit.nom}`}
          >
            −
          </button>
          <span className="text-corps font-bold min-w-[28px] text-center">{enPanier}</span>
          <button
            onClick={() => panier.ajuster(cle, enPanier + 1)}
            className="btn-mboa btn-secondary !min-h-[40px] !min-w-[40px] !rounded-xl text-xl"
            aria-label={`Plus de ${produit.nom}`}
          >
            +
          </button>
        </div>
        <button
          onClick={ajouter}
          className="btn-mboa btn-primary !min-h-[40px] !rounded-xl px-3 text-aide font-bold"
        >
          +{t("march.ajouter")}
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {pucesUnites}
      <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={qte}
        onChange={(e) => setQte(Math.max(1, parseInt(e.target.value) || 1))}
        className="champ-mboa !min-h-[44px] !w-16 text-center text-corps font-bold"
        aria-label={t("march.quantite")}
      />
      <button
        onClick={ajouter}
        className="btn-mboa btn-primary flex-1 !min-h-[44px] !rounded-xl text-aide font-bold"
      >
        + {t("march.ajouter")}
      </button>
      </div>
    </div>
  );
}
