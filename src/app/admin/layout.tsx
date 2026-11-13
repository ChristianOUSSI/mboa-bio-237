import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration — MBOA BIO 237",
  description: "Back office for the MBOA BIO 237 counter.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
