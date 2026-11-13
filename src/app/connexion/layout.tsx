import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — MBOA BIO 237",
  description: "Access your MBOA BIO 237 space: customer, supplier, driver or administration.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
