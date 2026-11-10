/* eslint-disable @next/next/no-img-element -- Media URLs are checked by the existing handler. */
import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import type { ContentRecord } from "@/features/cms/queries";
import { parseProjectEditorial } from "./editorial";

export function ProjectCards({ items, editorial = false }: { items: ContentRecord[]; editorial?: boolean }) {
  return <div className={`ms-work-cards${editorial ? " ms-work-editorialCards" : ""}`}>{items.map(item => {
    const meta = parseProjectEditorial(item.body);
    return <Link href={`/portfolio/${item.slug}`} className="ms-work-card" key={item.id} aria-labelledby={`project-${item.id}`}><div className={`ms-work-cardVisual${item.cover ? " ms-work-cardWithImage" : ""}`}>{item.cover ? <img src={`/api/media/${item.cover.id}`} alt={item.cover.alt} width={item.cover.width} height={item.cover.height} loading="lazy" /> : <div className="ms-work-cardPlaceholder" aria-hidden="true"><div /><Layers3 size={75} strokeWidth={.7} /></div>}<span className="ms-work-cardArrow"><ArrowUpRight size={23} aria-hidden="true" /></span>{meta.conceptual && <span className="ms-work-conceptTag">Projeto conceitual</span>}</div><div className="ms-work-cardBody">{item.category && <span className="ms-work-smallLabel">{item.category.name}</span>}<h3 id={`project-${item.id}`}>{item.title}</h3><p>{item.summary}</p>{!!item.technologies.length && <ul className="ms-work-cardTech">{item.technologies.slice(0, 4).map(technology => <li key={technology.id}>{technology.name}</li>)}</ul>}<span className="ms-work-cardLink">Explorar estudo de caso <ArrowUpRight size={15} aria-hidden="true" /></span></div></Link>;
  })}</div>;
}
