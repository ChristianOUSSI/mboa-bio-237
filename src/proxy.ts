import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy de protection des routes MBOA BIO (ex-middleware, renommé en Next 16).
 *
 * Côté serveur, on ne peut pas lire le store Zustand (client-only).
 * On vérifie la présence du cookie/localStorage de session via un
 * cookie miroir que le client pose à la connexion.
 *
 * La vérification de rôle fine est complétée côté client par useGuardRole.
 */
const ROUTES_PROTEGEES: Record<string, string> = {
  "/admin": "admin",
  "/livreur": "livreur",
  "/fournisseur": "fournisseur",
  "/consommateur": "consommateur",
  "/superadmin": "superadmin",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Trouve la route protégée correspondante
  const route = Object.keys(ROUTES_PROTEGEES).find((r) => pathname.startsWith(r));
  if (!route) return NextResponse.next();

  const roleAttendu = ROUTES_PROTEGEES[route];
  const sessionCookie = request.cookies.get("mboa-session-role")?.value;

  // Pas de cookie de session → redirection connexion
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Mauvais rôle → redirection vers son espace
  if (sessionCookie !== roleAttendu) {
    const url = request.nextUrl.clone();
    url.pathname = `/${sessionCookie}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/livreur/:path*", "/fournisseur/:path*", "/consommateur/:path*", "/superadmin/:path*"],
};
