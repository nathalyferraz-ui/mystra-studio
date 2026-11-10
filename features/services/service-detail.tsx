/* eslint-disable @next/next/no-img-element -- Uses the existing private-media delivery route. */
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Badge, ButtonLink } from "@/components/ui";
import { RichContent } from "@/features/cms/rich-content";
import { parseRichDocument, richMediaIds, richText } from "@/features/cms/rich-text";
import type { ContentRecord } from "@/features/cms/queries";
import { ServiceCards } from "./service-cards";
import { ServiceIcon } from "./service-icon";
import "./services.css";

export function ServiceDetail({ item, related = [], preview = false }: { item: ContentRecord; related?: ContentRecord[]; preview?: boolean }) {
  const body = parseRichDocument(item.body);
  const complementary = Boolean(richText(body).trim() || richMediaIds(body).length);
  return (
    <div className={`ms-solutions-detail${preview ? " ms-solutions-preview" : ""}`}>
      <article>
        <header className="container ms-solutions-detailHero"><Link href={preview ? "/admin/servicos" : "/servicos#catalogo"} className="ms-solutions-back"><ArrowLeft size={15} aria-hidden="true" />{preview ? "Serviços no painel" : "Voltar às soluções"}</Link><div className="ms-solutions-detailHeading"><div><div className="ms-solutions-detailLabels">{item.category && <span className="ms-solutions-smallLabel">{item.category.name}</span>}{item.featured && <span className="ms-solutions-detailFeatured"><Sparkles size={12} aria-hidden="true" /> Em destaque</span>}{preview && <Badge tone="warning">Prévia · {item.status === "PUBLISHED" ? "Publicado" : "Rascunho"}</Badge>}</div><h1>{item.title}</h1><p>{item.summary}</p></div><div className="ms-solutions-detailEmblem" aria-hidden="true"><span /><ServiceIcon name={item.icon} size={88} /></div></div>{item.cover && <img className="ms-solutions-detailCover" src={`/api/media/${item.cover.id}`} alt={item.cover.alt} />}</header>
        <div className="container ms-solutions-detailLayout"><aside><span className="ms-solutions-smallLabel">NESTA SOLUÇÃO</span><nav aria-label="Seções do serviço"><a href="#servico-visao">Visão geral</a>{!!item.benefits.length && <a href="#servico-beneficios">Benefícios</a>}{!!item.technologies.length && <a href="#servico-tecnologias">Tecnologias</a>}{complementary && <a href="#servico-detalhes">Em detalhe</a>}</nav>{!preview && <Link href={`/orcamento?servico=${item.id}`} className="text-link">Solicitar orçamento <ArrowUpRight size={16} aria-hidden="true" /></Link>}</aside><div className="ms-solutions-detailBody"><section id="servico-visao"><span className="eyebrow">VISÃO GERAL</span><h2>Sobre esta solução.</h2><p className="ms-solutions-description">{item.description}</p></section>{!!item.benefits.length && <section id="servico-beneficios"><span className="eyebrow">O QUE ESTA SOLUÇÃO PROPÕE</span><h2>Benefícios.</h2><ul className="ms-solutions-benefits">{item.benefits.map((benefit, index) => <li key={index}><Check size={19} aria-hidden="true" /><span>{benefit}</span></li>)}</ul></section>}{!!item.technologies.length && <section id="servico-tecnologias"><span className="eyebrow">RECURSOS & CONEXÕES</span><h2>Tecnologias associadas.</h2><ul className="ms-solutions-technologyList">{item.technologies.map(technology => <li key={technology.id}>{technology.name}</li>)}</ul></section>}{complementary && <section id="servico-detalhes"><span className="eyebrow">UM OLHAR MAIS PRÓXIMO</span><h2>Em detalhe.</h2><RichContent value={body} /></section>}</div></div>
      </article>
      {!preview && !!related.length && <section className="container ms-solutions-related" aria-labelledby="related-solutions-title"><div className="ms-solutions-sectionHeading"><div><span className="eyebrow">OUTRAS POSSIBILIDADES</span><h2 id="related-solutions-title">Soluções que<br /><span>também se conectam.</span></h2></div><Link href="/servicos#catalogo" className="text-link">Explorar o catálogo <ArrowUpRight size={17} aria-hidden="true" /></Link></div><ServiceCards items={related} /></section>}
      {!preview && <section className="container ms-solutions-finalSection" aria-labelledby="service-cta-title"><div className="ms-solutions-detailCta"><div><span className="eyebrow">DA POSSIBILIDADE AO PRÓXIMO PASSO.</span><h2 id="service-cta-title">Sua ideia encontra<br />um ponto de partida aqui.</h2><p>Compartilhe os detalhes do seu projeto para iniciar uma conversa sobre esta solução.</p></div><ButtonLink href={`/orcamento?servico=${item.id}`}>Solicitar orçamento</ButtonLink></div></section>}
    </div>
  );
}
