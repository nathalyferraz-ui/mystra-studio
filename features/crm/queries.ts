import { getDb } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";
import { statuses, priorities, leadTypes } from "./schema";
export type Params = Record<string, string | string[] | undefined>;
export function leadFilters(params: Params) {
  const value = (key: string) => typeof params[key] === "string" ? (params[key] as string).trim().slice(0, 150) : "";
  const q = value("q"); const start = value("from"), end = value("to");
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  const where: Prisma.LeadWhereInput = {
    ...(q ? { OR: ["name", "email", "company"].map(key => ({ [key]: { contains: q, mode: "insensitive" } })) } : {}),
    ...(Object.hasOwn(statuses, value("status")) ? { status: value("status") as keyof typeof statuses } : {}),
    ...(Object.hasOwn(priorities, value("priority")) ? { priority: value("priority") as keyof typeof priorities } : {}),
    ...(Object.hasOwn(leadTypes, value("type")) ? { type: value("type") as keyof typeof leadTypes } : {}),
    ...(value("assignee") === "none" ? { assigneeId: null } : value("assignee") ? { assigneeId: value("assignee") } : {}),
    ...(validDate(start) || validDate(end) ? { createdAt: { ...(validDate(start) ? { gte: new Date(`${start}T00:00:00Z`) } : {}), ...(validDate(end) ? { lt: new Date(Date.parse(`${end}T00:00:00Z`) + 86400000) } : {}) } } : {}),
  };
  const sort = value("sort");
  const orderBy: Prisma.LeadOrderByWithRelationInput[] = sort === "oldest" ? [{ createdAt: "asc" }, { id: "asc" }] : sort === "name" ? [{ name: "asc" }, { id: "asc" }] : sort === "updated" ? [{ updatedAt: "desc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }];
  return { where, orderBy, page: Math.max(1, Math.min(100000, Number.parseInt(value("page")) || 1)) };
}
export async function commercialUsers() {
  const users = await getDb().user.findMany({ where: { active: true }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }, orderBy: { name: "asc" } });
  return users.filter(user => hasPermission(user, "requests:manage")).map(({ id, name }) => ({ id, name }));
}
