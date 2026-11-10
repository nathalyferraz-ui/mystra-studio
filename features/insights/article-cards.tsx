/* eslint-disable @next/next/no-img-element -- Access-controlled media endpoint. */
import Link from "next/link";
import { ArrowUpRight, Quote } from "lucide-react";
import type { ContentRecord } from "@/features/cms/queries";
import { articleStats } from "./article-utils";

export function ArticleCards({ items, featured = false }: { items: ContentRecord[]; featured?: boolean }) {
  return <div className={`ms-insights-cards${featured ? " ms-insights-featuredGrid" : ""}`}>{items.map(item => {
    const stats = articleStats(item.body);
    return <article className="ms-insights-card" key={item.id}><Link className="ms-insights-cardVisual" href={`/blog/${item.slug}`} aria-label={`Ler ${item.title}`}>{item.cover ? <img src={`/api/media/${item.cover.id}`} alt={item.cover.alt} width={item.cover.width} height={item.cover.height} loading="lazy" /> : <div className="ms-insights-placeholder" aria-hidden="true"><span /><Quote size={65} strokeWidth={.9} /></div>}<span className="ms-insights-imageArrow"><ArrowUpRight size={19} aria-hidden="true" /></span></Link><div className="ms-insights-cardBody">{item.category && <Link className="ms-insights-label" href={`/blog?category=${item.category.id}#artigos`}>{item.category.name}</Link>}<h3><Link href={`/blog/${item.slug}`}>{item.title}</Link></h3><p>{item.summary}</p><div className="ms-insights-cardMeta"><span>Por {item.author.name}</span><span>{item.publishedAt && <time dateTime={item.publishedAt.toISOString()}>{item.publishedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>} · {stats.minutes} min de leitura</span></div>{!!item.tags.length && <ul className="ms-insights-cardTags">{item.tags.slice(0, 4).map(tag => <li key={tag.id}><Link href={`/blog?tag=${tag.slug}#artigos`}>#{tag.name}</Link></li>)}</ul>}<Link className="ms-insights-readLink" href={`/blog/${item.slug}`}>Continuar leitura <ArrowUpRight size={15} aria-hidden="true" /></Link></div></article>;
  })}</div>;
}
