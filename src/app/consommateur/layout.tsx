import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace client - MBOA BIO 237",
  description: "Commandez les produits frais MBOA BIO : liste de courses, panier et suivi de livraison.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
