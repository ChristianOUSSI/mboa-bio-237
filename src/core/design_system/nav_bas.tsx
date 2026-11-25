"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePanier, useSession } from "../etat/store";
import { useTr } from "../i18n";
import { messagesNonLus } from "../data/depots";

/**
 * Barre de navigation basse de l'espace client : pouce-friendly,
 * toujours visible. Marché / Liste / Panier (badge) / Commandes / Messages.
 */
export function NavBasConsommateur() {
  const pathname = usePathname();
  const t = useTr();
  const nbLignes = usePanier((s) => s.lignes.length);
  const { profil } = useSession();
  const [msgNonLus, setMsgNonLus] = useState(0);

  // Badge messages non lus sur l'onglet 💬 (poll léger, 45 s).
  useEffect(() => {
    if (!profil) return;
    let actif = true;
    const charger = () => {
      messagesNonLus(profil)
        .then((n) => {
          if (actif) setMsgNonLus(n);
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

  const onglets = [
    { href: "/consommateur", icon: "🏪", label: t("march.titre"), actif: pathname === "/consommateur" },
    { href: "/consommateur/liste", icon: "📋", label: t("march.liste"), actif: pathname.startsWith("/consommateur/liste") },
    { href: "/consommateur/panier", icon: "🛒", label: t("panier.titre"), actif: pathname.startsWith("/consommateur/panier"), badge: nbLignes },
    { href: "/consommateur/suivi", icon: "📦", label: t("march.mesCommandes"), actif: pathname.startsWith("/consommateur/suivi") },
    { href: "/messages", icon: "💬", label: t("msg.titre"), actif: pathname === "/messages", badge: msgNonLus },
  ];

  return (
    <nav className="nav-bas" aria-label="Navigation principale">
      {onglets.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          className={`nav-bas-item ${o.actif ? "actif" : ""}`}
          aria-current={o.actif ? "page" : undefined}
        >
          <span className="nav-bas-icon">{o.icon}</span>
          <span className="nav-bas-label">{o.label}</span>
          {o.badge != null && o.badge > 0 && (
            <span className="nav-bas-badge">{o.badge > 99 ? "99+" : o.badge}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
