import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { Card, Input, Button, EmptyState } from "@/components/ui";
import { crmDatabaseReady } from "./availability";
import { leadFilters, type Params } from "./queries";
import { statuses } from "./schema";
import "./crm.css";
function Distribution({ title, entries }: { title: string; entries: { label: string; count: number }[] }) {
  const max = Math.max(1, ...entries.map(item => item.count));
  return <Card className="ms-crm-chart"><h2>{title}</h2>{entries.length ? entries.map((item, i) => <div key={`${item.label}-${i}`}><p>{item.label}<strong>{item.count}</strong></p><meter min={0} max={max} value={item.count} aria-label={`${item.label}: ${item.count}`} /></div>) : <p className="muted">Nenhum registro no período.</p>}</Card>;
}
export async function CommercialDashboard({ params = {} }: { params?: Params }) {
  const user = await requireUser(); if (!hasPermission(user, "requests:manage")) return <div role="alert">Acesso comercial restrito.</div>;
  if (!await crmDatabaseReady()) return <EmptyState label={false} title="CRM aguardando ativação.">A migration comercial ainda precisa ser aprovada e aplicada.</EmptyState>;
  const db = getDb(), where = leadFilters({ from: params.from, to: params.to }).where;
  const [groups, services, assignees] = await Promise.all([
    db.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    db.lead.groupBy({ by: ["serviceId"], where, _count: { _all: true }, orderBy: { _count: { serviceId: "desc" } }, take: 12 }),
    db.lead.groupBy({ by: ["assigneeId"], where: { ...where, status: { in: ["NOVO", "EM_ANALISE", "EM_CONTATO", "PROPOSTA_ENVIADA"] } }, _count: { _all: true } }),
  ]);
  const [serviceNames, userNames] = await Promise.all([db.content.findMany({ where: { id: { in: services.flatMap(s => s.serviceId ? [s.serviceId] : []) } }, select: { id: true, title: true } }), db.user.findMany({ where: { id: { in: assignees.flatMap(s => s.assigneeId ? [s.assigneeId] : []) } }, select: { id: true, name: true } })]);
  const range = where.createdAt as Prisma.DateTimeFilter | undefined;
  const monthly = await db.$queryRaw<{ month: string; count: number }[]>(Prisma.sql`SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, count(*)::int AS count FROM "Lead" WHERE TRUE ${range?.gte ? Prisma.sql`AND "createdAt" >= ${range.gte as Date}` : Prisma.empty} ${range?.lt ? Prisma.sql`AND "createdAt" < ${range.lt as Date}` : Prisma.empty} GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
  const count = (status: string) => groups.find(g => g.status === status)?._count._all || 0;
  const total = groups.reduce((n, g) => n + g._count._all, 0);
  const stats = [["Solicitações recebidas", total], ["Novas solicitações", count("NOVO")], ["Em andamento", count("EM_ANALISE") + count("EM_CONTATO") + count("PROPOSTA_ENVIADA")], ["Concluídas", count("CONCLUIDO")]] as const;
  return <section className="ms-crm-dashboard"><div className="admin-page-heading"><div><span className="eyebrow">VISÃO COMERCIAL / DADOS REAIS</span><h1>Conexões em perspectiva.</h1><p>Entradas do período e estágio atual de atendimento. Sem métricas financeiras estimadas.</p></div><Link href="/admin/leads" className="text-link">Acompanhar solicitações ↗</Link></div><form method="get" className="ms-crm-filters"><input type="hidden" name="comercial" value="1" /><label>Recebidas desde (UTC)<Input type="date" name="from" defaultValue={typeof params.from === "string" ? params.from : ""} /></label><label>Até (UTC)<Input type="date" name="to" defaultValue={typeof params.to === "string" ? params.to : ""} /></label><Button type="submit">Aplicar período</Button><Link className="text-link" href="/admin?comercial=1">Todo o período</Link></form><div className="dashboard-grid">{stats.map(([label, value]) => <Card key={label}><p className="stat-label">{label}</p><p className="stat-value">{value}</p></Card>)}</div><div className="ms-crm-charts"><Distribution title="Distribuição por status atual" entries={Object.entries(statuses).map(([status, label]) => ({ label, count: count(status) }))} /><Distribution title="Solicitações por serviço (até 12 grupos)" entries={services.map(s => ({ label: serviceNames.find(n => n.id === s.serviceId)?.title || "Sem serviço associado", count: s._count._all }))} /><Distribution title="Entradas mensais (últimos 12 meses com registros, UTC)" entries={monthly.reverse().map(m => ({ label: m.month, count: m.count }))} /><Distribution title="Carga atual por responsável" entries={assignees.map(s => ({ label: userNames.find(n => n.id === s.assigneeId)?.name || "Não atribuído", count: s._count._all }))} /></div></section>;
}
