import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion - MBOA BIO 237",
  description: "Accédez à votre espace MBOA BIO 237 : client, fournisseur, livreur ou administration.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
