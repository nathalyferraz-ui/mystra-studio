import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db";
import { indexingAllowed, publicSiteOrigin, sitemapCacheTag } from "@/lib/site-policy";
import { publishedSettings } from "@/features/institutional/queries";
import { release } from "@/config/release";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); const settings = await publishedSettings(), origin = publicSiteOrigin();
  if (!origin || !indexingAllowed(settings.seo.allowIndexing)) return [];
  return sitemapEntries(origin);
}
async function sitemapEntries(origin: string): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag(sitemapCacheTag); cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
  const staticPaths = release.publicPaths;
  const urls: MetadataRoute.Sitemap = staticPaths.map(path => ({ url: `${origin}${path === "/" ? "" : path}` }));
  try {
    const db = getDb();
    const content = await db.content.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { kind: true, slug: true, updatedAt: true }, orderBy: { id: "asc" }, take: 10000 });
    for (const item of content) urls.push({ url: `${origin}/${item.kind === "SERVICE" ? "servicos" : item.kind === "PROJECT" ? "portfolio" : "blog"}/${item.slug}`, lastModified: item.updatedAt });
  } catch { /* Public structural URLs remain valid; unavailable content is never fabricated. */ }
  return urls;
}
