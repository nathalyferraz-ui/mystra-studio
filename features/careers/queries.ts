import type { Prisma, Job } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { canReadApplications } from "./rules";
import type { SearchParams } from "@/features/cms/filters";
import { jobModes, jobLevels, jobStatuses, applicationStatuses, type JobInput } from "./schema";
export const jobPublicWhere = (): Prisma.JobWhereInput => ({ publishedAt: { lte: new Date() }, OR: [{ status: "PUBLISHED" }, { status: "CLOSED", keepClosedPublic: true }] });
export const jobPublicSelect = { id: true, title: true, slug: true, summary: true, area: true, mode: true, level: true, contractType: true, location: true, description: true, responsibilities: true, requirements: true, desirable: true, benefits: true, status: true, publishedAt: true, deadline: true, closedAt: true, seoTitle: true, seoDescription: true } satisfies Prisma.JobSelect;
export type PublicJob = Prisma.JobGetPayload<{ select: typeof jobPublicSelect }>;
export function jobFilters(params: SearchParams, admin = false) {
  const value = (key: string) => typeof params[key] === "string" ? (params[key] as string).trim().slice(0, 150) : "";
  const now = new Date(), q = value("q"); const where: Prisma.JobWhereInput = {
    ...(admin ? Object.hasOwn(jobStatuses, value("status")) ? { status: value("status") as keyof typeof jobStatuses } : {} : { AND: [jobPublicWhere(), value("state") === "all" ? {} : value("state") === "closed" ? { OR: [{ status: "CLOSED" }, { deadline: { lte: now } }] } : { status: "PUBLISHED", OR: [{ deadline: null }, { deadline: { gt: now } }] }] }),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }] } : {}), ...(value("area") ? { area: value("area") } : {}), ...(Object.hasOwn(jobModes, value("mode")) ? { mode: value("mode") as keyof typeof jobModes } : {}), ...(Object.hasOwn(jobLevels, value("level")) ? { level: value("level") as keyof typeof jobLevels } : {}),
  };
  const orderBy: Prisma.JobOrderByWithRelationInput[] = value("sort") === "title" ? [{ title: "asc" }, { id: "asc" }] : value("sort") === "oldest" ? [{ publishedAt: "asc" }, { id: "asc" }] : [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
  return { where, orderBy, page: Math.max(1, Math.min(100000, parseInt(value("page")) || 1)) };
}
export function applicationFilters(params: SearchParams) {
  const value = (key: string) => typeof params[key] === "string" ? (params[key] as string).trim().slice(0, 150) : "";
  const q = value("q"); const where: Prisma.JobApplicationWhereInput = { ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}), ...(value("job") ? { jobId: value("job") } : {}), ...(Object.hasOwn(applicationStatuses, value("status")) ? { status: value("status") as keyof typeof applicationStatuses } : {}), ...(value("assignee") === "none" ? { assigneeId: null } : value("assignee") ? { assigneeId: value("assignee") } : {}) };
  const orderBy: Prisma.JobApplicationOrderByWithRelationInput[] = value("sort") === "name" ? [{ name: "asc" }, { id: "asc" }] : value("sort") === "oldest" ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }];
  return { where, orderBy, page: Math.max(1, Math.min(100000, parseInt(value("page")) || 1)) };
}
export async function recruitmentUsers() { const users = await getDb().user.findMany({ where: { active: true }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }, orderBy: { name: "asc" } }); return users.filter(canReadApplications).map(({ id, name }) => ({ id, name })); }
export function jobEditData(job: Job): JobInput { return { id: job.id, version: job.version, title: job.title, slug: job.slug, summary: job.summary, area: job.area, mode: job.mode, level: job.level, contractType: job.contractType, location: job.location, description: job.description, responsibilities: job.responsibilities, requirements: job.requirements, desirable: job.desirable, benefits: job.benefits, status: job.status, keepClosedPublic: job.keepClosedPublic, publishedAt: job.publishedAt?.toISOString() || "", deadline: job.deadline?.toISOString() || "", seoTitle: job.seoTitle, seoDescription: job.seoDescription }; }
