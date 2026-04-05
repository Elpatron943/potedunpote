import type { MetadataRoute } from "next";
import { listDiyArticles } from "@/lib/diy-articles";
import { listSirensForSitemap } from "@/lib/sitemap-data";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recherche`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/conseils`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/connexion`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/pro/connexion`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/artisan/abonnement`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
  ];

  let articles: MetadataRoute.Sitemap = [];
  try {
    const list = await listDiyArticles();
    articles = list.map((a) => ({
      url: `${base}/conseils/${encodeURIComponent(a.slug)}`,
      lastModified: new Date(a.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    articles = [];
  }

  let entreprises: MetadataRoute.Sitemap = [];
  try {
    const sirens = await listSirensForSitemap();
    entreprises = sirens.map(({ siren, lastModified }) => ({
      url: `${base}/entreprise/${siren}`,
      lastModified: lastModified ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    entreprises = [];
  }

  return [...staticPaths, ...articles, ...entreprises];
}
