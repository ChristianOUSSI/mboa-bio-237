"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CarteMboa, BoutonMboa, EnTetePage, PictoCategorie, FondMboa } from "@/core/design_system/composants";
import { chargerCatalogue, proposerAchat, sauverFournisseur } from "@/core/data/depots";
import { CATEGORIES_ORDREES, CATEGORIE_INFO, Categorie } from "@/core/types/categorie";
import { Unite, UNITE_INFO } from "@/core/types/unite";
import { EntreeCatalogue, catalogueUniteReelle } from "@/core/types/catalogue";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useLangue, useTr, Lang } from "@/core/i18n";
import { useEffect } from "react";

interface ProduitDraft {
  nom: string;
  categorie: Categorie;
  unite: Unite;
  quantite: number;
  prix: string;
  photoUrl: string;
}

const VILLAGES_CAMEROUN = [
  "Mbouda", "Bafoussam", "Bamenda", "Douala", "Yaoundé",
  "Bafang", "Dschang", "Kumba", "Limbé", "Buéa",
  "Nkongsamba", "Edea", "Ngaoundéré", "Garoua", "Maroua",
  "Bertoua", "Kribi", "Sangmélima", "Mbalmayo", "Other",
];

/**
 * Anyone can become a supplier: the person says what they have,
 * how and how much they sell it for. After validation by the Mboa
 * counter, the goods enter stock.
 */
export default function RejoindrePage() {
  const router = useRouter();
  const { langue, setLangue } = useLangue();
  const t = useTr();
  const [catalogue, setCatalogue] = useState<EntreeCatalogue[]>([]);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [village, setVillage] = useState("");
  const [note, setNote] = useState("");
  const [produits, setProduits] = useState<ProduitDraft[]>([
    { nom: "", categorie: Categorie.fruit, unite: Unite.kg, quantite: 1, prix: "", photoUrl: "" },
  ]);
  const [enCours, setEnCours] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);

  useEffect(() => {
    async function charger() {
      setCatalogue(await chargerCatalogue());
    }
    charger();
  }, []);

  function majProduit(i: number, maj: Partial<ProduitDraft>) {
    setProduits(produits.map((p, idx) => (idx === i ? { ...p, ...maj } : p)));
  }

  function ajouterProduit() {
    setProduits([
      ...produits,
      { nom: "", categorie: Categorie.fruit, unite: Unite.kg, quantite: 1, prix: "", photoUrl: "" },
    ]);
  }

  function retirerProduit(i: number) {
    if (produits.length > 1) {
      setProduits(produits.filter((_, idx) => idx !== i));
    }
  }

  function choisirCatalogue(i: number, slug: string) {
    const e = catalogue.find((x) => x.slug === slug);
    if (e) {
      majProduit(i, {
        nom: e.nom,
        categorie: e.categorie,
        unite: catalogueUniteReelle(e),
        prix: String(e.prixTendance),
      });
    }
  }

  function prendrePhoto(i: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => majProduit(i, { photoUrl: reader.result as string });
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  function valider(): string[] {
    const errs: string[] = [];
    if (nom.trim().length === 0) errs.push(t("rej.erreur.nom"));
    const tel = telephone.replace(/\D/g, "");
    if (tel.length < 9) errs.push(t("rej.erreur.tel"));
    if (village.trim().length === 0) errs.push(t("rej.erreur.village"));
    produits.forEach((p, i) => {
      if (p.nom.trim().length === 0) errs.push(`Produit ${i + 1}: ${t("rej.erreur.produitNom")}`);
      const prixNum = parseInt(p.prix) || 0;
      if (prixNum <= 0) errs.push(`Produit ${i + 1}: ${t("rej.erreur.produitPrix")}`);
    });
    return errs;
  }

  async function envoyer() {
    const errs = valider();
    setErreurs(errs);
    if (errs.length > 0) return;
    setEnCours(true);
    try {
      const tel = telephone.replace(/\D/g, "");
      // Create the supplier record
      await sauverFournisseur({
        nom: nom.trim(),
        telephone: tel,
        village: village.trim(),
        productionLibre: produits.map((p) => p.nom).join(", "),
        unite: produits[0]?.unite ?? "kg",
      });
      // Propose each product as a purchase
      for (const p of produits) {
        const prixNum = parseInt(p.prix) || 0;
        await proposerAchat({
          fournisseurId: `tel_${tel}`,
          nom: p.nom.trim(),
          categorie: p.categorie,
          unite: p.unite,
          quantite: p.quantite,
          prixDemande: prixNum,
          photoUrl: p.photoUrl,
        });
      }
      setSucces(true);
    } catch (e) {
      console.error("Error:", e);
      setErreurs([t("rej.erreur.generique")]);
    } finally {
      setEnCours(false);
    }
  }

  if (succes) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[var(--mboa-background)]">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-ecran text-[var(--mboa-primary)]">{t("rej.succes.titre")}</h1>
        <p className="text-corps text-[var(--mboa-text-doux)] mt-2 text-center px-6 italic">
          {t("rej.succes.texte")}
        </p>
        <BoutonMboa variant="primary" className="mt-6" onClick={() => router.push("/")}>
          {t("rej.succes.btn")}
        </BoutonMboa>
      </div>
    );
  }

  return (
    <FondMboa>
      <EnTetePage
        titre={t("rej.titre")}
        sousTitre={t("rej.sousTitre")}
        onRetour={() => router.back()}
        action={
          <div className="selecteur-langue !border-white/40 !bg-white/15">
            {(["fr", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                className={langue === l ? "actif" : ""}
                onClick={() => setLangue(l)}
              >
                {l === "fr" ? "FR" : "EN"}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 p-4 space-y-3">
        {/* Identity */}
        <CarteMboa>
          <h2 className="text-titre mb-3">{t("rej.who")}</h2>
          <input
            type="text"
            placeholder={t("rej.nomPh")}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
            style={{ fontSize: 20 }}
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder={t("rej.telPh")}
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
            style={{ fontSize: 20 }}
          />
          <select
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 18 }}
          >
            <option value="">{t("rej.villagePh")}</option>
            {VILLAGES_CAMEROUN.map((v) => (
              <option key={v} value={v}>{v === "Other" ? t("rej.villageAutre") : v}</option>
            ))}
          </select>
        </CarteMboa>

        {/* Declared products */}
        {produits.map((p, i) => (
          <CarteMboa key={i}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-corps font-bold">{t("rej.produit")} {i + 1}</h3>
              {produits.length > 1 && (
                <button onClick={() => retirerProduit(i)} className="text-[var(--mboa-error)] text-xl">✕</button>
              )}
            </div>

            {/* Quick pick from the catalogue */}
            <div className="grid grid-cols-3 gap-1 mb-2 max-h-40 overflow-y-auto">
              {catalogue.slice(0, 12).map((e) => (
                <button
                  key={e.slug}
                  onClick={() => choisirCatalogue(i, e.slug)}
                  className="flex flex-col items-center p-1 rounded-lg"
                  style={{
                    minHeight: 48,
                    background: p.nom === e.nom ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                    border: `1px solid ${p.nom === e.nom ? "var(--mboa-primary)" : "transparent"}`,
                  }}
                >
                  <PictoCategorie categorie={e.categorie} size={18} />
                  <span className="text-aide mt-0.5 text-center" style={{ fontSize: 10 }}>{e.nom}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder={t("rej.nomProduitPh")}
              value={p.nom}
              onChange={(e) => majProduit(i, { nom: e.target.value })}
              className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
              style={{ fontSize: 18 }}
            />

            {/* Category */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              {CATEGORIES_ORDREES.map((c) => (
                <button
                  key={c}
                  onClick={() => majProduit(i, { categorie: c })}
                  className="flex flex-col items-center p-1 rounded-lg"
                  style={{
                    minHeight: 48,
                    background: p.categorie === c ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                    border: `1px solid ${p.categorie === c ? "var(--mboa-primary)" : "transparent"}`,
                  }}
                >
                  <PictoCategorie categorie={c} size={18} />
                  <span className="text-aide mt-0.5 text-center" style={{ fontSize: 9 }}>{CATEGORIE_INFO[c].libelle}</span>
                </button>
              ))}
            </div>

            {/* Unit + quantity + price */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={p.unite}
                onChange={(e) => majProduit(i, { unite: e.target.value as Unite })}
                className="p-2 border-2 border-[var(--mboa-primary)] rounded-xl"
                style={{ fontSize: 16 }}
              >
                {Object.values(Unite).map((u) => (
                  <option key={u} value={u}>{UNITE_INFO[u].pluriel}</option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                placeholder={t("rej.quantitePh")}
                value={p.quantite || ""}
                onChange={(e) => majProduit(i, { quantite: parseInt(e.target.value) || 1 })}
                className="p-2 border-2 border-[var(--mboa-primary)] rounded-xl text-center"
                style={{ fontSize: 18 }}
              />
            </div>

            <input
              type="number"
              inputMode="numeric"
              placeholder={t("rej.prixPh")}
              value={p.prix}
              onChange={(e) => majProduit(i, { prix: e.target.value })}
              className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl text-chiffre mb-2"
              style={{ fontSize: 24 }}
            />
            {p.prix && p.quantite > 0 && (
              <p className="text-aide text-[var(--mboa-text-doux)] mb-2">
                {t("rej.total")} {formaterFcfa(Math.round(p.quantite * (parseInt(p.prix) || 0)))}
              </p>
            )}

            {/* Photo */}
            <div
              onClick={() => prendrePhoto(i)}
              className="w-full h-32 bg-[var(--mboa-background)] rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed border-[var(--mboa-primary)]"
            >
              {p.photoUrl ? (
                <img src={p.photoUrl} alt={t("rej.photoAlt")} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="text-center">
                  <div className="text-4xl">📷</div>
                  <p className="text-aide text-[var(--mboa-text-doux)] mt-1">{t("rej.photo")}</p>
                </div>
              )}
            </div>
          </CarteMboa>
        ))}

        <BoutonMboa variant="surface" onClick={ajouterProduit} className="w-full">
          {t("rej.ajouter")}
        </BoutonMboa>

        {/* Optional note */}
        <CarteMboa>
          <label className="text-corps block mb-2">{t("rej.noteLabel")}</label>
          <textarea
            placeholder={t("rej.notePh")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 16, minHeight: 60 }}
          />
        </CarteMboa>

        {/* Errors */}
        {erreurs.length > 0 && (
          <div className="bg-[var(--mboa-error-doux)] rounded-xl p-3">
            {erreurs.map((e, i) => (
              <p key={i} className="text-aide text-[var(--mboa-error)]">• {e}</p>
            ))}
          </div>
        )}

        <BoutonMboa
          variant="primary"
          onClick={envoyer}
          disabled={enCours}
          className="w-full !text-titre"
        >
          {enCours ? t("rej.envoi") : t("rej.envoyer")}
        </BoutonMboa>

        <p className="text-aide text-center text-[var(--mboa-text-doux)]">
          {t("rej.dejaFournisseur")}{" "}
          <Link href="/connexion" className="text-[var(--mboa-primary)] underline">{t("rej.connecter")}</Link>
        </p>
      </div>
    </FondMboa>
  );
}
