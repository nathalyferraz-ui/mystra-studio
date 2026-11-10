export function publicSiteOrigin(value: string | undefined = process.env.SITE_URL) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.origin : null; } catch { return null; }
}
export const sitemapCacheTag = "site:sitemap:v1";
export function indexingAllowed(setting: boolean, env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return false;
  if (["demo", "homologation"].includes(environmentMode(env))) return false;
  const origin = publicSiteOrigin(env.SITE_URL); if (!origin) return false;
  const host = new URL(origin).hostname;
  return env.NODE_ENV === "production" && env.SITE_INDEXING_ENABLED === "true" && setting && !["localhost", "127.0.0.1", "[::1]"].includes(host) && !host.endsWith(".localhost") && !host.endsWith(".local");
}
import { environmentMode } from "./environment";
