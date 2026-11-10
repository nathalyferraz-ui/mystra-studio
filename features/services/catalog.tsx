import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Orbit, Search } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { listContent, type SearchParams } from "@/features/cms/queries";
import { Pagination } from "@/features/cms/list-controls";
import { ServiceCards } from "./service-cards";

export function CatalogLoading() {
  return <div className="ms-solutions-catalogLoading" role="status"><span className="spinner" aria-hidden="true" />Consultando as soluções…</div>;
}

export async function ServicesCatalog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const params = await searchParams;
  const value = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  let data;
  try { data = await listContent("servicos", params); }
  catch {
    return <div className="ms-solutions-unavailable" role="status"><Orbit size={30} aria-hidden="true" /><h3>Uma pausa na conexão.</h3><p>Não foi possível consultar o catálogo agora. As demais seções continuam disponíveis; tente novamente em instantes.</p></div>;
  }
  const { items, total, page, pages, categories } = data;
  const filtered = Boolean(value("q").trim() || value("category"));
  return (
    <>
      <form className="ms-solutions-filters" action="/servicos#catalogo" method="get" role="search" aria-label="Buscar soluções">
        <label className="ms-solutions-search">Nome ou palavra-chave<span><Search size={17} aria-hidden="true" /><Input name="q" type="search" defaultValue={value("q")} maxLength={150} placeholder="Qual é a sua próxima ideia?" /></span></label>
        <label>Categoria<Select name="category" defaultValue={value("category")}><option value="">Todas as categorias</option>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</Select></label>
        <label>Organizar por<Select name="sort" defaultValue={value("sort") || "order"}><option value="order">Ordem do catálogo</option><option value="title">Nome A–Z</option><option value="newest">Publicação recente</option></Select></label>
        <Button type="submit">Explorar <ArrowUpRight size={15} aria-hidden="true" /></Button>
      </form>
      <div className="ms-solutions-resultLine"><p role="status">{total === 0 ? "Nenhuma solução encontrada" : `${total} ${total === 1 ? "solução encontrada" : "soluções encontradas"}`}{filtered && " para os filtros selecionados"}</p>{filtered && <Link href="/servicos#catalogo">Limpar filtros ↗</Link>}</div>
      {items.length ? <ServiceCards items={items} /> : (
        <div className="ms-solutions-empty">
          <div className="ms-solutions-emptyOrbit" aria-hidden="true"><Orbit size={40} strokeWidth={1} /><span /></div>
          <span className="ms-solutions-smallLabel">{filtered ? "OUTRA PERSPECTIVA, NOVAS POSSIBILIDADES" : "UM ESPAÇO ABERTO PARA O PRÓXIMO"}</span>
          <h3>{filtered ? "Vamos explorar outro caminho?" : "Novas soluções vão encontrar lugar aqui."}</h3>
          <p>{filtered ? "Nenhum serviço publicado corresponde a esta busca. Experimente outra palavra-chave ou remova os filtros para consultar o catálogo." : "Ainda não há serviços publicados no catálogo. Enquanto isso, conheça nossa abordagem e as ideias que orientam o estúdio."}</p>
          <Link className="text-link" href={filtered ? "/servicos#catalogo" : "#abordagem"}>{filtered ? "Ver todas as soluções" : "Conhecer nossa abordagem"}<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      )}
      {pages > 1 && <Pagination page={page} pages={pages} params={params} anchor="catalogo" />}
    </>
  );
}
