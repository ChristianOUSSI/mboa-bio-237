import sharp from "sharp";
import { readFileSync } from "fs";

const svg = readFileSync("public/icon.svg", "utf8");
// Canvas 512 fond uni, logo réduit à ~78% centré (safe zone maskable)
const inner = await sharp(Buffer.from(svg), { density: 300 })
  .resize(400, 400).png().toBuffer();
for (const size of [512, 192]) {
  const pad = Math.round(size * 0.11);
  const innerSize = size - pad * 2;
  const scaled = await sharp(inner).resize(innerSize, innerSize).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 30, g: 81, b: 40, alpha: 1 } } })
    .composite([{ input: scaled, top: pad, left: pad }])
    .png().toFile(`public/icon-maskable-${size}.png`);
}
console.log("ok");
