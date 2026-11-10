import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { PublicContentDetail, publishedItem } from "@/features/cms/public-content";
import { articleMetadata } from "@/features/insights/seo";
import { contentMetadata } from "@/features/cms/metadata";
import { publishedSettings } from "@/features/institutional/queries";
export async function generateMetadata({ params }: { params: Promise<{ slug: string; entry: string }> }) {
  const { slug: section, entry } = await params;
  const item = await publishedItem(section, entry);
  if (!item) return { title: "Conteúdo não encontrado", robots: { index: false } };
  const siteName = (await publishedSettings()).seo.siteName;
  if (section === "blog") { const metadata = articleMetadata(item); return { ...metadata, openGraph: { ...metadata.openGraph, siteName } }; }
  return contentMetadata(item, section as "servicos" | "portfolio", siteName);
}
async function Detail({ params }: { params: Promise<{ slug: string; entry: string }> }) { const { slug: section, entry } = await params; return <PublicContentDetail section={section} slug={entry} />; }
export default function Page(props: { params: Promise<{ slug: string; entry: string }> }) { return <Suspense fallback={<LoadingState />}><Detail {...props} /></Suspense>; }
