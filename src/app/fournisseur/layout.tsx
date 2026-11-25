import type { Metadata } from "next";
import { Suspense } from "react";
import { GardeFournisseur } from "./GardeFournisseur";
import { NavBasFournisseur } from "@/core/design_system/nav_bas_fournisseur";

export const metadata: Metadata = {
  title: "Espace fournisseur - MBOA BIO 237",
  description: "Espace producteur MBOA BIO : proposez votre récolte et suivez vos ventes au comptoir.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GardeFournisseur>
      <div className="pb-nav-bas">{children}</div>
      <Suspense fallback={null}>
        <NavBasFournisseur />
      </Suspense>
    </GardeFournisseur>
  );
}
