"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePanier } from "../etat/store";
import { useTr } from "../i18n";

/**
 * Barre de navigation basse de l'espace client : pouce-friendly,
 * toujours visible. Marché / Liste / Panier (badge) / Commandes / Messages.
 */
export function NavBasConsommateur() {
  const pathname = usePathname();
  const t = useTr();
  const nbLignes = usePanier((s) => s.lignes.length);

  const onglets = [
    { href: "/consommateur", icon: "🏪", label: t("march.titre"), actif: pathname === "/consommateur" },
    { href: "/consommateur/liste", icon: "📋", label: t("march.liste"), actif: pathname.startsWith("/consommateur/liste") },
    { href: "/consommateur/panier", icon: "🛒", label: t("panier.titre"), actif: pathname.startsWith("/consommateur/panier"), badge: nbLignes },
    { href: "/consommateur/suivi", icon: "📦", label: t("march.mesCommandes"), actif: pathname.startsWith("/consommateur/suivi") },
    { href: "/messages", icon: "💬", label: t("msg.titre"), actif: pathname === "/messages" },
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
