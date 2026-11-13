import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devenir fournisseur - MBOA BIO 237",
  description: "Rejoignez le comptoir MBOA BIO 237 en tant que producteur et vendez votre récolte directement.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
