"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTr } from "../i18n";

/**
 * Barre de navigation basse de l'espace admin : les 5 écrans du
 * quotidien du comptoir, pouce-friendly. Le reste se gère depuis
 * la page d'accueil (tuiles).
 */
export function NavBasAdmin() {
  const pathname = usePathname();
  const t = useTr();

  const onglets = [
    { href: "/admin", icon: "🏠", label: t("adm.accueil"), actif: pathname === "/admin" },
    { href: "/admin/devis", icon: "📝", label: t("adm.devis2"), actif: pathname.startsWith("/admin/devis") },
    { href: "/admin/stock", icon: "📦", label: t("adm.stock"), actif: pathname.startsWith("/admin/stock") },
    { href: "/admin/livraisons", icon: "🏍️", label: t("adm.livraisons"), actif: pathname.startsWith("/admin/livraisons") },
    { href: "/admin/achats", icon: "📋", label: t("adm.fileAchats"), actif: pathname.startsWith("/admin/achats") },
  ];

  return (
    <nav className="nav-bas" aria-label="Navigation admin">
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
