import { publicPathEnabled } from "@/config/release";
import { indexingAllowed } from "@/lib/site-policy";
import { publishedSettings } from "@/features/institutional/queries";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LoadingState } from "@/components/ui";
import { publishedJob, PublicJobDetail } from "@/features/careers/public-detail";
import { siteOrigin } from "@/features/insights/article-utils";
import { careersConfig } from "@/features/careers/config";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  if (!publicPathEnabled("/trabalhe-conosco")) notFound();
  const job = await publishedJob((await params).slug); if (!job) notFound(); const origin = siteOrigin(), config = careersConfig(); const index = config.mode === "live" && config.configured && indexingAllowed((await publishedSettings()).seo.allowIndexing);
  return { title: job.seoTitle || job.title, description: job.seoDescription || job.summary, robots: { index, follow: index }, ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: new URL(`/trabalhe-conosco/${job.slug}`, origin).href } } : {}), openGraph: { type: "website", title: job.seoTitle || job.title, description: job.seoDescription || job.summary } };
}
async function Detail({ params }: { params: Promise<{ slug: string }> }) { return <PublicJobDetail slug={(await params).slug} />; }
export default function Page(props: { params: Promise<{ slug: string }> }) { if (!publicPathEnabled("/trabalhe-conosco")) notFound(); return <Suspense fallback={<LoadingState />}><Detail {...props} /></Suspense>; }
