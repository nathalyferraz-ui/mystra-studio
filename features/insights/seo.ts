import type { Metadata } from "next";
import type { ContentRecord } from "@/features/cms/queries";
import { siteOrigin } from "./article-utils";

export function articleMetadata(item: ContentRecord): Metadata {
  const origin = siteOrigin();
  const url = origin ? new URL(`/blog/${item.slug}`, origin).href : undefined;
  const image = origin && item.cover ? { url: new URL(`/api/media/${item.cover.id}`, origin).href, width: item.cover.width, height: item.cover.height, alt: item.cover.alt } : null;
  return {
    title: item.seoTitle || item.title, description: item.seoDescription || item.summary,
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: url } } : {}),
    authors: [{ name: item.author.name }], keywords: item.tags.map(tag => tag.name),
    openGraph: { title: item.seoTitle || item.title, description: item.seoDescription || item.summary, type: "article", ...(url ? { url } : {}), publishedTime: item.publishedAt?.toISOString(), modifiedTime: item.updatedAt.toISOString(), authors: [item.author.name], section: item.category?.name, tags: item.tags.map(tag => tag.name), ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: item.seoTitle || item.title, description: item.seoDescription || item.summary, ...(image ? { images: [image.url] } : {}) },
  };
}
export function articleStructuredData(item: ContentRecord) {
  const origin = siteOrigin();
  return { "@context": "https://schema.org", "@type": "Article", headline: item.title, description: item.summary, author: { "@type": "Person", name: item.author.name }, datePublished: item.publishedAt?.toISOString(), dateModified: item.updatedAt.toISOString(), ...(item.category ? { articleSection: item.category.name } : {}), keywords: item.tags.map(t => t.name), ...(origin ? { mainEntityOfPage: new URL(`/blog/${item.slug}`, origin).href, ...(item.cover ? { image: new URL(`/api/media/${item.cover.id}`, origin).href } : {}) } : {}) };
}
