"use client";

import { useRouter } from "next/navigation";
import { usePanier } from "@/core/etat/store";
import { CarteMboa, BoutonMboa, EnTetePage, BoutonVoix, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { formaterFcfa, formaterFcfaCourt } from "@/core/utils/format_monnaie";
import { commander } from "@/core/data/depots";
import { resumerQuantites } from "@/core/types/commande";
import { ModePaiement, MODE_PAIEMENT_INFO } from "@/core/types/statuts";
import {
  copierDocument,
  exporterPdf,
  partagerWhatsApp,
  imprimerDocument,
} from "@/core/utils/export_document";
import { useState } from "react";
import { useGuardRole } from "@/core/auth/use_guard_role";

const FRAIS_LIVRAISON_DEFAUT = 500;

export default function PanierPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("consommateur");
  const panier = usePanier();
  const [enCours, setEnCours] = useState(false);
  const [modePaiement, setModePaiement] = useState<ModePaiement>(ModePaiement.especes);
  const [menuExport, setMenuExport] = useState(false);
  const [copieOk, setCopieOk] = useState(false);

  const montantProduits = panier.montantTotal();
  const fraisLivraison = montantProduits > 0 ? FRAIS_LIVRAISON_DEFAUT : 0;
  const montantTotal = montantProduits + fraisLivraison;

  async function validerCommande() {
    if (!profil || panier.lignes.length === 0) return;
    setEnCours(true);
    try {
      const lignes = panier.lignes.map((l) => ({
        produitId: l.produitId,
        slug: l.slug ?? "",
        nom: l.nom,
        categorie: l.categorie,
        quantite: l.quantite,
        prix: l.prix,
        unite: String(l.unite ?? "kg"),
        photo: l.photo,
        composants: l.composants,
      }));
      await commander(lignes, profil.id);
      panier.vider();
      router.push("/consommateur/suivi");
    } catch (e) {
      console.error("Order error:", e);
    } finally {
      setEnCours(false);
    }
  }

  const optionsExport = () => ({
    type: "devis" as const,
    titre: "My MBOA BIO 237 quote",
    lignes: panier.lignes,
    telephone: profil?.telephone ?? null,
    destinataire: profil?.nom ?? null,
    code: null,
    fraisLivraison,
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
      <EnTetePage titre="My quote" sousTitre="Check before ordering" onRetour={() => router.back()} />

      <div className="flex-1 p-4">
        {panier.lignes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 anim-apparition">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-corps text-[var(--mboa-text-doux)]">Your cart is empty</p>
            <BoutonMboa variant="primary" onClick={() => router.push("/consommateur")} className="mt-4">Go to the market</BoutonMboa>
          </div>
        ) : (
          <>
            {/* Quantities summary */}
            <CarteMboa className="mb-3 card-accent anim-apparition">
              <div className="flex justify-between items-center">
                <span className="text-corps">Quantities</span>
                <span className="text-corps font-bold">{resumerQuantites(panier.lignes)}</span>
              </div>
            </CarteMboa>

            {/* Cart lines */}
            <div className="space-y-2">
              {panier.lignes.map((l, i) => (
                <CarteMboa key={l.produitId} className="anim-apparition" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BoutonVoix texte={`${l.quantite} of ${l.nom}, ${l.prix} francs`} />
                      <span className="text-corps font-bold">{l.nom}</span>
                    </div>
                    <span className="text-chiffre text-[var(--mboa-primary)]">
                      {formaterFcfaCourt(Math.round(l.quantite * l.prix))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-aide text-[var(--mboa-text-doux)]">
                      {formaterFcfa(l.prix)} per unit
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => panier.ajuster(l.produitId, l.quantite - 1)}
                        className="btn-mboa btn-surface !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                        aria-label={`Remove one ${l.nom}`}
                      >
                        −
                      </button>
                      <span className="text-chiffre min-w-[48px] text-center">{l.quantite}</span>
                      <button
                        onClick={() => panier.ajuster(l.produitId, l.quantite + 1)}
                        className="btn-mboa btn-secondary !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                        aria-label={`Add one ${l.nom}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </CarteMboa>
              ))}
            </div>

            {/* Payment method choice */}
            <CarteMboa className="mt-4 anim-apparition">
              <p className="text-corps font-bold mb-2">💰 Payment on delivery</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.values(ModePaiement) as string[]).map((m) => {
                  const info = MODE_PAIEMENT_INFO[m as ModePaiement];
                  const selected = modePaiement === m;
                  const marque = m === ModePaiement.momo ? "🟡" : m === ModePaiement.orangeMoney ? "🟠" : "💵";
                  return (
                    <button
                      key={m}
                      onClick={() => setModePaiement(m as ModePaiement)}
                      className="p-3 rounded-xl flex flex-col items-center gap-1 transition-transform active:scale-95"
                      style={{
                        background: selected ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                        border: `2px solid ${selected ? "var(--mboa-primary)" : "transparent"}`,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>{marque}</span>
                      <span className="text-aide text-center" style={{ fontSize: 15, fontWeight: 700 }}>
                        {info.libelle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CarteMboa>

            {/* Cost summary */}
            <CarteMboa className="mt-3 anim-apparition">
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-corps">
                  <span>Products</span>
                  <span>{formaterFcfa(montantProduits)}</span>
                </div>
                <div className="flex justify-between text-corps">
                  <span>Bike delivery</span>
                  <span>{formaterFcfa(fraisLivraison)}</span>
                </div>
                <div className="border-t border-[var(--mboa-trait)] pt-1 flex justify-between items-center">
                  <span className="text-titre">Total to pay</span>
                  <span className="text-chiffre-geant text-[var(--mboa-primary)]">
                    {formaterFcfa(montantTotal)}
                  </span>
                </div>
              </div>
              <p className="text-aide text-[var(--mboa-text-doux)] mb-3">
                You pay the driver on arrival ({MODE_PAIEMENT_INFO[modePaiement].libelle.toLowerCase()})
              </p>
              <BoutonMboa onClick={validerCommande} disabled={enCours} className="w-full !text-titre">
                {enCours ? "Sending..." : "Order"}
              </BoutonMboa>
            </CarteMboa>

            {/* Quote export */}
            <CarteMboa className="mt-3 no-print">
              <button
                onClick={() => setMenuExport(!menuExport)}
                className="w-full flex items-center justify-between"
                aria-expanded={menuExport}
              >
                <span className="text-corps font-bold">📤 Export my quote</span>
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
                  ✅ Quote copied to clipboard
                </p>
              )}
            </CarteMboa>

            <button
              onClick={() => panier.vider()}
              className="text-aide text-[var(--mboa-error)] mt-3 underline text-center w-full no-print"
            >
              Empty the cart
            </button>
          </>
        )}
      </div>
    </FondMboa>
  );
}
