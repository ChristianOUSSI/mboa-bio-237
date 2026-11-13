/** UUID v4 généré manuellement, comme le Dart original. */
export function uuidV4(): string {
  const octets = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(octets);
  } else {
    for (let i = 0; i < 16; i++) {
      octets[i] = Math.floor(Math.random() * 256);
    }
  }
  // Version 4
  octets[6] = (octets[6] & 0x0f) | 0x40;
  // Variant RFC 4122
  octets[8] = (octets[8] & 0x3f) | 0x80;

  const hex = Array.from(octets)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}

/** Clé courte, lisible, pour une note vocale ou une pièce de preuve. */
export function court(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const chars = new Uint8Array(7);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(chars);
  } else {
    for (let i = 0; i < 7; i++) {
      chars[i] = Math.floor(Math.random() * 256);
    }
  }
  let result = "";
  for (let i = 0; i < 7; i++) {
    result += alphabet[chars[i] % alphabet.length];
  }
  return result;
}

/** Le slug d'un nom : minuscules, sans accent, espaces en underscores. */
export function slugDe(nom: string): string {
  const sansAccent = nom
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/œ/g, "oe")
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ûùü]/g, "u")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  if (sansAccent.length === 0) return "produit";
  return sansAccent.substring(0, Math.min(sansAccent.length, 40));
}

/** Normalise un numéro de téléphone camerounais en +237XXXXXXXXX. */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/\D/g, "");
  // Cas 1 : déjà avec l'indicatif +237
  if (chiffres.startsWith("237")) {
    const reste = chiffres.substring(3);
    if (reste.length === 9 && (reste.startsWith("6") || reste.startsWith("2"))) {
      return `+237${reste}`;
    }
  }
  // Cas 2 : 9 chiffres starting with 6 or 2
  if (chiffres.length === 9 && (chiffres.startsWith("6") || chiffres.startsWith("2"))) {
    return `+237${chiffres}`;
  }
  return null;
}

/** Vérifie qu'un numéro est un numéro camerounais valide. */
export function telephoneValide(saisie: string): boolean {
  return normaliserTelephone(saisie) !== null;
}
