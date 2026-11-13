"use client";

/**
 * Cache local offline-first via IndexedDB.
 * Miroir de `BaseLocale` du Flutter original : 3 stores (cache, file, etat).
 */

const DB_NAME = "mboa_bio";
const DB_VERSION = 1;
/** Garde-fou : si IndexedDB ne répond pas (onglet bloquant, stockage capricieux), on abandonne au lieu de geler l'app. */
const DB_TIMEOUT_MS = 8000;

let _db: IDBDatabase | null = null;

function ouvrirDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    const minuteur = setTimeout(() => {
      try {
        req.onblocked = null;
        req.onerror = null;
        req.onsuccess = null;
        req.onupgradeneeded = null;
      } catch {
        // ignore
      }
      reject(new Error("IndexedDB open timeout"));
    }, DB_TIMEOUT_MS);
    const finir = (fn: () => void) => {
      clearTimeout(minuteur);
      fn();
    };
    req.onerror = () => finir(() => reject(req.error));
    req.onblocked = () => {
      // Un autre onglet garde la base ouverte pendant une montée de version :
      // on attend la fin normale, le timeout ci-dessus borne l'attente.
    };
    req.onsuccess = () => {
      const db = req.result;
      _db = db;
      // Si la base est fermée par un autre onglet, on repart de zéro.
      db.onversionchange = () => {
        db.close();
        if (_db === db) _db = null;
      };
      finir(() => resolve(db));
    };
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: ["entite", "id"] });
      }
      if (!db.objectStoreNames.contains("file")) {
        db.createObjectStore("file", { keyPath: "cle", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("etat")) {
        db.createObjectStore("etat", { keyPath: "cle" });
      }
    };
  });
}

/** Noms d'entités du cache. */
export const Entites = {
  profil: "profil",
  produit: "produit",
  commande: "commande",
  catalogue: "catalogue",
  vitrine: "vitrine",
  achat: "achat",
  suivi: "suivi",
  liste: "liste",
  livreur: "livreur",
  fournisseur: "fournisseur",
  notification: "notification",
} as const;

export interface EntiteCache {
  entite: string;
  id: string;
  payload: unknown;
  ecritLe: number;
}

export interface EntiteFile {
  cle?: number;
  entite: string;
  id: string;
  operation: string;
  payload: unknown;
  creeLe: number;
}

/** Écrit une entité dans le cache. */
export async function cacheEcrire(entite: string, id: string, payload: unknown): Promise<void> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("cache", "readwrite");
    const store = tx.objectStore("cache");
    store.put({ entite, id, payload, ecritLe: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("cacheEcrire failed:", e);
  }
}

/** Lit une entité du cache. */
export async function cacheLire<T = unknown>(entite: string, id: string): Promise<T | null> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("cache", "readonly");
    const store = tx.objectStore("cache");
    const req = store.get([entite, id]);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const result = req.result as EntiteCache | undefined;
        resolve(result ? (result.payload as T) : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Lit toutes les entités d'un type. */
export async function cacheTout<T = unknown>(entite: string): Promise<T[]> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("cache", "readonly");
    const store = tx.objectStore("cache");
    const req = store.openCursor();
    const result: T[] = [];
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const val = cursor.value as EntiteCache;
          if (val.entite === entite) {
            result.push(val.payload as T);
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** Ajoute une opération à la file d'envoi. */
export async function fileAjouter(entite: string, id: string, operation: string, payload: unknown): Promise<void> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("file", "readwrite");
    const store = tx.objectStore("file");
    store.add({ entite, id, operation, payload, creeLe: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("fileAjouter failed:", e);
  }
}

/** Compte les opérations en attente. */
export async function fileCompte(): Promise<number> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("file", "readonly");
    const store = tx.objectStore("file");
    const req = store.count();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/** Lit toutes les opérations en file. */
export async function fileTout(): Promise<EntiteFile[]> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("file", "readonly");
    const store = tx.objectStore("file");
    const req = store.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as EntiteFile[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** Supprime une opération de la file. */
export async function fileSupprimer(cle: number): Promise<void> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("file", "readwrite");
    tx.objectStore("file").delete(cle);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("fileSupprimer failed:", e);
  }
}

/** Écrit une valeur d'état (session, langue, OTP). */
export async function etatEcrire(cle: string, valeur: unknown): Promise<void> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("etat", "readwrite");
    tx.objectStore("etat").put({ cle, valeur });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("etatEcrire failed:", e);
  }
}

/** Lit une valeur d'état. */
export async function etatLire<T = unknown>(cle: string): Promise<T | null> {
  try {
    const db = await ouvrirDb();
    const tx = db.transaction("etat", "readonly");
    const req = tx.objectStore("etat").get(cle);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const result = req.result as { cle: string; valeur: T } | undefined;
        resolve(result ? result.valeur : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
