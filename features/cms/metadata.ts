import type { Metadata } from "next";
import { publicSiteOrigin } from "@/lib/site-policy";
type PublicSeoContent = { title: string; slug: string; summary: string; seoTitle: string | null; seoDescription: string | null; cover: { id: string; alt: string; width: number; height: number } | null };
export function contentMetadata(item: PublicSeoContent, section: "servicos" | "portfolio", siteName: string, configuredOrigin?: string): Metadata {
  const origin = publicSiteOrigin(configuredOrigin), title = item.seoTitle || item.title, description = item.seoDescription || item.summary;
  const url = origin ? `${origin}/${section}/${encodeURIComponent(item.slug)}` : undefined;
  const image = origin && item.cover ? { url: `${origin}/api/media/${encodeURIComponent(item.cover.id)}`, alt: item.cover.alt, width: item.cover.width, height: item.cover.height } : undefined;
  return { title, description, ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: url } } : {}), openGraph: { title, description, siteName, type: "website", ...(url ? { url } : {}), ...(image ? { images: [image] } : {}) }, twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image.url] } : {}) } };
}
