/* eslint-disable @next/next/no-img-element -- Images use the existing authorized media endpoint. */
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { ContentRecord } from "@/features/cms/queries";
import { ServiceIcon } from "./service-icon";
import "./services.css";

export function ServiceCards({ items }: { items: ContentRecord[] }) {
  return (
    <div className="ms-solutions-cards">
      {items.map(item => (
        <Link href={`/servicos/${item.slug}`} className="ms-solutions-card" key={item.id} aria-labelledby={`service-${item.id}`}>
          <div className={`ms-solutions-cardVisual${item.cover ? " ms-solutions-cardWithImage" : ""}`}>
            {item.cover ? <img src={`/api/media/${item.cover.id}`} alt={item.cover.alt} loading="lazy" /> : <><span className="ms-solutions-cardOrbit" /><ServiceIcon name={item.icon} size={65} /></>}
            {item.featured && <span className="ms-solutions-featured"><Sparkles size={12} aria-hidden="true" /> Em destaque</span>}
          </div>
          <div className="ms-solutions-cardBody">
            {item.category && <span className="ms-solutions-smallLabel">{item.category.name}</span>}
            <h3 id={`service-${item.id}`}>{item.title}</h3>
            <p>{item.summary}</p>
            <span className="ms-solutions-cardFooter">Conhecer solução <ArrowUpRight size={19} aria-hidden="true" /></span>
          </div>
        </Link>
      ))}
    </div>
  );
}
