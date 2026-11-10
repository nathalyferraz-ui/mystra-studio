import { notFound } from "next/navigation";
import { pageContent } from "@/features/public/page-content";
import { EmptyState, ButtonLink, LoadingState } from "@/components/ui";
import { isCmsModule } from "@/features/cms/config";
import { PublicContentList } from "@/features/cms/public-content";
import type { SearchParams } from "@/features/cms/queries";
import { ServicesPage } from "@/features/services/services-page";
import { PortfolioPage } from "@/features/portfolio/portfolio-page";
import { InsightsPage } from "@/features/insights/insights-page";
import { Suspense } from "react";
import { InstitutionalFAQSlot } from "@/features/institutional/public-renderer";
import { publicPathEnabled } from "@/config/release";
export function generateStaticParams() { return Object.keys(pageContent).filter(slug => publicPathEnabled(`/${slug}`)).map(slug => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!publicPathEnabled(`/${slug}`)) notFound();
  if (!Object.hasOwn(pageContent, slug)) notFound();
  const page = pageContent[slug as keyof typeof pageContent];
  return { title: slug === "servicos" ? "Soluções digitais — estratégia, design e tecnologia" : slug === "blog" ? "Mystra Insights — tecnologia, design e novas perspectivas" : page?.eyebrow, description: page?.description };
}
async function PublicPageContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  if (!publicPathEnabled(`/${slug}`)) notFound();
  if (!Object.hasOwn(pageContent, slug)) notFound();
  const page = pageContent[slug as keyof typeof pageContent];
  if (!page) notFound();
  if (slug === "servicos") return <><ServicesPage searchParams={searchParams} /><Suspense fallback={null}><InstitutionalFAQSlot page="servicos" /></Suspense></>;
  if (slug === "portfolio") return <PortfolioPage searchParams={searchParams} />;
  if (slug === "blog") return <InsightsPage searchParams={searchParams} />;
  return <><div className="container interior-page"><span className="eyebrow"><span className="status-dot" /> {page.eyebrow}</span><h1>{page.title}</h1><p className="page-description">{page.description}</p>{isCmsModule(slug) ? <PublicContentList section={slug} searchParams={searchParams} /> : <EmptyState title={page.emptyTitle}>{page.emptyText}</EmptyState>}<div className="page-back"><ButtonLink href="/" variant="secondary">Voltar ao universo Mystra</ButtonLink></div></div><Suspense fallback={null}><InstitutionalFAQSlot page={slug} /></Suspense></>;
}
export default function PublicPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) { return <Suspense fallback={<LoadingState />}><PublicPageContent {...props} /></Suspense>; }
