"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { sitemapCacheTag } from "@/lib/site-policy";
import { getDb } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { idSchema } from "@/features/cms/schema";
import { jobSchema, applicationUpdateSchema, type CareerResult } from "./schema";
import { canReadApplications } from "./rules";
import { jobEditData } from "./queries";
import { saveJobRecord, deleteJobRecord, updateApplicationRecord } from "./repository";
import { privateCareerStorage } from "./storage";
import { applicationListData } from "./private-list-data";
const failure = (): CareerResult => ({ ok: false, message: "Operação não confirmada. Confira os campos, o slug, as permissões e a versão atual. Registros históricos não são excluídos ao encerrar ou arquivar." });
function invalidate() { updateTag(sitemapCacheTag); revalidatePath("/", "layout"); }
export async function searchApplications(raw: unknown) {
  const user = await requireUser(); if (!canReadApplications(user)) return { ok: false, message: "Acesso restrito.", data: null };
  const parsed = z.record(z.string().max(40), z.string().max(150)).safeParse(raw); if (!parsed.success) return { ok: false, message: "Filtros inválidos.", data: null };
  try { return { ok: true, message: "", data: await applicationListData(parsed.data) }; } catch { return { ok: false, message: "Não foi possível consultar as candidaturas.", data: null }; }
}
export async function saveJob(raw: unknown): Promise<CareerResult> {
  const user = await requireUser(); if (!hasPermission(user, "content:manage")) return failure(); const parsed = jobSchema.safeParse(raw); if (!parsed.success) return { ok: false, message: "Revise os campos indicados.", errors: parsed.error.flatten().fieldErrors };
  try { const id = await saveJobRecord(getDb(), parsed.data, user.id); invalidate(); return { ok: true, id, message: "Vaga salva no CMS. O modo demonstrativo não é alterado pela publicação." }; } catch { return failure(); }
}
export async function jobOperation(raw: unknown): Promise<CareerResult> {
  const user = await requireUser(); if (!hasPermission(user, "content:manage")) return failure();
  const parsed = z.object({ id: idSchema, version: z.number().int().positive(), operation: z.enum(["delete", "duplicate", "DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]), confirmation: z.string().max(180).optional() }).safeParse(raw); if (!parsed.success) return failure(); const input = parsed.data;
  try {
    if (input.operation === "delete") { await deleteJobRecord(getDb(), input.id, input.version, input.confirmation || "", user.id); invalidate(); return { ok: true, message: "Vaga sem candidaturas excluída." }; }
    const item = await getDb().job.findUniqueOrThrow({ where: { id: input.id, version: input.version } }); const data = jobEditData(item);
    if (input.operation === "duplicate") { delete data.id; delete data.version; data.title = `${data.title.slice(0, 170)} (cópia)`; data.slug = `${data.slug.slice(0, 130)}-copia-${randomUUID().slice(0, 8)}`; data.status = "DRAFT"; data.publishedAt = ""; data.deadline = ""; }
    else data.status = input.operation;
    const validated = jobSchema.safeParse(data); if (!validated.success) return failure(); const id = await saveJobRecord(getDb(), validated.data, user.id); invalidate(); return { ok: true, id, message: input.operation === "duplicate" ? "Rascunho duplicado sem candidaturas." : "Estado da vaga atualizado." };
  } catch { return failure(); }
}
export async function updateApplication(raw: unknown): Promise<CareerResult> {
  const user = await requireUser(); if (!canReadApplications(user)) return failure(); const parsed = applicationUpdateSchema.safeParse(raw); if (!parsed.success) return failure();
  try { await updateApplicationRecord(getDb(), parsed.data, user.id); invalidate(); return { ok: true, message: "Acompanhamento salvo com histórico." }; } catch { return failure(); }
}
export async function purgeApplication(raw: unknown): Promise<CareerResult> {
  const user = await requireUser(); if (!user.roles.some(r => r.role.code === "ADMIN")) return failure();
  const parsed = z.object({ id: idSchema, version: z.number().int().positive(), confirmation: idSchema, reason: z.enum(["TITULAR", "RETENCAO"]), verified: z.literal(true) }).safeParse(raw); if (!parsed.success || parsed.data.id !== parsed.data.confirmation) return failure();
  const session = await getAuth().api.getSession({ headers: await headers() });
  const sessionAge = session ? Date.now() - new Date(session.session.createdAt).getTime() : NaN;
  if (!Number.isFinite(sessionAge) || sessionAge < 0 || sessionAge > 600000) return { ok: false, message: "Para exclusão definitiva, saia e entre novamente. É necessária uma sessão iniciada há menos de dez minutos." };
  const data = parsed.data;
  try {
    const marked = await getDb().$transaction(async tx => { const item = await tx.jobApplication.findUniqueOrThrow({ where: { id: data.id, version: data.version } }); if (data.reason === "RETENCAO" && item.retentionUntil > new Date()) throw new Error(); return tx.jobApplication.update({ where: { id: item.id, version: data.version }, data: { deletingAt: item.deletingAt || new Date(), version: { increment: 1 } }, select: { id: true, version: true, resumePath: true } }); });
    const { error } = await (await privateCareerStorage()).remove([marked.resumePath]); if (error) throw new Error();
    await getDb().$transaction(async tx => { await tx.jobApplication.delete({ where: { id: marked.id, version: marked.version, deletingAt: { not: null } } }); await tx.adminLog.create({ data: { userId: user.id, action: "application.purge", resource: marked.id, metadata: { reason: data.reason } } }); });
    invalidate(); return { ok: true, message: "Candidatura e currículo excluídos do armazenamento ativo. A política operacional deve tratar backups e demais cópias separadamente." };
  } catch { invalidate(); return { ok: false, message: "Exclusão não confirmada. Confira prazo, versão e Storage. Se a revisão foi iniciada, o currículo permanece bloqueado até conclusão; recarregue para repetir com a nova versão." }; }
}
