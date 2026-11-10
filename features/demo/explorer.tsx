import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { AdminPageHeader, AdminEmptyState } from "@/components/admin/primitives";
import { Badge, Button, Input, Select, Table } from "@/components/ui";
import { ListControls, Pagination } from "@/features/cms/list-controls";
import { listContent, contentInclude } from "@/features/cms/queries";
import { isCmsModule, cmsModules } from "@/features/cms/config";
import { idSchema } from "@/features/cms/schema";
import { RichContent } from "@/features/cms/rich-content";
import { bodyDocument, parseContentBody } from "@/features/portfolio/editorial";
import type { SearchParams } from "@/features/cms/filters";
import { eventFilters } from "@/features/events/queries";
import { eventModes, eventStatuses } from "@/features/events/schema";
import { eventDate } from "@/features/events/time";
import { jobFilters } from "@/features/careers/queries";
import { jobStatuses } from "@/features/careers/schema";
import { leadFilters } from "@/features/crm/queries";
import { statuses as leadStatuses } from "@/features/crm/schema";
import { requireDemoViewer } from "./access";
import { isDemoSection, type DemoSection } from "./navigation";
const titles: Record<DemoSection, string> = { servicos: "Serviços", portfolio: "Projetos conceituais", blog: "Insights demonstrativos", eventos: "Eventos demonstrativos", leads: "CRM sintético", vagas: "Oportunidades ilustrativas" };
const stamp = (value: Date) => value.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
type Row = { id: string; title: string; detail: string; status: string; date: string };
function ReadTable({ section, rows }: { section: DemoSection; rows: Row[] }) {
  return rows.length ? <Table caption={`${titles[section]} — exploração somente leitura`}><thead><tr>{["Registro", "Informações", "Estado", "Atualização", "Ação"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><Link href={`/admin/explorar/${section}/${row.id}`}>{row.title}</Link></td><td>{row.detail}</td><td><Badge>{row.status}</Badge></td><td>{row.date}</td><td><Link className="text-link" href={`/admin/explorar/${section}/${row.id}`}>Consultar ↗</Link></td></tr>)}</tbody></Table> : <AdminEmptyState title="Nenhum registro para estes filtros.">O catálogo depende do seed autorizado no projeto separado. Nenhum registro é inventado pela interface.</AdminEmptyState>;
}
function Filters({ section, params }: { section: DemoSection; params: SearchParams }) {
  const value = (key: string) => typeof params[key] === "string" ? params[key] : "";
  const states = section === "eventos" ? eventStatuses : section === "leads" ? leadStatuses : jobStatuses;
  return <form className="list-controls" method="get"><label>Buscar<Input name="q" maxLength={150} defaultValue={value("q")} placeholder="Pesquisar no módulo" /></label><label>Estado<Select name="status" defaultValue={value("status")}><option value="">Todos</option>{Object.entries(states).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</Select></label><label>Ordenação<Select name="sort" defaultValue={value("sort")}><option value="">Padrão do módulo</option><option value="oldest">Mais antigos</option>{section === "eventos" ? <option value="desc">Data decrescente</option> : section === "leads" ? <option value="name">Nome</option> : <option value="title">Título</option>}</Select></label><Button type="submit">Filtrar</Button><Link href={`/admin/explorar/${section}`} className="text-link">Limpar</Link></form>;
}
export async function DemoExplorer({ section: raw, params }: { section: string; params: SearchParams }) {
  await requireDemoViewer(); if (!isDemoSection(raw)) notFound(); const section = raw;
  const header = <AdminPageHeader title={titles[section]} eyebrow="EXPLORAÇÃO / DADOS SINTÉTICOS" description="Consulte os registros persistidos da demonstração. Criação, edição, exclusão, publicação e uploads estão indisponíveis para visitantes." />;
  if (isCmsModule(section)) {
    const data = await listContent(section, params, true);
    return <>{header}<ListControls admin params={params} categories={data.categories} technologies={data.technologies} projectMode={section === "portfolio"} articleMode={section === "blog"} /><ReadTable section={section} rows={data.items.map(item => ({ id: item.id, title: item.title, detail: item.category?.name || "Sem categoria", status: item.status === "PUBLISHED" ? "Publicado" : "Não publicado", date: stamp(item.updatedAt) }))} /><Pagination page={data.page} pages={data.pages} params={params} /></>;
  }
  const db = getDb(); let rows: Row[], total: number, page: number;
  if (section === "eventos") {
    const filters = eventFilters(params, true); total = await db.event.count({ where: filters.where }); page = Math.min(filters.page, Math.max(1, Math.ceil(total / 12)));
    rows = (await db.event.findMany({ where: filters.where, orderBy: filters.orderBy, take: 12, skip: (page - 1) * 12, select: { id: true, title: true, mode: true, status: true, startsAt: true, timezone: true, updatedAt: true } })).map(item => ({ id: item.id, title: item.title, detail: `${eventDate(item.startsAt, item.timezone)} · ${eventModes[item.mode]}`, status: eventStatuses[item.status], date: stamp(item.updatedAt) }));
  } else if (section === "leads") {
    const filters = leadFilters(params); total = await db.lead.count({ where: filters.where }); page = Math.min(filters.page, Math.max(1, Math.ceil(total / 12)));
    rows = (await db.lead.findMany({ where: filters.where, orderBy: filters.orderBy, take: 12, skip: (page - 1) * 12, select: { id: true, name: true, company: true, status: true, updatedAt: true } })).map(item => ({ id: item.id, title: item.name, detail: item.company, status: leadStatuses[item.status], date: stamp(item.updatedAt) }));
  } else {
    const filters = jobFilters(params, true); total = await db.job.count({ where: filters.where }); page = Math.min(filters.page, Math.max(1, Math.ceil(total / 12)));
    rows = (await db.job.findMany({ where: filters.where, orderBy: filters.orderBy, take: 12, skip: (page - 1) * 12, select: { id: true, title: true, area: true, status: true, updatedAt: true } })).map(item => ({ id: item.id, title: item.title, detail: item.area, status: jobStatuses[item.status], date: stamp(item.updatedAt) }));
  }
  return <>{header}<Filters section={section} params={params} /><p className="form-hint">{total} registro(s) encontrado(s).</p><ReadTable section={section} rows={rows} /><Pagination page={page} pages={Math.max(1, Math.ceil(total / 12))} params={params} /></>;
}
function Fields({ fields }: { fields: [string, string | null | undefined][] }) { return <div className="demo-read-fields">{fields.filter(([, value]) => value).map(([label, value]) => <section className="card form-section" key={label}><h2>{label}</h2><p>{value}</p></section>)}</div>; }
export async function DemoRecord({ section: raw, id }: { section: string; id: string }) {
  await requireDemoViewer(); if (!isDemoSection(raw) || !idSchema.safeParse(id).success) notFound(); const section = raw, db = getDb();
  const back = <Link href={`/admin/explorar/${section}`} className="text-link">← Voltar à listagem</Link>;
  if (isCmsModule(section)) {
    const item = await db.content.findUnique({ where: { id, kind: cmsModules[section].kind }, include: contentInclude }); if (!item) notFound();
    return <>{back}<AdminPageHeader title={item.title} description={item.summary} eyebrow={`${titles[section].toUpperCase()} / SOMENTE LEITURA`} /><Badge>{item.status === "PUBLISHED" ? "Publicado" : "Rascunho"}</Badge><p className="form-hint">Categoria: {item.category?.name || "Sem categoria"} · Autor sintético: {item.author.name}</p><Fields fields={[["Descrição", item.description], ["Desafio conceitual", item.challenge], ["Solução conceitual", item.solution], ["Resultados identificados como demonstração", item.results], ["Benefícios", item.benefits.join("\n")], ["Tecnologias", item.technologies.map(t => t.name).join(" · ")], ["Marcadores", item.tags.map(t => t.name).join(" · ")]]} /><section className="card form-section"><h2>Conteúdo estruturado</h2><RichContent value={bodyDocument(parseContentBody(item.body))} /></section>{item.status === "PUBLISHED" && item.publishedAt && item.publishedAt <= new Date() && <Link className="button button-secondary" href={`/${section}/${item.slug}`} target="_blank" rel="noopener noreferrer">Ver publicação demonstrativa ↗</Link>}</>;
  }
  if (section === "eventos") {
    const item = await db.event.findUnique({ where: { id }, select: { title: true, summary: true, description: true, startsAt: true, timezone: true, objectives: true, audience: true, location: true, schedule: { orderBy: { startsAt: "asc" }, select: { id: true, startsAt: true, title: true, description: true } } } }); if (!item) notFound();
    return <>{back}<AdminPageHeader title={item.title} description={item.summary} eyebrow="EVENTO FICTÍCIO / SEM INSCRIÇÕES" /><Fields fields={[["Proposta", item.description], ["Data e fuso", `${eventDate(item.startsAt, item.timezone)} · ${item.timezone}`], ["Objetivos", item.objectives], ["Público conceitual", item.audience], ["Local ilustrativo", item.location]]} />{item.schedule.length > 0 && <section className="card form-section"><h2>Programação demonstrativa</h2>{item.schedule.map(entry => <p key={entry.id}><time dateTime={entry.startsAt.toISOString()}>{entry.startsAt.toLocaleTimeString("pt-BR", { timeZone: item.timezone, hour: "2-digit", minute: "2-digit" })}</time> · {entry.title} — {entry.description}</p>)}</section>}<p className="notice">Este evento não acontece de verdade. Não são aceitas inscrições ou divulgados links privados.</p></>;
  }
  if (section === "leads") {
    const item = await db.lead.findUnique({ where: { id }, select: { name: true, email: true, company: true, subject: true, message: true, status: true, priority: true, origin: true, projectType: true } }); if (!item) notFound();
    return <>{back}<AdminPageHeader title={item.subject} description="Contato inteiramente sintético. Nenhuma pessoa enviou esta solicitação." eyebrow="CRM / EXEMPLO PERSISTIDO" /><Fields fields={[["Nome sintético", item.name], ["E-mail reservado", item.email], ["Organização fictícia", item.company], ["Mensagem demonstrativa", item.message], ["Estado", leadStatuses[item.status]], ["Prioridade", item.priority], ["Origem real do registro", item.origin], ["Projeto conceitual", item.projectType]]} /><p className="notice">Acompanhamento somente leitura. Notas, atribuições, exportações e anexos privados não são disponibilizados nesta conta.</p></>;
  }
  const item = await db.job.findUnique({ where: { id }, select: { title: true, summary: true, description: true, responsibilities: true, requirements: true, desirable: true, area: true, mode: true, level: true, status: true } }); if (!item) notFound();
  return <>{back}<AdminPageHeader title={item.title} description={item.summary} eyebrow="OPORTUNIDADE ILUSTRATIVA / SEM CONTRATAÇÃO" /><Fields fields={[["Descrição", item.description], ["Área", item.area], ["Modalidade", item.mode], ["Nível ilustrativo", item.level], ["Responsabilidades conceituais", item.responsibilities], ["Requisitos exemplificativos", item.requirements], ["Diferenciais", item.desirable], ["Estado", jobStatuses[item.status]]]} /><p className="notice">Não há contratação real e não recebemos currículos nesta demonstração.</p></>;
}
