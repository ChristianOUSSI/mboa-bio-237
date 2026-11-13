import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer space — MBOA BIO 237",
  description: "Order fresh MBOA BIO products: shopping list, cart and delivery tracking.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
