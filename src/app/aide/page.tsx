"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FondMboa, EnTetePage, CarteMboa, BoutonVoix } from "@/core/design_system/composants";
import { useTr } from "@/core/i18n";

/**
 * Page « Comment ça marche » - guide en 4 étapes pour les clients,
 * en très gros caractères et emojis, avec lecture vocale sur chaque
 * étape. Accessible sans connexion (aide avant même de s'inscrire).
 */
export default function PageAide() {
  const router = useRouter();
  const t = useTr();

  const etapes = [
    { emoji: "🛒", titre: "aide.etape1.titre", texte: "aide.etape1.texte" },
    { emoji: "➕", titre: "aide.etape2.titre", texte: "aide.etape2.texte" },
    { emoji: "📦", titre: "aide.etape3.titre", texte: "aide.etape3.texte" },
    { emoji: "💵", titre: "aide.etape4.titre", texte: "aide.etape4.texte" },
  ];

  return (
    <FondMboa>
      <EnTetePage
        titre={`❓ ${t("aide.titre")}`}
        sousTitre={t("aide.sousTitre")}
        onRetour={() => router.back()}
      />

      <div className="flex-1 px-4 py-3 space-y-3">
        {etapes.map((e, i) => (
          <CarteMboa key={i} className="anim-apparition" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 44 }} aria-hidden>{e.emoji}</span>
              <div className="flex-1">
                <h2 className="text-titre mb-1">{t(e.titre)}</h2>
                <p className="text-corps" style={{ lineHeight: 1.5 }}>{t(e.texte)}</p>
              </div>
              <BoutonVoix texte={`${t(e.titre)}. ${t(e.texte)}`} />
            </div>
          </CarteMboa>
        ))}

        <CarteMboa className="anim-apparition" style={{ animationDelay: "0.35s", border: "2px solid var(--mboa-secondary)" }}>
          <p className="text-corps font-bold mb-2">💬 {t("aide.besoinAide")}</p>
          <Link href="/messages" className="btn-mboa btn-secondary w-full !min-h-[52px] text-corps">
            {t("aide.boutonAdmin")}
          </Link>
        </CarteMboa>
      </div>
    </FondMboa>
  );
}
