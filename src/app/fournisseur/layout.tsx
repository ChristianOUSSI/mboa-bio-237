import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace fournisseur - MBOA BIO 237",
  description: "Espace producteur MBOA BIO : proposez votre récolte et suivez vos ventes au comptoir.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
