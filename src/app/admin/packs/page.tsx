"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chargerCatalogue, chargerStock, sauverPack, majPackComposants } from "@/core/data/depots";
import { CarteMboa, BoutonMboa, EnTetePage, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { EntreeCatalogue, catalogueUniteReelle } from "@/core/types/catalogue";
import { Produit, produitEstPack } from "@/core/types/produit";
import { Unite, UNITE_INFO, unitePour } from "@/core/types/unite";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useTr } from "@/core/i18n";

interface ComposantDraft {
  slug: string;
  nom: string;
  quantite: number;
  unite: Unite;
}

/** Éditeur d'ingrédients réutilisé à la création et à la modification d'un plat. */
function EditeurComposants({
  catalogue,
  composants,
  onChange,
}: {
  catalogue: EntreeCatalogue[];
  composants: ComposantDraft[];
  onChange: (suite: ComposantDraft[]) => void;
}) {
  const t = useTr();

  function maj(i: number, patch: Partial<ComposantDraft>) {
    onChange(composants.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function choisir(i: number, slug: string) {
    const entree = catalogue.find((e) => e.slug === slug);
    if (!entree) return;
    maj(i, { slug: entree.slug, nom: entree.nom, unite: catalogueUniteReelle(entree) });
  }

  function ajouter() {
    const premier = catalogue[0];
    if (!premier) return;
    onChange([
      ...composants,
      { slug: premier.slug, nom: premier.nom, quantite: 1, unite: catalogueUniteReelle(premier) },
    ]);
  }

  return (
    <div>
      <p className="text-corps font-bold mb-2">{t("adm.pack.ingredients")}</p>
      {composants.map((c, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          <select
            value={c.slug}
            onChange={(e) => choisir(i, e.target.value)}
            className="flex-1 p-2 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 16 }}
          >
            {catalogue.map((e) => (
              <option key={e.slug} value={e.slug}>{e.nom}</option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={c.quantite}
            onChange={(e) => maj(i, { quantite: parseInt(e.target.value) || 1 })}
            className="w-16 p-2 border-2 border-[var(--mboa-primary)] rounded-xl text-center"
            style={{ fontSize: 18 }}
          />
          <select
            value={c.unite}
            onChange={(e) => maj(i, { unite: e.target.value as Unite })}
            className="w-28 p-2 border-2 border-[var(--mboa-primary)] rounded-xl"
            style={{ fontSize: 16 }}
          >
            {Object.values(Unite).map((u) => (
              <option key={u} value={u}>{UNITE_INFO[u].un}</option>
            ))}
          </select>
          <button
            onClick={() => onChange(composants.filter((_, idx) => idx !== i))}
            className="text-[var(--mboa-error)] text-2xl px-1"
            aria-label={t("adm.pack.retirer")}
          >
            ×
          </button>
        </div>
      ))}
      <BoutonMboa variant="surface" onClick={ajouter} className="w-full mb-3">
        {t("adm.pack.ajouter")}
      </BoutonMboa>
    </div>
  );
}

export default function PacksAdminPage() {
  const router = useRouter();
  const { pret } = useGuardRole("admin");
  const t = useTr();
  const [catalogue, setCatalogue] = useState<EntreeCatalogue[]>([]);
  const [packs, setPacks] = useState<Produit[]>([]);
  const [nom, setNom] = useState("");
  const [photo, setPhoto] = useState("");
  const [prix, setPrix] = useState("");
  const [stock, setStock] = useState("10");
  const [composants, setComposants] = useState<ComposantDraft[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionComposants, setEditionComposants] = useState<ComposantDraft[]>([]);
  const [editionEnCours, setEditionEnCours] = useState(false);

  useEffect(() => {
    async function charger() {
      const [c, s] = await Promise.all([chargerCatalogue(), chargerStock()]);
      setCatalogue(c);
      setPacks(s.filter(produitEstPack));
    }
    charger();
  }, []);

  async function sauver() {
    const prixNum = parseInt(prix) || 0;
    if (!nom.trim() || prixNum <= 0 || composants.length === 0) return;
    setEnCours(true);
    try {
      const p = await sauverPack({
        nom: nom.trim(),
        photo,
        prix: prixNum,
        quantite: Math.max(1, parseInt(stock) || 1),
        composants: composants.map((c) => ({
          slug: c.slug,
          nom: c.nom,
          quantite: c.quantite,
          unite: c.unite,
        })),
      });
      if (p) setPacks([...packs, p]);
      setNom("");
      setPhoto("");
      setPrix("");
      setStock("10");
      setComposants([]);
    } finally {
      setEnCours(false);
    }
  }

  function ouvrirEdition(p: Produit) {
    setEditionId(p.id);
    setEditionComposants(
      p.composants.map((c) => ({
        slug: c.slug,
        nom: c.nom?.trim() || c.slug.replaceAll("_", " "),
        quantite: c.quantite,
        unite: c.unite,
      })),
    );
  }

  async function sauverEdition() {
    if (!editionId || editionComposants.length === 0) return;
    setEditionEnCours(true);
    try {
      const maj = await majPackComposants(
        editionId,
        editionComposants.map((c) => ({
          slug: c.slug,
          nom: c.nom,
          quantite: c.quantite,
          unite: c.unite,
        })),
      );
      if (maj) {
        setPacks(packs.map((p) => (p.id === maj.id ? maj : p)));
      }
      setEditionId(null);
    } finally {
      setEditionEnCours(false);
    }
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
      <EnTetePage titre={t("adm.pack.titre")} sousTitre={t("adm.pack.sousTitre")} onRetour={() => router.back()} />

      <div className="flex-1 p-4 space-y-3">
        {/* Composition d'un nouveau plat */}
        <CarteMboa>
          <h2 className="text-titre mb-3">{t("adm.pack.composer")}</h2>

          <input
            type="text"
            placeholder={t("adm.pack.nomHint")}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
            style={{ fontSize: 20 }}
          />

          <input
            type="text"
            placeholder={t("adm.pack.photo")}
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
            style={{ fontSize: 18 }}
          />

          <EditeurComposants catalogue={catalogue} composants={composants} onChange={setComposants} />

          {/* Prix unique + stock de parts */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-corps block mb-1">{t("adm.pack.prix")}</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="E.g.: 2500"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl text-chiffre"
                style={{ fontSize: 24 }}
              />
            </div>
            <div>
              <label className="text-corps block mb-1">{t("adm.pack.stock")}</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full p-3 border-2 border-[var(--mboa-primary)] rounded-xl text-chiffre text-center"
                style={{ fontSize: 24 }}
              />
            </div>
          </div>

          <p className="text-aide text-[var(--mboa-text-doux)] mb-2 italic">{t("adm.pack.autoCategorie")}</p>

          <BoutonMboa
            variant="primary"
            onClick={sauver}
            disabled={!nom.trim() || !prix || composants.length === 0 || enCours}
            className="w-full"
          >
            {enCours ? t("adm.pack.sauvegarde") : t("adm.pack.sauver")}
          </BoutonMboa>
        </CarteMboa>

        {/* Plats existants */}
        <h2 className="text-titre">{t("adm.pack.liste")} ({packs.length})</h2>
        {packs.map((p) => (
          <CarteMboa key={p.id}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-corps font-bold">{p.nom}</span>
              <span className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(p.prix)}</span>
            </div>
            <p className="text-aide text-[var(--mboa-text-doux)]">
              {p.composants
                .map((c) => `${c.quantite} ${unitePour(c.unite, c.quantite)} ${t("adm.pack.de")} ${c.nom?.trim() || c.slug.replaceAll("_", " ")}`)
                .join(" · ")}
            </p>

            {editionId === p.id ? (
              <div className="mt-3 pt-3 border-t-2 border-[var(--mboa-primary)]">
                <EditeurComposants
                  catalogue={catalogue}
                  composants={editionComposants}
                  onChange={setEditionComposants}
                />
                <div className="flex gap-2">
                  <BoutonMboa
                    variant="primary"
                    onClick={sauverEdition}
                    disabled={editionComposants.length === 0 || editionEnCours}
                    className="flex-1"
                  >
                    {editionEnCours ? t("adm.pack.sauvegarde") : t("adm.pack.enregistrerModif")}
                  </BoutonMboa>
                  <BoutonMboa variant="surface" onClick={() => setEditionId(null)} className="flex-1">
                    {t("adm.pack.annuler")}
                  </BoutonMboa>
                </div>
              </div>
            ) : (
              <BoutonMboa variant="surface" onClick={() => ouvrirEdition(p)} className="w-full mt-3">
                ✏️ {t("adm.pack.modifier")}
              </BoutonMboa>
            )}
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}
