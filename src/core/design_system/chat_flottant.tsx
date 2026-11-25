"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { messagesNonLus } from "@/core/data/depots";

/**
 * Bouton flottant « discuter avec l'admin » - visible sur tous les menus
 * dès qu'une session existe, avec badge du nombre de messages non lus.
 * Masqué sur la page /messages elle-même.
 */
export function BoutonChatFlottant() {
  const { profil } = useSession();
  const pathname = usePathname();
  const [nonLus, setNonLus] = useState(0);

  useEffect(() => {
    if (!profil) return;
    let actif = true;
    const charger = () => {
      messagesNonLus(profil)
        .then((n) => {
          if (actif) setNonLus(n);
        })
        .catch(() => {});
    };
    charger();
    const timer = setInterval(charger, 45000);
    return () => {
      actif = false;
      clearInterval(timer);
    };
  }, [profil]);

  if (!profil || pathname === "/messages") return null;

  // Sur l'espace client, la nav basse occupe ~68px en bas : on remonte le bouton.
  const avecNavBas = pathname?.startsWith("/consommateur") ?? false;

  return (
    <Link
      href="/messages"
      aria-label="Discuter avec l'admin"
      className={`fixed z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform active:scale-90 ${nonLus > 0 ? "halo-alerte" : ""}`}
      style={{
        bottom: avecNavBas
          ? "calc(5.75rem + env(safe-area-inset-bottom, 0px))"
          : "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        left: "1rem",
        background: "var(--mboa-secondary, #AED581)",
        color: "#1E5128",
      }}
    >
      💬
      {nonLus > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full text-white text-xs font-black flex items-center justify-center"
          style={{ background: "var(--mboa-error, #C62828)" }}
        >
          {nonLus > 99 ? "99+" : nonLus}
        </span>
      )}
    </Link>
  );
}
