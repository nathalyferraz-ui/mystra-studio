/* eslint-disable @next/next/no-img-element -- Images use the existing authorized media proxy. */
import Link from "next/link";
import { Braces, Compass, Orbit, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { FeaturedContent } from "@/features/cms/public-content";
import { HomeTemplate } from "./templates/home";
import { AboutTemplate } from "./templates/sobre";
import { publishedDocuments, publishedPage, publishedSettings, institutionalMediaInfo } from "./queries";
import { faqSchema, partnerSchema, teamSchema, type PageDocument, type Section } from "./schema";
import "./institutional.css";
import { publicLinkEnabled, releaseCTA } from "@/config/release";
import { templateDefinitions } from "./template-definitions";
export async function InstitutionalImage({ id, className = "", caption }: { id: string; className?: string; caption?: string }) {
  if (!id) return null; let media; try { media = await institutionalMediaInfo(id); } catch { return null; } if (!media) return null;
  return <figure className={`institutional-image ${className}`}><img src={`/api/media/${id}`} alt={media.alt} width={media.width} height={media.height} loading="lazy" />{caption && <figcaption>{caption}</figcaption>}</figure>;
}
export async function PublishedFAQ({ page, title, category, fallback = [] }: { page: string; title?: string; category?: string; fallback?: readonly (readonly string[])[] }) {
  const docs = await publishedDocuments(); const parsed = faqSchema.safeParse(docs.get("faq"));
  const items = parsed.success ? parsed.data.items.filter(i => i.published && i.pages.includes(page as "home") && (!category || i.category === category)).sort((a, b) => a.order - b.order).map(i => [i.question, i.answer]) : fallback;
  if (!items.length) return null;
  return <div className="institutional-faq">{title && <h2>{title}</h2>}{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>;
}
export async function InstitutionalFAQSlot({ page }: { page: string }) {
  const data = faqSchema.safeParse((await publishedDocuments()).get("faq"));
  if (!data.success || !data.data.items.some(i => i.published && i.pages.includes(page as "home"))) return null;
  return <section className="section container institutional-block"><PublishedFAQ page={page} title="Perguntas frequentes" /></section>;
}
async function PublicPeople({ type, title, text }: { type: "team" | "partners"; title: string; text: string }) {
  const docs = await publishedDocuments();
  const items = type === "team" ? teamSchema.parse(docs.get("equipe") || { items: [] }).items : partnerSchema.parse(docs.get("parceiros") || { items: [] }).items;
  const visible = items.filter(i => i.published).sort((a, b) => ("featured" in b ? Number(b.featured) : 0) - ("featured" in a ? Number(a.featured) : 0) || a.order - b.order); if (!visible.length) return null;
  return <section className="section container institutional-block"><div className="section-heading"><h2>{title}</h2><p>{text}</p></div><div className="institutional-grid">{visible.map(i => <article className={`card ${"featured" in i && i.featured ? "institutional-partnerFeatured" : ""}`} key={i.id}>{i.imageId && <InstitutionalImage id={i.imageId} />}<span className="eyebrow">{"role" in i ? "PERFIL CONCEITUAL" : i.category}</span>{"featured" in i && i.featured && <span className="eyebrow">DESTAQUE</span>}<h3>{i.name}</h3>{"role" in i && <p>{i.role}</p>}<p>{i.description}</p>{"specialties" in i && <p>{i.specialties}</p>}{"website" in i && i.website && <Link href={i.website} rel="noopener noreferrer">Conhecer website ↗</Link>}{"links" in i && i.links.map(l => <Link key={l.href} href={l.href} rel="noopener noreferrer">{l.label} ↗</Link>)}</article>)}</div></section>;
}
export async function RenderSection({ section, page }: { section: Section; page: "home" | "sobre" }) {
  if (!section.visible) return null;
  if (section.type === "template") {
    if (section.variant === "home-4") return null;
    const variant = section.variant;
    const definition: { fields: Record<string, { kind: string }> } = templateDefinitions[variant];
    const fields = Object.fromEntries(Object.entries(section.fields).map(([key, value]) => [key, definition.fields[key]?.kind === "link" && !publicLinkEnabled(value) && variant !== "home-6" ? "/servicos" : value]));
    section = { ...section, fields };
    const hero = section.variant === "home-0" || section.variant === "sobre-0";
    const content = hero && !section.imageId ? { ...section, imageId: (await publishedSettings()).identity.institutionalImageId } : section;
    return <><div className={`institutional-template ${section.align === "center" ? "institutional-centered" : ""}`} data-institutional-section={section.id}>{page === "home" ? <HomeTemplate section={content} /> : <AboutTemplate section={content} />}</div>{!hero && section.imageId && <div className="container institutional-images"><InstitutionalImage id={section.imageId} />{section.secondaryImageId && <InstitutionalImage id={section.secondaryImageId} />}</div>}</>;
  }
  if (section.type === "feed") return section.kind === "EVENT" ? null : <FeaturedContent kind={section.kind} title={section.title} description={section.text} limit={section.limit} sort={section.order} />;
  if (section.type === "team" || section.type === "partners") return <PublicPeople type={section.type} title={section.title} text={section.text} />;
  if (section.type === "faq") return <section className="section container institutional-block"><PublishedFAQ page={page} title={section.title} category={section.category} /></section>;
  if (section.type === "cta") return <section className="container institutional-block"><div className={`contact-banner institutional-cta-${section.variant}`}><h2>{section.title}</h2><p>{section.text}</p><ButtonLink href={releaseCTA(section.button).href}>{releaseCTA(section.button).label}</ButtonLink></div></section>;
  if (section.type === "gallery") return <section className="section container institutional-block"><h2>{section.title}</h2><div className="institutional-grid">{section.images.map((m, i) => <InstitutionalImage key={`${m.mediaId}-${i}`} id={m.mediaId} caption={m.caption} />)}</div></section>;
  if (section.type === "features") { const icons = { spark: Sparkles, code: Braces, orbit: Orbit, compass: Compass }; return <section className="section container institutional-block"><div className="section-heading"><h2>{section.title}</h2><p>{section.text}</p></div><div className="institutional-grid">{section.items.map((i, n) => { const Icon = icons[i.icon]; return <article className="card" key={n}><Icon aria-hidden="true" /><h3>{i.title}</h3><p>{i.text}</p>{i.href && publicLinkEnabled(i.href) && <Link href={i.href}>Explorar ↗</Link>}</article>; })}</div></section>; }
  return <section className={`section container institutional-block institutional-text-${section.align}`}><div className="section-heading"><span className="eyebrow">{section.subtitle}</span><h2>{section.title}</h2></div><p className="institutional-prose">{section.text}</p>{section.imageId && <InstitutionalImage id={section.imageId} />}</section>;
}
export function RenderInstitutionalPage({ document }: { document: PageDocument }) { return <div className={document.page === "sobre" ? "ms-about-about" : "institutional-home"}>{document.sections.map(s => <RenderSection key={s.id} section={s} page={document.page} />)}</div>; }
export async function InstitutionalPage({ page }: { page: "home" | "sobre" }) { return <RenderInstitutionalPage document={await publishedPage(page)} />; }
