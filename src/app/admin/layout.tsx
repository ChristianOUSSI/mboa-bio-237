import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration - MBOA BIO 237",
  description: "Espace de gestion du comptoir MBOA BIO 237.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
