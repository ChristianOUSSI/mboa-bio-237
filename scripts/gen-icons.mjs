import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><linearGradient id="fond" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#4CAF50"/><stop offset="100%" stop-color="#1E5128"/>
</linearGradient></defs>
<rect width="512" height="512" rx="112" fill="url(#fond)"/>
<path d="M256 80 C180 140 150 200 158 272 C166 344 200 396 256 412 C312 396 346 344 354 272 C362 200 332 140 256 80 Z" fill="#AED581" opacity="0.95"/>
<path d="M256 100 L256 400" stroke="#1E5128" stroke-width="14" stroke-linecap="round"/>
<path d="M256 190 L196 156 M256 190 L316 156 M256 270 L196 236 M256 270 L316 236" stroke="#1E5128" stroke-width="11" stroke-linecap="round" opacity="0.6"/>
<rect x="40" y="372" width="432" height="100" rx="28" fill="#1E5128" stroke="#AED581" stroke-width="8"/>
<text x="200" y="440" font-family="Arial,Helvetica,sans-serif" font-size="68" font-weight="900" fill="white" text-anchor="middle">MBOA</text>
<text x="370" y="440" font-family="Arial,Helvetica,sans-serif" font-size="52" font-weight="900" fill="#AED581" text-anchor="middle">237</text>
</svg>`;

// Icônes "any" : coins arrondis (safe zone respectée)
for (const size of [192, 512]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icon-${size}.png`);
}

// Icône maskable : le logo doit tenir dans le cercle central 80% → on scale à ~66% sur fond plein
const maskableSvg = svg.replace('rx="112"', 'rx="0"').replace('</svg>',
  `<g transform="translate(85.33,85.33) scale(0.667)"><rect x="0" y="0" width="512" height="512" rx="112" fill="none"/></g></svg>`);
// plus simple : rendu SVG scaled dans un canvas 512 avec fond
const maskable = await sharp(Buffer.from(svg), { density: 300 })
  .resize(512, 512, { fit: "contain", background: { r: 30, g: 81, b: 40, alpha: 1 } })
  .png().toBuffer();
await sharp(maskable).resize(512, 512).png().toFile("public/icon-maskable-512.png");
await sharp(maskable).resize(192, 192).png().toFile("public/icon-maskable-192.png");

// Apple touch icon : fond plein, logo à ~80%
const apple = await sharp(Buffer.from(svg), { density: 300 })
  .resize(180, 180, { fit: "contain", background: { r: 30, g: 81, b: 40, alpha: 1 } })
  .flatten({ background: "#1E5128" }).png().toFile("public/apple-touch-icon.png");

// Logo optimisé : le JPEG 941KB → 512px q82 (~40KB)
await sharp("public/logo-mboa.jpeg").resize(512, 512, { fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true }).toFile("public/logo-mboa-opt.jpeg");

console.log("done");
