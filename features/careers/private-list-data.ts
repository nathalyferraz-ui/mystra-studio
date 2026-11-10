import { getDb } from "@/lib/db";
import { applicationFilters } from "./queries";
import type { SearchParams } from "@/features/cms/filters";
export async function applicationListData(params: SearchParams) {
  const db = getDb(), filters = applicationFilters(params);
  const [total, groups] = await Promise.all([db.jobApplication.count({ where: filters.where }), db.jobApplication.groupBy({ by: ["status"], where: filters.where, _count: { _all: true } })]); const pages = Math.max(1, Math.ceil(total / 15)), page = Math.min(pages, filters.page);
  const records = await db.jobApplication.findMany({ where: filters.where, orderBy: filters.orderBy, skip: (page - 1) * 15, take: 15, select: { id: true, name: true, email: true, status: true, createdAt: true, synthetic: true, deletingAt: true, job: { select: { title: true } }, assignee: { select: { name: true } } } });
  return { total, pages, page, groups: groups.map(g => ({ status: g.status, count: g._count._all })), items: records.map(record => ({ ...record, createdAt: record.createdAt.toISOString(), deletingAt: !!record.deletingAt })) };
}
export type ApplicationListData = Awaited<ReturnType<typeof applicationListData>>;
