import type { PrismaClient } from "@/generated/prisma/client";
import type { z } from "zod";
import { applicationUpdateSchema, type ApplicationInput, type JobInput } from "./schema";
import { privacyVersion } from "./config";
import { canReadApplications, jobAcceptsApplications } from "./rules";
export async function saveJobRecord(db: PrismaClient, data: JobInput, userId: string) {
  return db.$transaction(async tx => {
    if (data.id) await tx.$queryRaw`SELECT id FROM "Job" WHERE id = ${data.id} FOR UPDATE`;
    const old = data.id ? await tx.job.findUniqueOrThrow({ where: { id: data.id, version: data.version } }) : null;
    const publishedAt = data.status === "PUBLISHED" ? data.publishedAt ? new Date(data.publishedAt) : old?.publishedAt || new Date() : data.status === "CLOSED" ? old?.publishedAt || (data.publishedAt ? new Date(data.publishedAt) : null) : null;
    const fields = { title: data.title, slug: data.slug, summary: data.summary, area: data.area, mode: data.mode, level: data.level, contractType: data.contractType, location: data.location, description: data.description, responsibilities: data.responsibilities, requirements: data.requirements, desirable: data.desirable, benefits: data.benefits, status: data.status, keepClosedPublic: data.keepClosedPublic, publishedAt, deadline: data.deadline ? new Date(data.deadline) : null, closedAt: data.status === "CLOSED" ? old?.closedAt || new Date() : null, seoTitle: data.seoTitle, seoDescription: data.seoDescription };
    if (fields.deadline && publishedAt && fields.deadline <= publishedAt) throw new Error("DEADLINE");
    const item = old ? await tx.job.update({ where: { id: old.id, version: data.version }, data: { ...fields, version: { increment: 1 } } }) : await tx.job.create({ data: fields });
    await tx.jobActivity.create({ data: { jobId: item.id, userId, type: old ? old.status === item.status ? "UPDATE" : "STATUS" : "CREATE", previousStatus: old?.status, nextStatus: item.status } });
    await tx.adminLog.create({ data: { userId, action: old ? "job.update" : "job.create", resource: item.id, metadata: { status: item.status } } }); return item.id;
  });
}
export async function deleteJobRecord(db: PrismaClient, id: string, version: number, title: string, userId: string) {
  return db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "Job" WHERE id = ${id} FOR UPDATE`; const item = await tx.job.findUniqueOrThrow({ where: { id, version } }); if (item.title !== title || await tx.jobApplication.count({ where: { jobId: id } })) throw new Error("HISTORY"); await tx.job.delete({ where: { id, version } }); await tx.adminLog.create({ data: { userId, action: "job.delete", resource: id } }); });
}
export type ResumeRecord = { resumePath: string; resumeName: string; resumeSize: number; resumeHash: string };
export async function submitApplicationRecord(db: PrismaClient, input: ApplicationInput, resume: ResumeRecord, synthetic: boolean, retentionDays: number) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Job" WHERE id = ${input.jobId} FOR UPDATE`;
    const job = await tx.job.findUnique({ where: { id: input.jobId } }); if (!job || !jobAcceptsApplications(job)) return { code: "CLOSED" };
    const existing = await tx.jobApplication.findUnique({ where: { jobId_email: { jobId: input.jobId, email: input.email } }, select: { id: true } }); if (existing) return { code: "EXISTS" };
    const { token: _token, website: _website, privacy: _privacy, ...fields } = input; void _token; void _website; void _privacy;
    await tx.jobApplication.create({ data: { ...fields, ...resume, synthetic, privacyVersion, retentionUntil: new Date(Date.now() + retentionDays * 86400000), activities: { create: { type: "RECEBIDA", nextValue: "RECEBIDA" } } } }); return { code: "RECEIVED" };
  });
}
export async function updateApplicationRecord(db: PrismaClient, data: z.infer<typeof applicationUpdateSchema>, userId: string) {
  return db.$transaction(async tx => {
    const old = await tx.jobApplication.findUniqueOrThrow({ where: { id: data.id, version: data.version, deletingAt: null } });
    if (data.assigneeId) { const user = await tx.user.findUnique({ where: { id: data.assigneeId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } }); if (!user || !canReadApplications(user)) throw new Error("ASSIGNEE"); }
    const changes = [...(old.status !== data.status ? [{ type: "STATUS", previousValue: old.status, nextValue: data.status }] : []), ...(old.assigneeId !== (data.assigneeId || null) ? [{ type: "RESPONSAVEL", previousValue: old.assigneeId, nextValue: data.assigneeId || null }] : []), ...(data.note ? [{ type: "NOTA", previousValue: null, nextValue: null }] : [])];
    if (!changes.length) return;
    await tx.jobApplication.update({ where: { id: old.id, version: data.version }, data: { status: data.status, assigneeId: data.assigneeId || null, version: { increment: 1 }, activities: { create: changes.map(c => ({ ...c, userId })) }, ...(data.note ? { notes: { create: { content: data.note, authorId: userId } } } : {}) } });
    await tx.adminLog.create({ data: { userId, action: "application.update", resource: old.id, metadata: { fields: changes.map(c => c.type) } } });
  });
}
