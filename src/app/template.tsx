"use client";

import type { ReactNode } from "react";

/**
 * Transition de page : template.tsx est remonté par Next.js à chaque
 * navigation (contrairement à layout.tsx qui persiste). La classe
 * .transition-page applique un fondu + léger glissement - doux et
 * rapide, jamais gênant. Désactivée pour prefers-reduced-motion.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="transition-page">{children}</div>;
}
