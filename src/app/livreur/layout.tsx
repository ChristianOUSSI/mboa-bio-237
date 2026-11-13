import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver space — MBOA BIO 237",
  description: "MBOA BIO driver space: assigned deliveries and tracking.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
