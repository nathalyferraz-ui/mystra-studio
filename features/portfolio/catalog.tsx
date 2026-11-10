import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Layers3, Search } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { getDb } from "@/lib/db";
import { contentInclude, listContent, type SearchParams } from "@/features/cms/queries";
import { Pagination } from "@/features/cms/list-controls";
import { ProjectCards } from "./project-cards";

export function PortfolioLoading() { return <div className="ms-work-loading" role="status"><span className="spinner" aria-hidden="true" />Consultando o portfólio…</div>; }
export async function PortfolioHighlights() {
  await connection();
  let items;
  try { items = await getDb().content.findMany({ where: { kind: "PROJECT", status: "PUBLISHED", publishedAt: { lte: new Date() }, featured: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 3, include: contentInclude }); }
  catch { return <p className="ms-work-dataNotice" role="status">Não foi possível consultar os destaques agora. Tente novamente mais tarde.</p>; }
  if (!items.length) return <div className="ms-work-emptyFeatured"><span aria-hidden="true">↗</span><div><h3>Um arquivo aberto a novas perspectivas.</h3><p>Ainda não há projetos publicados em destaque. Este espaço será ocupado por trabalhos selecionados no portfólio.</p></div><Link href="#projetos" className="text-link">Explorar o catálogo <ArrowUpRight size={16} aria-hidden="true" /></Link></div>;
  return <ProjectCards items={items} editorial />;
}
export async function PortfolioCatalog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const params = await searchParams;
  const value = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  let data;
  try { data = await listContent("portfolio", params); }
  catch { return <p className="ms-work-dataNotice" role="status">O catálogo está temporariamente indisponível. Nenhum resultado pode ser confirmado agora.</p>; }
  const { items, total, categories, technologies, page, pages } = data;
  const filtered = Boolean(value("q") || value("category") || value("technology"));
  return <><form action="/portfolio#projetos" method="get" className="ms-work-filters" role="search" aria-label="Pesquisar projetos"><label className="ms-work-search">Buscar por nome<span><Search size={17} aria-hidden="true" /><Input type="search" name="q" defaultValue={value("q")} maxLength={150} placeholder="Uma nova perspectiva…" /></span></label><label>Categoria<Select name="category" defaultValue={value("category")}><option value="">Todas</option>{categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label><label>Tecnologia<Select name="technology" defaultValue={value("technology")}><option value="">Todas</option>{technologies.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label><label>Ordenar<Select name="sort" defaultValue={value("sort") || "order"}><option value="order">Ordem editorial</option><option value="newest">Publicação recente</option><option value="title">Nome A–Z</option></Select></label><Button type="submit">Explorar <ArrowUpRight size={15} aria-hidden="true" /></Button></form><div className="ms-work-results"><p role="status">{total} {total === 1 ? "projeto encontrado" : "projetos encontrados"}</p>{filtered && <Link href="/portfolio#projetos">Limpar filtros ↗</Link>}</div>{items.length ? <ProjectCards items={items} /> : <div className="ms-work-empty"><Layers3 size={42} strokeWidth={1} aria-hidden="true" /><span className="ms-work-smallLabel">ESPAÇO PARA O QUE VEM A SEGUIR</span><h3>{filtered ? "Outra busca, um novo olhar." : "As próximas ideias vão ganhar forma aqui."}</h3><p>{filtered ? "Nenhum projeto publicado corresponde aos filtros escolhidos. Experimente outro nome, categoria ou tecnologia." : "Ainda não há projetos publicados no catálogo. Enquanto novas explorações ganham espaço, conheça a visão criativa que orienta o estúdio."}</p><Link href={filtered ? "/portfolio#projetos" : "#visao-criativa"} className="text-link">{filtered ? "Ver todos os projetos" : "Conheça nossa visão"}<ArrowUpRight size={17} aria-hidden="true" /></Link></div>}{pages > 1 && <Pagination page={page} pages={pages} params={params} anchor="projetos" />}</>;
}
