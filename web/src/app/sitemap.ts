import type { MetadataRoute } from "next";
import samples from "@/content/samples.json";
import { SITE } from "@/lib/site";

// The public pages: the landing page, the app's entry points and the four sample surveys.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/app`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/app/new`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...samples.samples.map((s) => ({ url: `${SITE}/app/walks/${s.walk}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
