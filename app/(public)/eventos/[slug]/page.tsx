import { publicPathEnabled } from "@/config/release";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LoadingState } from "@/components/ui";
import { publishedEvent, PublicEventDetail } from "@/features/events/public-detail";
import { siteOrigin } from "@/features/insights/article-utils";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!publicPathEnabled("/eventos")) notFound();
  const item = await publishedEvent((await params).slug); if (!item) notFound(); const origin = siteOrigin();
  const url = origin ? new URL(`/eventos/${item.slug}`, origin).href : undefined, image = origin && item.cover ? new URL(`/api/media/${item.cover.id}`, origin).href : undefined;
  return { title: item.seoTitle || item.title, description: item.seoDescription || item.summary, ...(url ? { metadataBase: new URL(origin!), alternates: { canonical: url } } : {}), openGraph: { type: "website", title: item.seoTitle || item.title, description: item.seoDescription || item.summary, ...(url ? { url } : {}), ...(image ? { images: [{ url: image, alt: item.cover!.alt }] } : {}) } };
}
async function Detail({ params }: { params: Promise<{ slug: string }> }) { return <PublicEventDetail slug={(await params).slug} />; }
export default function Page(props: { params: Promise<{ slug: string }> }) { if (!publicPathEnabled("/eventos")) notFound(); return <Suspense fallback={<LoadingState />}><Detail {...props} /></Suspense>; }
