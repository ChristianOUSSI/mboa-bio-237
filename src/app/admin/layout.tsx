import type { Metadata } from "next";
import { Suspense } from "react";
import { NavBasAdmin } from "@/core/design_system/nav_bas_admin";

export const metadata: Metadata = {
  title: "Administration - MBOA BIO 237",
  description: "Espace de gestion du comptoir MBOA BIO 237.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-nav-bas">{children}</div>
      <Suspense fallback={null}>
        <NavBasAdmin />
      </Suspense>
    </>
  );
}
