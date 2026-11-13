"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CarteMboa, BoutonMboa, EnTetePage, PictoCategorie, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { CATEGORIES_ORDREES, CATEGORIE_INFO, Categorie } from "@/core/types/categorie";
import { Unite, UNITE_INFO, uniteAvec } from "@/core/types/unite";
import { proposerAchat } from "@/core/data/depots";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";

export default function ProposerRecoltePage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("fournisseur");
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<Categorie>(Categorie.fruit);
  const [unite, setUnite] = useState<Unite>(Unite.kg);
  const [quantite, setQuantite] = useState(1);
  const [prix, setPrix] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  async function envoyer() {
    if (!profil) return;
    const prixNum = parseInt(prix) || 0;
    if (nom.trim().length === 0 || prixNum <= 0) return;
    setEnCours(true);
    try {
      await proposerAchat({
        fournisseurId: profil.id,
        nom: nom.trim(),
        categorie,
        unite,
        quantite,
        prixDemande: prixNum,
        photoUrl,
      });
      setSucces(true);
      setTimeout(() => router.push("/fournisseur"), 1500);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setEnCours(false);
    }
  }

  function prendrePhoto() {
    // In a PWA we use a file input with capture
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setPhotoUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  if (succes) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[var(--mboa-background)]">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-ecran text-[var(--mboa-primary)]">Offer sent</h1>
        <p className="text-corps text-[var(--mboa-text-doux)] mt-2">The counter will review your produce</p>
      </div>
    );
  }

  return (
    <FondMboa>
      <EnTetePage titre="Sell my harvest" onRetour={() => router.back()} />

      <div className="flex-1 p-4 space-y-3">
        {/* Photo of the goods */}
        <CarteMboa>
          <p className="text-corps mb-2">Photograph the goods</p>
          <div
            onClick={prendrePhoto}
            className="w-full h-48 bg-[var(--mboa-background)] rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed border-[var(--mboa-primary)]"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Goods" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-center">
                <div className="text-5xl">📷</div>
                <p className="text-aide text-[var(--mboa-text-doux)] mt-2">Tap to take a photo</p>
              </div>
            )}
          </div>
        </CarteMboa>

        {/* Product name */}
        <CarteMboa>
          <label className="text-corps block mb-2">Product name</label>
          <input
            type="text"
            placeholder="E.g.: Cassava, Macabo, Beef..."
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 20 }}
          />
        </CarteMboa>

        {/* Category (8 tiles) */}
        <CarteMboa>
          <label className="text-corps block mb-2">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES_ORDREES.map((c) => (
              <button
                key={c}
                onClick={() => setCategorie(c)}
                className="flex flex-col items-center p-2 rounded-xl"
                style={{
                  minHeight: 72,
                  background: categorie === c ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                  border: `2px solid ${categorie === c ? "var(--mboa-primary)" : "transparent"}`,
                }}
              >
                <PictoCategorie categorie={c} size={28} />
                <span className="text-aide mt-1 text-center" style={{ fontSize: 14 }}>{CATEGORIE_INFO[c].libelle}</span>
              </button>
            ))}
          </div>
        </CarteMboa>

        {/* Unit */}
        <CarteMboa>
          <label className="text-corps block mb-2">Unit of measure</label>
          <select
            value={unite}
            onChange={(e) => setUnite(e.target.value as Unite)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 20 }}
          >
            {Object.values(Unite).map((u) => (
              <option key={u} value={u}>{UNITE_INFO[u].pluriel}</option>
            ))}
          </select>
        </CarteMboa>

        {/* Quantity */}
        <CarteMboa>
          <label className="text-corps block mb-2">Quantity: {uniteAvec(unite, quantite)}</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantite(Math.max(0.5, quantite - 1))}
              className="btn-mboa btn-surface !min-h-[56px] !min-w-[56px] !rounded-xl text-2xl"
            >−</button>
            <span className="text-chiffre-geant text-[var(--mboa-primary)] flex-1 text-center">{quantite}</span>
            <button
              onClick={() => setQuantite(quantite + 1)}
              className="btn-mboa btn-surface !min-h-[56px] !min-w-[56px] !rounded-xl text-2xl"
            >+</button>
          </div>
        </CarteMboa>

        {/* Asking price */}
        <CarteMboa>
          <label className="text-corps block mb-2">Asking price per {uniteAvec(unite, 1)}</label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="FCFA"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl text-chiffre"
            style={{ fontSize: 32 }}
          />
          {prix && quantite > 0 && (
            <p className="text-aide text-[var(--mboa-text-doux)] mt-2">
              Total asked: {formaterFcfa(Math.round(quantite * (parseInt(prix) || 0)))}
            </p>
          )}
        </CarteMboa>

        {/* Send button */}
        <BoutonMboa
          variant="primary"
          onClick={envoyer}
          disabled={!nom.trim() || !prix || enCours}
          className="w-full !text-titre"
        >
          {enCours ? "Sending..." : "Send my offer"}
        </BoutonMboa>
      </div>
    </FondMboa>
  );
}
