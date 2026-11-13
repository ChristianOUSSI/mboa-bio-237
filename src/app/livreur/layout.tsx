import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace livreur - MBOA BIO 237",
  description: "Espace livreur MBOA BIO : courses assignées et suivi.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
