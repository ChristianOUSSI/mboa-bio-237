import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supplier space — MBOA BIO 237",
  description: "MBOA BIO producer space: offer your harvest and track your counter sales.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
