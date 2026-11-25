import type { Metadata } from "next";
import { Suspense } from "react";
import { NavBasConsommateur } from "@/core/design_system/nav_bas";

export const metadata: Metadata = {
  title: "Espace client - MBOA BIO 237",
  description: "Commandez les produits frais MBOA BIO : liste de courses, panier et suivi de livraison.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-nav-bas">{children}</div>
      <Suspense fallback={null}>
        <NavBasConsommateur />
      </Suspense>
    </>
  );
}
