"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CarteMboa, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { categoriesPerso, creerCategoriePerso, supprimerCategoriePerso, CategoriePerso } from "@/core/data/categories";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useSession } from "@/core/etat/store";
import { useTr } from "@/core/i18n";

const EMOJIS_CAT = ["🥭", "🍌", "🍍", "🥑", "🍅", "🌶️", "🥬", "🍆", "🍠", "🥔", "🌽", "🥜", "🐟", "🍗", "🥚", "🫘", "🍚", "🫒", "🍵", "🥛", "🍯", "🌿", "🏷️"];

export default function CategoriesAdminPage() {
  const router = useRouter();
  const { pret } = useGuardRole("admin");
  const { deconnexion } = useSession();
  const t = useTr();
  const [persos, setPersos] = useState<CategoriePerso[]>([]);
  const [nom, setNom] = useState("");
  const [emoji, setEmoji] = useState("🏷️");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    setPersos(await categoriesPerso());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pret) charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);

  async function ajouter() {
    setErreur(null);
    if (nom.trim().length < 2) {
      setErreur(t("adm.cat.nomRequis"));
      return;
    }
    setEnCours(true);
    try {
      const c = await creerCategoriePerso(nom, emoji);
      if (!c) {
        setErreur(t("adm.cat.existe"));
        return;
      }
      setNom("");
      setEmoji("🏷️");
      await charger();
    } finally {
      setEnCours(false);
    }
  }

  async function retirer(slug: string) {
    setEnCours(true);
    try {
      await supprimerCategoriePerso(slug);
      await charger();
    } finally {
      setEnCours(false);
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
      <EnTetePage
        titre={`🏷️ ${t("adm.cat.titre")}`}
        sousTitre={t("adm.cat.sousTitre")}
        onRetour={() => router.back()}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
      />

      <div className="flex-1 p-4 space-y-3">
        <CarteMboa>
          <h2 className="text-titre mb-2">{t("adm.cat.nouvelle")}</h2>
          <input
            type="text"
            placeholder={t("adm.cat.nomPh")}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="champ-mboa mb-2"
            style={{ fontSize: 18 }}
          />
          <div className="flex flex-wrap gap-1 mb-3">
            {EMOJIS_CAT.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className="w-9 h-9 rounded-lg text-xl flex items-center justify-center"
                style={{
                  background: emoji === e ? "var(--mboa-secondary-doux)" : "var(--mboa-background)",
                  border: `2px solid ${emoji === e ? "var(--mboa-primary)" : "transparent"}`,
                }}
              >
                {e}
              </button>
            ))}
          </div>
          {erreur && <p className="text-[var(--mboa-error)] text-aide mb-2 font-bold">{erreur}</p>}
          <BoutonMboa onClick={ajouter} disabled={enCours} className="w-full">
            {t("adm.cat.ajouter")}
          </BoutonMboa>
        </CarteMboa>

        <h2 className="text-titre">{t("adm.cat.liste")} ({persos.length})</h2>
        {persos.length === 0 && (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">{t("adm.cat.vide")}</p>
          </CarteMboa>
        )}
        {persos.map((c) => (
          <CarteMboa key={c.slug}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 28 }}>{c.emoji}</span>
                <div>
                  <p className="text-corps font-bold">{c.nom}</p>
                  <p className="text-aide text-[var(--mboa-text-doux)]">{c.slug}</p>
                </div>
              </div>
              <BoutonMboa variant="error" disabled={enCours} onClick={() => retirer(c.slug)}>
                {t("adm.cat.supprimer")}
              </BoutonMboa>
            </div>
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}

