"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTr } from "../i18n";

/**
 * Barre de navigation basse de l'espace fournisseur : les 4 écrans
 * du producteur, pouce-friendly.
 */
export function NavBasFournisseur() {
  const pathname = usePathname();
  const t = useTr();

  const onglets = [
    { href: "/fournisseur", icon: "🏠", label: t("fourn.accueil"), actif: pathname === "/fournisseur" },
    { href: "/fournisseur/proposer", icon: "🌾", label: t("fourn.navVendre"), actif: pathname.startsWith("/fournisseur/proposer") },
    { href: "/fournisseur/achats", icon: "💰", label: t("fourn.navVentes"), actif: pathname.startsWith("/fournisseur/achats") },
    { href: "/fournisseur/stock", icon: "📦", label: t("fourn.navStock"), actif: pathname.startsWith("/fournisseur/stock") },
  ];

  return (
    <nav className="nav-bas" aria-label="Navigation fournisseur">
      {onglets.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          className={`nav-bas-item ${o.actif ? "actif" : ""}`}
          aria-current={o.actif ? "page" : undefined}
        >
          <span className="nav-bas-icon">{o.icon}</span>
          <span className="nav-bas-label">{o.label}</span>
        </Link>
      ))}
    </nav>
  );
}
