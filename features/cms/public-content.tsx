/* eslint-disable @next/next/no-img-element -- Media is access-controlled server-side. */
import Link from "next/link";
import { Suspense, cache } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Badge, EmptyState, LoadingState } from "@/components/ui";
import { getDb } from "@/lib/db";
import { cmsModules, isCmsModule, type CmsModule } from "./config";
import { contentInclude, listContent, type ContentRecord, type SearchParams } from "./queries";
import { ListControls, Pagination } from "./list-controls";
import { PublicServiceDetail } from "@/features/services/public-detail";
import { PublicArticleDetail } from "@/features/insights/public-detail";
import { articleArchived } from "@/features/insights/article-utils";
import { PublicProjectDetail } from "@/features/portfolio/public-detail";
import { parseProjectEditorial } from "@/features/portfolio/editorial";
export function ContentCards({ items, section }: { items: ContentRecord[]; section?: CmsModule }) {
  return <div className="published-grid">{items.map(item => <Link key={item.id} className="published-card" href={`/${section ?? (item.kind === "SERVICE" ? "servicos" : item.kind === "PROJECT" ? "portfolio" : "blog")}/${item.slug}`}>{item.cover ? <img src={`/api/media/${item.cover.id}`} alt={item.cover.alt} loading="lazy" /> : <div className={`content-card-art art-${item.kind.toLowerCase()}`} aria-hidden="true"><span>✳</span></div>}<div className="published-card-body"><Badge>{item.category?.name ?? (item.kind === "SERVICE" ? "Solução" : item.kind === "PROJECT" ? "Projeto" : "Insight")}</Badge><h2>{item.title}</h2>{item.kind === "PROJECT" && parseProjectEditorial(item.body).conceptual && <Badge>Projeto conceitual</Badge>}<p>{item.summary}</p>{item.kind === "ARTICLE" && item.publishedAt && <time className="ms-insights-homeDate" dateTime={item.publishedAt.toISOString()}>{item.publishedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>}<span className="text-link">{item.kind === "ARTICLE" ? "Ler artigo" : "Explorar"} ↗</span></div></Link>)}</div>;
}
async function PublicList({ section, searchParams }: { section: CmsModule; searchParams: Promise<SearchParams> }) {
  await connection();
  if (!process.env.DATABASE_URL) return <div className="public-data-state"><EmptyState title="Este espaço está sendo preparado.">O catálogo será exibido quando a conexão com o banco de conteúdo estiver configurada. Ainda não é possível consultar publicações.</EmptyState></div>;
  const params = await searchParams;
  let data;
  try { data = await listContent(section, params); }
  catch { return <p role="status" className="notice">Não foi possível consultar o conteúdo neste momento. Tente novamente mais tarde.</p>; }
  const { items, categories, page, pages, total } = data;
  const tags = section === "blog" ? await getDb().tag.findMany({ where: { contents: { some: { kind: "ARTICLE", status: "PUBLISHED", publishedAt: { lte: new Date() } } } }, orderBy: { name: "asc" } }) : [];
  return <div className="public-data-state"><ListControls categories={categories} params={params} defaultSort={section === "blog" ? "newest" : "order"} />{!!tags.length && <nav className="tag-filter" aria-label="Filtrar por tag"><Link href="/blog">Todos os artigos</Link>{tags.map(tag => <Link aria-current={params.tag === tag.slug ? "page" : undefined} key={tag.id} href={`/blog?tag=${tag.slug}`}>{tag.name}</Link>)}</nav>}<p className="results-count">{total} {section === "servicos" ? "serviço(s)" : section === "portfolio" ? "projeto(s)" : "artigo(s)"} encontrado(s)</p>{items.length ? <ContentCards section={section} items={items} /> : <EmptyState title="Nenhuma publicação encontrada.">Quando um conteúdo for publicado, ele aparecerá aqui. Você também pode ajustar os filtros para uma nova busca.</EmptyState>}<Pagination params={params} page={page} pages={pages} /></div>;
}
export function PublicContentList(props: { section: CmsModule; searchParams: Promise<SearchParams> }) { return <Suspense fallback={<LoadingState />}><PublicList {...props} /></Suspense>; }
export const publishedItem = cache(async (section: string, slug: string) => {
  await connection();
  if (!isCmsModule(section)) notFound();
  if (!process.env.DATABASE_URL) return null;
  const item = await getDb().content.findFirst({ where: { kind: cmsModules[section].kind, slug, status: "PUBLISHED", publishedAt: { lte: new Date() } }, include: contentInclude });
  return item && section === "blog" && articleArchived(item.body) ? null : item;
});
export async function PublicContentDetail({ section, slug }: { section: string; slug: string }) {
  if (!isCmsModule(section)) notFound();
  const item = await publishedItem(section, slug);
  if (!item) notFound();
  if (section === "servicos") return <PublicServiceDetail item={item} />;
  if (section === "portfolio") return <PublicProjectDetail item={item} />;
  return <PublicArticleDetail item={item} />;

}
export async function FeaturedContent({ kind, title, description = "Explore os conteúdos publicados pelo estúdio.", limit = 6, sort = "order" }: { kind?: "SERVICE" | "PROJECT" | "ARTICLE"; title?: string; description?: string; limit?: number; sort?: "order" | "recent" } = {}) {
  await connection();
  if (!process.env.DATABASE_URL) return null;
  let items;
  try { items = await getDb().content.findMany({ where: { ...(kind ? { kind } : {}), status: "PUBLISHED", publishedAt: { lte: new Date() }, featured: true }, orderBy: sort === "recent" ? [{ publishedAt: "desc" }, { id: "asc" }] : [{ sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }], take: Math.max(1, Math.min(12, limit)), include: contentInclude }); }
  catch { return null; }
  if (!items.length) return null;
  return <section className="section container"><div className="section-heading"><span className="eyebrow">EM DESTAQUE</span><h2>{title === undefined || title === "Novas ideias. Agora no universo." ? <>Novas ideias.<br /><span className="muted">Agora no universo.</span></> : title}</h2><p>{description}</p></div><ContentCards items={items} /></section>;
}
