/**
 * Import d'une photo depuis l'appareil (galerie ou appareil photo).
 * Le fichier est redimensionné côté client (max 1280px, JPEG ~78%) pour
 * rester stockable dans IndexedDB / Supabase sans exploser le stockage.
 */

const MAX_TEXTE = 1_800_000; // garde-fou : ~1,8 Mo de data URL max

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function dataUrlRedimensionnee(dataUrl: string): Promise<string> {
  const img = await chargerImage(dataUrl);
  const echelle = Math.min(1, 1280 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * echelle));
  const h = Math.max(1, Math.round(img.height * echelle));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.78);
  return out.length <= MAX_TEXTE ? out : dataUrl;
}

/**
 * Ouvre le sélecteur de fichier (appareil photo sur mobile via `capture`).
 * Retourne une data URL JPEG compressée, ou null si annulé.
 */
export function choisirPhotoDepuisAppareil(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        resolve(await dataUrlRedimensionnee(dataUrl));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
