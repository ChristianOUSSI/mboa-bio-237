"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Profil } from "../types/profil";
import { AppRole } from "../config/app_env";
import { LigneCommande, resumerQuantites } from "../types/commande";
import { EntreeCatalogue } from "../types/catalogue";
import { Produit } from "../types/produit";
import { etatEcrire } from "../data/base_locale";

// ============================================================
// Session
// ============================================================

/** Cookie miroir lu par src/proxy.ts pour la protection des routes. */
function poserCookieSession(role: AppRole | null): void {
  if (typeof document === "undefined") return;
  if (role) {
    document.cookie = `mboa-session-role=${role}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } else {
    document.cookie = "mboa-session-role=; path=/; max-age=0";
  }
}

interface SessionState {
  profil: Profil | null;
  role: AppRole;
  setSession: (profil: Profil | null, role?: AppRole) => void;
  majProfil: (maj: Partial<Profil>) => void;
  deconnexion: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      profil: null,
      role: "consommateur",
      setSession: (profil, role) => {
        const r = role ?? (profil?.role as AppRole) ?? "consommateur";
        set(() => ({ profil, role: r }));
      },
      majProfil: (maj) =>
        set((state) => ({
          profil: state.profil ? { ...state.profil, ...maj } : null,
        })),
      deconnexion: () => {
        // Session IndexedDB aussi, sinon "/" re-connecterait silencieusement.
        etatEcrire("session_id", null).catch(() => {});
        // Referme aussi la session Supabase Auth éventuelle.
        import("../auth/auth_supabase").then((m) => m.deconnecterSupabase()).catch(() => {});
        set(() => ({ profil: null, role: "consommateur" }));
      },
    }),
    { name: "mboa-session" },
  ),
);

// ============================================================
// Panier (cart)
// ============================================================

/** Clé de ligne panier : produit + unité choisie. Un même produit peut
 *  exister en plusieurs unités (kg / pièce / sac) avec des prix différents. */
export function clePanier(produitId: string, unite?: string | null): string {
  return `${produitId}|${unite ?? ""}`;
}

interface PanierState {
  lignes: LigneCommande[];
  poser: (ligne: LigneCommande) => void;
  retirer: (cle: string) => void;
  ajuster: (cle: string, quantite: number) => void;
  vider: () => void;
  montantTotal: () => number;
  resumeQuantites: () => string;
  compte: () => number;
}

export const usePanier = create<PanierState>()(
  persist(
    (set, get) => ({
      lignes: [],
      poser: (ligne) =>
        set((state) => {
          const cle = clePanier(ligne.produitId, ligne.unite);
          const existant = state.lignes.find((l) => clePanier(l.produitId, l.unite) === cle);
          if (existant) {
            return {
              lignes: state.lignes.map((l) =>
                clePanier(l.produitId, l.unite) === cle
                  ? { ...l, quantite: l.quantite + ligne.quantite }
                  : l,
              ),
            };
          }
          return { lignes: [...state.lignes, ligne] };
        }),
      retirer: (cle) =>
        set((state) => ({
          lignes: state.lignes.filter((l) => clePanier(l.produitId, l.unite) !== cle),
        })),
      ajuster: (cle, quantite) =>
        set((state) => ({
          lignes: state.lignes.map((l) =>
            clePanier(l.produitId, l.unite) === cle
              ? { ...l, quantite: Math.max(0, quantite) }
              : l,
          ).filter((l) => l.quantite > 0),
        })),
      vider: () => set(() => ({ lignes: [] })),
      montantTotal: () =>
        get().lignes.reduce((somme, l) => somme + Math.round(l.quantite * l.prix), 0),
      resumeQuantites: () => resumerQuantites(get().lignes),
      compte: () => get().lignes.length,
    }),
    { name: "mboa-panier" },
  ),
);

// ============================================================
// Liste de marché
// ============================================================

interface ListeState {
  titre: string;
  lignes: LigneCommande[];
  modifiee: boolean;
  charger: (titre: string, lignes: LigneCommande[]) => void;
  poser: (ligne: LigneCommande) => void;
      poserLibre: (nom: string, categorie: string, unite: string, prix: number) => void;
  retirer: (index: number) => void;
  ajuster: (index: number, quantite: number) => void;
  vider: () => void;
  montantEstime: () => number;
}

export const useListe = create<ListeState>()(
  persist(
    (set, get) => ({
      titre: "Ma liste",
      lignes: [],
      modifiee: false,
      charger: (titre, lignes) =>
        set(() => ({ titre, lignes, modifiee: false })),
      poser: (ligne) =>
        set((state) => ({
          lignes: [...state.lignes, ligne],
          modifiee: true,
        })),
      poserLibre: (nom, categorie, unite, prix) =>
        set((state) => ({
          lignes: [
            ...state.lignes,
            {
              produitId: `libre_${Date.now()}`,
              slug: null,
              nom,
              categorie: categorie as never,
              quantite: 1,
              prix,
              coutAchat: 0,
              photo: "",
              unite: unite as never,
              composants: [],
            },
          ],
          modifiee: true,
        })),
      retirer: (index) =>
        set((state) => ({
          lignes: state.lignes.filter((_, i) => i !== index),
          modifiee: true,
        })),
      ajuster: (index, quantite) =>
        set((state) => ({
          lignes: state.lignes
            .map((l, i) => (i === index ? { ...l, quantite: Math.max(1, Math.round(quantite)) } : l))
            .filter((l) => l.quantite > 0),
          modifiee: true,
        })),
      vider: () => set(() => ({ lignes: [], modifiee: false, titre: "Ma liste" })),
      montantEstime: () =>
        get().lignes.reduce((somme, l) => somme + Math.round(l.quantite * l.prix), 0),
    }),
    { name: "mboa-liste" },
  ),
);

// ============================================================
// Toast (petites confirmations globales)
// ============================================================

interface ToastState {
  message: string;
  visible: boolean;
  montrer: (message: string) => void;
  cacher: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>()((set) => ({
  message: "",
  visible: false,
  montrer: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set(() => ({ message, visible: true }));
    toastTimer = setTimeout(() => set(() => ({ visible: false })), 2600);
  },
  cacher: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set(() => ({ visible: false }));
  },
}));

/** Raccourci : affiche une confirmation éphémère en bas d'écran. */
export function toast(message: string): void {
  useToast.getState().montrer(message);
}

// ============================================================
// Réseau (online/offline)
// ============================================================

interface ReseauState {
  enLigne: boolean;
  fileAttente: number;
  setEnLigne: (val: boolean) => void;
  setFileAttente: (val: number) => void;
}

export const useReseau = create<ReseauState>()((set) => ({
  enLigne: typeof navigator !== "undefined" ? navigator.onLine : true,
  fileAttente: 0,
  setEnLigne: (val) => set(() => ({ enLigne: val })),
  setFileAttente: (val) => set(() => ({ fileAttente: val })),
}));

// ============================================================
// Catalogue & vitrine (données)
// ============================================================

interface DataState {
  catalogue: EntreeCatalogue[];
  vitrine: Produit[];
  setCatalogue: (val: EntreeCatalogue[]) => void;
  setVitrine: (val: Produit[]) => void;
}

export const useData = create<DataState>()((set) => ({
  catalogue: [],
  vitrine: [],
  setCatalogue: (val) => set(() => ({ catalogue: val })),
  setVitrine: (val) => set(() => ({ vitrine: val })),
}));
