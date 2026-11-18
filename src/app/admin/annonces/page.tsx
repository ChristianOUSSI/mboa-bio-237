"use client";

import { useState } from "react";
import { EnTetePage, CarteMboa, BoutonMboa, BadgeStatut } from "@/core/design_system/composants";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { toutesAnnonces, sauverAnnonce, basculerAnnonceActive, supprimerAnnonce } from "@/core/data/depots";
import { Annonce, TypeAnnonce, TYPE_ANNONCE_INFO } from "@/core/types/annonce";

export default function PageAnnonces() {
  const { pret } = useGuardRole("admin");
  const t = useTr();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [type, setType] = useState<TypeAnnonce>("promo");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    setAnnonces(await toutesAnnonces());
  }
  useActualisation(charger, 30000);

  async function publier() {
    if (!titre.trim()) return;
    setEnCours(true);
    try {
      await sauverAnnonce({ type, titre, texte });
      setTitre("");
      setTexte("");
      setType("promo");
      await charger();
    } finally {
      setEnCours(false);
    }
  }

  if (!pret) return null;

  const actives = annonces.filter((a) => a.actif).length;

  return (
    <div className="min-h-screen pb-28">
      <EnTetePage titre={t("ann.titre")} sousTitre={`${actives} ${t("ann.actives")}`} />

      <div className="px-4 space-y-4">
        {/* Formulaire de publication */}
        <CarteMboa>
          <h2 className="text-corps font-bold mb-3">📣 {t("ann.nouvelle")}</h2>
          <div className="flex gap-2 mb-3">
            {(Object.keys(TYPE_ANNONCE_INFO) as TypeAnnonce[]).map((ty) => (
              <button
                key={ty}
                onClick={() => setType(ty)}
                className="flex-1 py-2.5 rounded-xl text-aide font-bold transition-all"
                style={{
                  background: type === ty ? "var(--mboa-primary)" : "var(--mboa-surface-doux)",
                  color: type === ty ? "#fff" : "var(--mboa-text)",
                  border: "1px solid var(--mboa-border)",
                }}
              >
                {TYPE_ANNONCE_INFO[ty].emoji} {t(`ann.type.${ty}`)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={t("ann.titrePh")}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="champ-mboa w-full mb-2"
          />
          <textarea
            placeholder={t("ann.textePh")}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={2}
            className="champ-mboa w-full resize-none"
          />
          <BoutonMboa onClick={publier} disabled={enCours || !titre.trim()} className="w-full mt-3">
            {enCours ? t("ann.envoi") : `📢 ${t("ann.publier")}`}
          </BoutonMboa>
        </CarteMboa>

        {/* Liste */}
        {annonces.length === 0 ? (
          <div className="etat-vide py-10">
            <span className="text-5xl block anim-flottant">📣</span>
            <p className="text-aide mt-2">{t("ann.vide")}</p>
          </div>
        ) : (
          annonces.map((a) => {
            const info = TYPE_ANNONCE_INFO[a.type] ?? TYPE_ANNONCE_INFO.info;
            return (
              <CarteMboa key={a.id} className={!a.actif ? "opacity-60" : ""}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden>{info.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-corps font-bold">{a.titre}</p>
                      <BadgeStatut statut={a.actif ? "actif" : "inactif"} />
                    </div>
                    {a.texte ? <p className="text-aide mt-1">{a.texte}</p> : null}
                    <p className="text-aide mt-1">
                      {t(`ann.type.${a.type}`)} · {new Date(a.createdLe).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => basculerAnnonceActive(a.id, !a.actif)}
                    className="flex-1 py-2.5 rounded-xl text-aide font-bold"
                    style={{ background: "var(--mboa-surface-doux)", border: "1px solid var(--mboa-border)" }}
                  >
                    {a.actif ? t("ann.desactiver") : t("ann.activer")}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("ann.supprimerConf"))) supprimerAnnonce(a.id).then(charger);
                    }}
                    className="px-4 py-2.5 rounded-xl text-aide font-bold"
                    style={{ background: "var(--mboa-error-doux)", color: "var(--mboa-error)" }}
                  >
                    {t("ann.supprimer")}
                  </button>
                </div>
              </CarteMboa>
            );
          })
        )}
      </div>
    </div>
  );
}
