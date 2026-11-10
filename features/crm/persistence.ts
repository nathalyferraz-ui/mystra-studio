import { hasPermission } from "@/lib/permissions";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { digest } from "./security";
import { privacyVersion, type LeadInput } from "./schema";
type Attachment = { storagePath: string; originalName: string; mimeType: string; size: number; contentHash: string };
export { consumeLimit } from "@/lib/rate-limit";
export async function persistLead(db: PrismaClient, input: LeadInput, secret: string, attachment?: Attachment) {
  const { token, privacy: _privacy, website: _website, ...fields } = input;
  void _privacy; void _website;
  const submissionKey = digest(`submission:${token}`, secret);
  const fingerprint = digest(JSON.stringify({ ...fields, attachment: attachment?.contentHash || "" }), secret);
  const storedAttachment = attachment ? { storagePath: attachment.storagePath, originalName: attachment.originalName, mimeType: attachment.mimeType, size: attachment.size } : undefined;
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Serialize identical submissions across all application instances.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${fingerprint}, 0))::text`;
    const previous = await tx.lead.findFirst({ where: { OR: [{ submissionKey }, { fingerprint, createdAt: { gte: new Date(Date.now() - 600000) } }] }, select: { id: true } });
    if (previous) return { duplicate: true };
    if (fields.serviceId) {
      const services = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Content" WHERE id = ${fields.serviceId} AND kind = 'SERVICE' AND status = 'PUBLISHED' AND "publishedAt" <= NOW() FOR SHARE`;
      if (!services.length) throw new Error("SERVICE_UNAVAILABLE");
    }
    await tx.lead.create({ data: { ...fields, serviceId: fields.serviceId || null, origin: fields.type === "ORCAMENTO" ? "PORTAL_ORCAMENTO" : "PORTAL_CONTATO", submissionKey, fingerprint, privacyVersion, activities: { create: { type: "RECEBIDO" } }, ...(storedAttachment ? { attachments: { create: storedAttachment } } : {}) } });
    return { duplicate: false };
  });
}

export async function updateLeadRecord(db: PrismaClient, data: import("zod").infer<typeof import("./schema").updateLeadSchema>, userId: string) {
  return db.$transaction(async tx => {
      const old = await tx.lead.findUniqueOrThrow({ where: { id: data.id, version: data.version } });
      if (data.assigneeId) {
        const assignee = await tx.user.findUnique({ where: { id: data.assigneeId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
        if (!assignee || !hasPermission(assignee, "requests:manage")) throw new Error();
      }
      const changes = [
        ...(old.status !== data.status ? [{ type: "STATUS", fromValue: old.status, toValue: data.status }] : []),
        ...(old.priority !== data.priority ? [{ type: "PRIORIDADE", fromValue: old.priority, toValue: data.priority }] : []),
        ...(old.assigneeId !== (data.assigneeId || null) ? [{ type: "RESPONSAVEL", fromValue: old.assigneeId, toValue: data.assigneeId || null }] : []),
        ...(data.note ? [{ type: "NOTA", fromValue: null, toValue: null }] : []),
      ];
      if (!changes.length) return;
      await tx.lead.update({ where: { id: old.id, version: data.version }, data: { status: data.status, priority: data.priority, assigneeId: data.assigneeId || null, completedAt: data.status === "CONCLUIDO" ? old.completedAt ?? new Date() : null, version: { increment: 1 }, ...(data.note ? { notes: { create: { authorId: userId, content: data.note } } } : {}), activities: { create: changes.map(change => ({ ...change, userId: userId })) } } });
      await tx.adminLog.create({ data: { userId: userId, action: "lead.update", resource: old.id, metadata: { fields: changes.map(c => c.type) } } });
    });
}
