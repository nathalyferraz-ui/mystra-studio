import type { MetadataRoute } from "next";
import { publishedSettings } from "@/features/institutional/queries";
import { publicSiteOrigin, indexingAllowed } from "@/lib/site-policy";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await publishedSettings(), origin = publicSiteOrigin();
  if (!indexingAllowed(settings.seo.allowIndexing)) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }, sitemap: `${origin}/sitemap.xml` };
}
