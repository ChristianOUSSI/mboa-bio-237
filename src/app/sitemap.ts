import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/connexion`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/rejoindre`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
