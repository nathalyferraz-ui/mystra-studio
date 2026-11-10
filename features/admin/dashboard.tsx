import Link from "next/link";
import { AdminOverview } from "@/components/admin/overview";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { canReadApplications } from "@/features/careers/rules";
import { CareersDashboard } from "@/features/careers/dashboard";
import { CommercialDashboard } from "@/features/crm/dashboard";
import { InstitutionalDashboard } from "@/features/institutional/dashboard";
import { EventsDashboard } from "@/features/events/dashboard";
import type { SearchParams } from "@/features/cms/filters";
import { AdminIcon } from "@/components/admin/icons";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/primitives";
import { permittedQuickActions } from "./navigation";
import { isDemoEnvironment } from "@/lib/environment";
import { DemoDashboard } from "@/features/demo/dashboard";

export async function AdminDashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser(), params = await searchParams;
  if (isDemoEnvironment()) return <DemoDashboard />;
  const editor = hasPermission(user, "content:manage"), commercial = hasPermission(user, "requests:manage"), recruitment = canReadApplications(user);
  const institutional = ["pages:read", "institutional:manage", "settings:manage"].some(p => hasPermission(user, p));
  const requested = params.recrutamento === "1" ? "recruitment" : params.comercial === "1" ? "commercial" : params.visao;
  const views = [
    ...(editor ? [{ id: "overview", label: "Visão geral", href: "/admin", icon: "LayoutDashboard" as const }, { id: "events", label: "Eventos", href: "/admin?visao=events", icon: "CalendarDays" as const }] : []),
    ...(institutional ? [{ id: "institutional", label: "Institucional", href: "/admin?visao=institutional", icon: "PanelsTopLeft" as const }] : []),
    ...(commercial ? [{ id: "commercial", label: "Comercial", href: "/admin?comercial=1", icon: "ContactRound" as const }] : []),
    ...(recruitment ? [{ id: "recruitment", label: "Recrutamento", href: "/admin?recrutamento=1", icon: "UserRoundCheck" as const }] : []),
  ];
  const view = views.find(item => item.id === requested)?.id || views[0]?.id;
  const navigation = <nav className="ma-workspace-views" aria-label="Visões do dashboard">{views.map(item => <Link href={item.href} key={item.id} aria-current={item.id === view ? "page" : undefined}><AdminIcon name={item.icon} size={14} />{item.label}</Link>)}</nav>;
  if (view === "commercial") return <>{navigation}<CommercialDashboard params={params} /></>;
  if (view === "recruitment") return <>{navigation}<CareersDashboard params={params} standalone /></>;
  if (view === "institutional") return <>{navigation}<InstitutionalDashboard standalone /></>;
  if (view === "events") return <>{navigation}<AdminPageHeader title="Eventos & Workshops" description="Programação, inscrições e disponibilidade. Indicadores provenientes do banco." eyebrow="VISÃO DO WORKSPACE" /><EventsDashboard /></>;
  if (!editor) return <>{navigation}<AdminPageHeader title="Seu workspace" description="Navegue pelos módulos autorizados na barra lateral." /><AdminEmptyState title="Tudo começa com o acesso certo.">Esta conta não possui uma visão de indicadores disponível. As permissões continuam sendo verificadas no servidor.</AdminEmptyState></>;

  const db = getDb(), now = new Date(), onlyArticles = params.tipo === "artigos";
  const [groups, recent, drafts, upcoming, categories, archivedArticles, logs] = await Promise.all([
    db.content.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
    db.content.findMany({ where: onlyArticles ? { kind: "ARTICLE" } : {}, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 6, select: { id: true, kind: true, title: true, status: true, updatedAt: true } }),
    db.content.findMany({ where: { status: "DRAFT", ...(onlyArticles ? { kind: "ARTICLE" } : {}) }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 6, select: { id: true, kind: true, title: true, status: true, updatedAt: true } }),
    db.event.count({ where: { status: "PUBLISHED", publishedAt: { lte: now }, startsAt: { gt: now } } }),
    db.category.count({ where: { kind: "ARTICLE" } }),
    db.content.count({ where: { kind: "ARTICLE", status: "DRAFT", body: { path: ["attrs", "archived"], equals: true } } }),
    hasPermission(user, "audit:read") ? db.adminLog.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 6, select: { id: true, action: true, createdAt: true } }) : Promise.resolve(null),
  ]);
  return <>{navigation}<AdminOverview user={{ name: user.name }} now={now} onlyArticles={onlyArticles} quick={permittedQuickActions(user)} upcoming={upcoming} categories={categories} archivedArticles={archivedArticles} groups={groups} recent={recent} drafts={drafts} logs={logs} /></>;
}
