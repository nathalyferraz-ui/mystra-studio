import { getDb } from "@/lib/db";
import { AdminOverview } from "@/components/admin/overview";
import { requireDemoViewer } from "./access";
import { demoNavigation } from "./navigation";
import { statuses } from "@/features/crm/schema";
export async function DemoDashboard() {
  const user = await requireDemoViewer(), db = getDb(), now = new Date();
  const select = { id: true, kind: true, title: true, status: true, updatedAt: true } as const;
  const [groups, recent, drafts, upcoming, categories, archivedArticles, logs, leads] = await Promise.all([
    db.content.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
    db.content.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 6, select }),
    db.content.findMany({ where: { status: "DRAFT" }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 6, select }),
    db.event.count({ where: { status: "PUBLISHED", publishedAt: { lte: now }, startsAt: { gt: now } } }), db.category.count({ where: { kind: "ARTICLE" } }),
    db.content.count({ where: { kind: "ARTICLE", status: "DRAFT", body: { path: ["attrs", "archived"], equals: true } } }),
    db.adminLog.findMany({ where: { action: { in: ["demo.seed", "demo.restore"] } }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, action: true, createdAt: true } }),
    db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return <><AdminOverview readOnly user={{ name: user.name }} now={now} onlyArticles={false} quick={demoNavigation().filter(i => i.id !== "dashboard" && i.id !== "demo-info")} upcoming={upcoming} categories={categories} archivedArticles={archivedArticles} groups={groups} recent={recent} drafts={drafts} logs={logs} /><section className="ma-panel" style={{ marginTop: 24 }}><div className="ma-panel-heading"><h2>CRM demonstrativo</h2><span>{leads.reduce((n, entry) => n + entry._count._all, 0)} registros sintéticos</span></div><div className="ma-panel-body"><dl className="demo-distribution">{Object.entries(statuses).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{leads.find(entry => entry.status === key)?._count._all || 0}</dd></div>)}</dl></div></section></>;
}
