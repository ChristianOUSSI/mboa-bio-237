"use client";

import { useRouter } from "next/navigation";
import { useListe, usePanier } from "@/core/etat/store";
import { CarteMboa, BoutonMboa, EnTetePage, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { formaterFcfa, formaterFcfaCourt } from "@/core/utils/format_monnaie";
import { CATEGORIES_ORDREES, CATEGORIE_INFO, Categorie } from "@/core/types/categorie";
import { Unite, UNITE_INFO } from "@/core/types/unite";
import { resumerQuantites } from "@/core/types/commande";
import { genererCodeListe } from "@/core/types/liste";
import {
  copierDocument,
  exporterPdf,
  partagerWhatsApp,
  imprimerDocument,
  construireTexteDocument,
} from "@/core/utils/export_document";
import { useState } from "react";
import { useGuardRole } from "@/core/auth/use_guard_role";

export default function ListePage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("consommateur");
  const liste = useListe();
  const panier = usePanier();
  const [modeAjout, setModeAjout] = useState(false);
  const [nomLibre, setNomLibre] = useState("");
  const [catLibre, setCatLibre] = useState<Categorie>(Categorie.fruit);
  const [uniteLibre, setUniteLibre] = useState<Unite>(Unite.kg);
  const [prixLibre, setPrixLibre] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [menuExport, setMenuExport] = useState(false);
  const [copieOk, setCopieOk] = useState(false);

  function ajouterLibre() {
    const prix = parseInt(prixLibre) || 0;
    if (nomLibre.trim().length === 0 || prix <= 0) return;
    liste.poserLibre(nomLibre.trim(), catLibre, uniteLibre, prix);
    setNomLibre("");
    setPrixLibre("");
    setModeAjout(false);
  }

  /** The market list becomes the cart: the customer then submits the quote. */
  function commanderDepuisListe() {
    panier.vider();
    for (const l of liste.lignes) {
      panier.poser(l);
    }
    router.push("/consommateur/panier");
  }

  function genererPapier() {
    if (!code) {
      setCode(genererCodeListe());
    }
  }

  const optionsExport = () => ({
    type: "liste" as const,
    titre: "My market list",
    lignes: liste.lignes,
    telephone: profil?.telephone ?? null,
    destinataire: profil?.nom ?? null,
    code,
  });

  async function copier() {
    const ok = await copierDocument(optionsExport());
    setCopieOk(ok);
    setTimeout(() => setCopieOk(false), 2200);
  }

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }
  return (
    <FondMboa>
      <EnTetePage
        titre="My market list"
        sousTitre={liste.titre}
        onRetour={() => router.back()}
        action={
          <BoutonMboa variant="surface" onClick={genererPapier} className="!min-h-[48px] !rounded-xl text-aide">
            📄 Code
          </BoutonMboa>
        }
      />

      <div className="flex-1 p-4">
        {code && (
          <CarteMboa className="mb-3 bg-[var(--mboa-primary-doux)] anim-apparition">
            <p className="text-aide text-[var(--mboa-text-doux)]">List code</p>
            <p className="text-chiffre-geant text-[var(--mboa-primary)] tracking-wider">{code}</p>
            <p className="text-aide text-[var(--mboa-text-doux)]">Spelled out: {code.split("").join(", ")}</p>
          </CarteMboa>
        )}

        {liste.lignes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 anim-apparition">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-corps text-[var(--mboa-text-doux)]">Your list is empty</p>
            <p className="text-aide text-[var(--mboa-text-doux)] mt-1">Add items by voice or keyboard</p>
          </div>
        ) : (
          <>
            <CarteMboa className="mb-3 card-accent anim-apparition">
              <div className="flex justify-between items-center">
                <span className="text-corps">Items</span>
                <span className="text-corps font-bold">{liste.lignes.length}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-corps">Quantities</span>
                <span className="text-corps font-bold">{resumerQuantites(liste.lignes)}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-titre">Estimated total</span>
                <span className="text-chiffre text-[var(--mboa-primary)]">
                  {formaterFcfa(liste.montantEstime())}
                </span>
              </div>
            </CarteMboa>

            <div className="space-y-2">
              {liste.lignes.map((l, i) => (
                <CarteMboa key={i} className="anim-apparition" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BoutonVoix texte={`${l.quantite} of ${l.nom}, ${l.prix} francs`} />
                      <span className="text-corps font-bold">{l.nom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-chiffre text-[var(--mboa-primary)]">
                        {formaterFcfaCourt(Math.round(l.quantite * l.prix))}
                      </span>
                      <button
                        onClick={() => liste.retirer(i)}
                        className="text-[var(--mboa-error)] text-2xl px-2"
                        aria-label={`Remove ${l.nom}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </CarteMboa>
              ))}
            </div>

            {/* List export */}
            <CarteMboa className="mt-4 no-print">
              <button
                onClick={() => setMenuExport(!menuExport)}
                className="w-full flex items-center justify-between"
                aria-expanded={menuExport}
              >
                <span className="text-corps font-bold">📤 Export my list</span>
                <span className="text-[var(--mboa-primary)] text-2xl">{menuExport ? "▲" : "▼"}</span>
              </button>
              {menuExport && (
                <div className="grid grid-cols-2 gap-2 mt-3 anim-apparition">
                  <BoutonMboa variant="surface" onClick={() => exporterPdf(optionsExport())} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">📕</span>
                    <span className="text-aide">PDF</span>
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={imprimerDocument} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">🖨️</span>
                    <span className="text-aide">Print</span>
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={() => partagerWhatsApp(optionsExport())} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">💬</span>
                    <span className="text-aide">WhatsApp</span>
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={copier} className="!min-h-[60px] flex-col !gap-0">
                    <span className="text-2xl">📋</span>
                    <span className="text-aide">Copy</span>
                  </BoutonMboa>
                </div>
              )}
              {copieOk && (
                <p className="text-aide text-[var(--mboa-primary)] mt-2 text-center anim-apparition">
                  ✅ List copied to clipboard
                </p>
              )}
            </CarteMboa>

            <div className="mt-4 flex gap-2">
              <BoutonMboa variant="surface" onClick={() => setModeAjout(!modeAjout)} className="flex-1">
                + Add
              </BoutonMboa>
              <BoutonMboa variant="primary" className="flex-1" onClick={commanderDepuisListe}>
                Order
              </BoutonMboa>
            </div>
          </>
        )}

        {modeAjout && (
          <CarteMboa className="mt-3 anim-apparition">
            <h3 className="text-titre mb-3">Add an item</h3>
            <input
              type="text"
              placeholder="Name (e.g.: Miondo)"
              value={nomLibre}
              onChange={(e) => setNomLibre(e.target.value)}
              className="champ-mboa mb-2"
              style={{ fontSize: 20 }}
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={catLibre}
                onChange={(e) => setCatLibre(e.target.value as Categorie)}
                className="champ-mboa"
                style={{ fontSize: 18 }}
              >
                {CATEGORIES_ORDREES.map((c) => (
                  <option key={c} value={c}>{CATEGORIE_INFO[c].libelle}</option>
                ))}
              </select>
              <select
                value={uniteLibre}
                onChange={(e) => setUniteLibre(e.target.value as Unite)}
                className="champ-mboa"
                style={{ fontSize: 18 }}
              >
                {Object.values(Unite).map((u) => (
                  <option key={u} value={u}>{UNITE_INFO[u].pluriel}</option>
                ))}
              </select>
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Price (FCFA)"
              value={prixLibre}
              onChange={(e) => setPrixLibre(e.target.value)}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />
            <div className="flex gap-2">
              <BoutonMboa variant="surface" onClick={() => setModeAjout(false)} className="flex-1">Cancel</BoutonMboa>
              <BoutonMboa variant="primary" onClick={ajouterLibre} className="flex-1" disabled={!nomLibre.trim() || !prixLibre}>Add</BoutonMboa>
            </div>
          </CarteMboa>
        )}
      </div>
    </FondMboa>
  );
}
