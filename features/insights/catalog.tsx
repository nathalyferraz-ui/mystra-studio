import Link from "next/link";
import { cache } from "react";
import { connection } from "next/server";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { getDb } from "@/lib/db";
import { Button, Input, Select } from "@/components/ui";
import { contentInclude, listContent, type SearchParams } from "@/features/cms/queries";
import { Pagination } from "@/features/cms/list-controls";
import { ArticleCards } from "./article-cards";

export function InsightsLoading() { return <div className="ms-insights-loading" role="status"><span className="spinner" aria-hidden="true" />Consultando as leituras…</div>; }
const taxonomies = cache(async () => {
  const db = getDb(); const published = { kind: "ARTICLE" as const, status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  const [categories, tags] = await Promise.all([db.category.findMany({ where: { kind: "ARTICLE", contents: { some: published } }, orderBy: { name: "asc" } }), db.tag.findMany({ where: { contents: { some: published } }, orderBy: { name: "asc" } })]);
  return { categories, tags };
});
export async function InsightsHighlights() {
  await connection(); let items;
  try { items = await getDb().content.findMany({ where: { kind: "ARTICLE", status: "PUBLISHED", publishedAt: { lte: new Date() }, featured: true }, orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { id: "asc" }], take: 3, include: contentInclude }); }
  catch { return <p className="ms-insights-notice" role="status">Não foi possível consultar os destaques neste momento. Tente novamente mais tarde.</p>; }
  if (!items.length) return <div className="ms-insights-emptyFeature"><span aria-hidden="true">“</span><div><span className="ms-insights-label">UMA REVISTA ABERTA AO PRÓXIMO</span><h3>A próxima perspectiva<br />ainda vai ganhar espaço.</h3><p>Ainda não há artigos publicados em destaque. Enquanto isso, conheça a proposta editorial do Mystra Insights.</p><Link href="#manifesto" className="text-link">Leia nosso manifesto <ArrowUpRight size={16} aria-hidden="true" /></Link></div><BookOpen size={65} strokeWidth={.7} aria-hidden="true" /></div>;
  return <ArticleCards items={items} featured />;
}
export async function InsightsCategories() {
  await connection(); let categories;
  try { categories = (await taxonomies()).categories; }
  catch { return <p className="ms-insights-notice" role="status">Os temas estão temporariamente indisponíveis.</p>; }
  if (!categories.length) return <p className="ms-insights-noCategories">Os temas aparecerão aqui quando houver artigos publicados associados às categorias.</p>;
  return <nav className="ms-insights-categoryNav" aria-label="Explorar temas editoriais"><Link href="/blog#artigos">Todas as perspectivas <ArrowUpRight size={16} /></Link>{categories.map(category => <Link key={category.id} href={`/blog?category=${category.id}#artigos`}>{category.name}<ArrowUpRight size={16} aria-hidden="true" /></Link>)}</nav>;
}
export async function InsightsCatalog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection(); const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  let data, options;
  try { [data, options] = await Promise.all([listContent("blog", params), taxonomies()]); }
  catch { return <p className="ms-insights-notice" role="status">Não foi possível consultar as publicações agora. Volte em instantes.</p>; }
  const filtered = Boolean(value("q") || value("category") || value("tag"));
  return <><form method="get" action="/blog#artigos" role="search" className="ms-insights-filters" aria-label="Pesquisar artigos"><label className="ms-insights-search">Palavra-chave<span><Search size={17} aria-hidden="true" /><Input name="q" type="search" defaultValue={value("q")} maxLength={150} placeholder="Qual ideia você quer explorar?" /></span></label><label>Categoria<Select name="category" defaultValue={value("category")}><option value="">Todas</option>{options.categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label><label>Tag<Select name="tag" defaultValue={value("tag")}><option value="">Todas</option>{options.tags.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</Select></label><label>Publicação<Select name="sort" defaultValue={value("sort") || "newest"}><option value="newest">Mais recentes</option><option value="title">Título A–Z</option><option value="oldest">Mais antigos</option></Select></label><Button type="submit">Explorar <ArrowUpRight size={16} aria-hidden="true" /></Button></form><div className="ms-insights-results"><p role="status">{data.total} {data.total === 1 ? "artigo encontrado" : "artigos encontrados"}</p>{filtered && <Link href="/blog#artigos">Limpar filtros ↗</Link>}</div>{data.items.length ? <ArticleCards items={data.items} /> : <div className="ms-insights-empty"><BookOpen size={40} strokeWidth={1} aria-hidden="true" /><span className="ms-insights-label">ESPAÇO PARA NOVAS IDEIAS</span><h3>{filtered ? "Uma nova busca abre outra perspectiva." : "As próximas leituras começam por aqui."}</h3><p>{filtered ? "Nenhum artigo publicado corresponde a esta busca. Experimente outra palavra-chave ou remova os filtros." : "Ainda não há artigos publicados no Insights. O espaço está aberto a reflexões sobre criatividade, design e tecnologia."}</p><Link href={filtered ? "/blog#artigos" : "#manifesto"} className="text-link">{filtered ? "Ver todos os artigos" : "Conheça a proposta editorial"}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>}{data.pages > 1 && <Pagination page={data.page} pages={data.pages} params={params} anchor="artigos" />}</>;
}
